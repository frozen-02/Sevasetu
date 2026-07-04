import Donation from '../models/Donation.js';
import DonorProfile from '../models/DonorProfile.js';
import Request from '../models/Request.js';
import AuditLog from '../models/AuditLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { uploadMultipleToCloudinary, deleteFromCloudinary, deleteMultipleFromCloudinary } from '../services/cloudinary.service.js';
import { sendNotification } from '../services/socket.service.js';
import { detectDuplicate } from '../services/ai.service.js';
import User from '../models/User.js';

// ─── GET ALL DONATIONS (public / filtered) ──────────────────────────

export const getDonations = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    condition,
    state,
    city,
    status = 'approved',
    search,
    sort = '-createdAt',
    pickupAvailable,
    minDate,
    maxDate,
  } = req.query;

  const filter = {};

  // Only admins can see non-approved donations without specifying status
  if (req.user?.role !== 'admin') {
    filter.status = 'approved';
  } else if (status) {
    filter.status = status;
  }

  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (state) filter['location.state'] = new RegExp(state, 'i');
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (pickupAvailable !== undefined) filter.pickupAvailable = pickupAvailable === 'true';
  if (minDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(minDate) };
  if (maxDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(maxDate) };

  if (search) {
    filter.$text = { $search: search };
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [donations, total] = await Promise.all([
    Donation.find(filter)
      .populate('donor', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Donation.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: donations.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    donations,
  });
});

// ─── GET SINGLE DONATION ────────────────────────────────────────────

export const getDonation = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id)
    .populate('donor', 'name avatar email phone')
    .populate('approvedBy', 'name');

  if (!donation) {
    return next(new AppError('Donation not found.', 404));
  }

  // Increment view count
  await Donation.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

  res.status(200).json({ success: true, donation });
});

// ─── GET MY DONATIONS (donor) ────────────────────────────────────────

export const getMyDonations = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    sort = '-createdAt',
  } = req.query;

  const filter = { donor: req.user._id };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [donations, total] = await Promise.all([
    Donation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Donation.countDocuments(filter),
  ]);

  // Get stats
  const stats = await Donation.aggregate([
    { $match: { donor: req.user._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap = stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

  res.status(200).json({
    success: true,
    count: donations.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    donations,
    stats: {
      total: total,
      pending: statsMap.pending || 0,
      approved: statsMap.approved || 0,
      delivered: statsMap.delivered || 0,
      rejected: statsMap.rejected || 0,
    },
  });
});

// ─── CREATE DONATION ─────────────────────────────────────────────────

export const createDonation = catchAsync(async (req, res, next) => {
  const {
    title, category, subcategory, description,
    quantityValue, quantityUnit, condition,
    locationAddress, locationCity, locationState,
    locationPincode, pickupAvailable, pickupInstructions,
    expiryDate, tags,
  } = req.body;

  // Duplicate detection
  const dupCheck = await detectDuplicate(title, description, req.user._id);
  if (dupCheck.isDuplicate) {
    return next(
      new AppError(
        `This donation appears to be a duplicate (${Math.round(dupCheck.similarity * 100)}% similarity). Please edit your existing donation instead.`,
        409
      )
    );
  }

  // Upload images to Cloudinary
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploaded = await uploadMultipleToCloudinary(req.files, 'donations');
    images = uploaded.map((img, idx) => ({
      url: img.url,
      publicId: img.publicId,
      isPrimary: idx === 0,
    }));
  }

  const parsedTags = typeof tags === 'string'
    ? tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : Array.isArray(tags) ? tags : [];

  const donation = await Donation.create({
    donor: req.user._id,
    title: title.trim(),
    category,
    subcategory,
    description: description.trim(),
    quantity: {
      value: parseInt(quantityValue) || 1,
      unit: quantityUnit || 'pieces',
    },
    condition,
    images,
    location: {
      address: locationAddress,
      city: locationCity,
      state: locationState,
      pincode: locationPincode,
    },
    pickupAvailable: pickupAvailable === 'true' || pickupAvailable === true,
    pickupInstructions,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    tags: parsedTags,
    status: 'pending',
  });

  // Update donor profile stats
  await DonorProfile.findOneAndUpdate(
    { user: req.user._id },
    { $inc: { totalDonations: 1, totalPending: 1 } }
  );

  // Notify admins
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(
    admins.map((admin) =>
      sendNotification({
        recipientId: admin._id,
        type: 'new_donation',
        title: 'New Donation Submitted',
        message: `${req.user.name} submitted a new donation: "${title}"`,
        data: { donationId: donation._id },
        actionUrl: `/admin/donations/pending`,
        priority: 'normal',
      })
    )
  );

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'donation_created',
    targetModel: 'Donation',
    targetId: donation._id,
    target: title,
  });

  res.status(201).json({
    success: true,
    message: 'Donation submitted successfully. It will be reviewed by our team.',
    donation,
  });
});

// ─── UPDATE DONATION ─────────────────────────────────────────────────

export const updateDonation = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) return next(new AppError('Donation not found.', 404));

  // Only donor or admin can update
  if (
    donation.donor.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to edit this donation.', 403));
  }

  // Donors can only edit pending/rejected donations
  if (
    req.user.role === 'donor' &&
    !['pending', 'rejected', 'draft'].includes(donation.status)
  ) {
    return next(
      new AppError('You can only edit donations that are pending or rejected.', 400)
    );
  }

  const {
    title, category, subcategory, description,
    quantityValue, quantityUnit, condition,
    locationAddress, locationCity, locationState, locationPincode,
    pickupAvailable, pickupInstructions, expiryDate, tags,
    removeImages, // comma-separated publicIds to remove
  } = req.body;

  // Handle image removal
  if (removeImages) {
    const toRemove = removeImages.split(',').map((s) => s.trim());
    await deleteMultipleFromCloudinary(toRemove);
    donation.images = donation.images.filter((img) => !toRemove.includes(img.publicId));
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    if (donation.images.length + req.files.length > 5) {
      return next(new AppError('Maximum 5 images allowed per donation.', 400));
    }
    const uploaded = await uploadMultipleToCloudinary(req.files, 'donations');
    const newImages = uploaded.map((img) => ({
      url: img.url,
      publicId: img.publicId,
      isPrimary: false,
    }));
    donation.images.push(...newImages);
    if (!donation.images.some((img) => img.isPrimary) && donation.images.length > 0) {
      donation.images[0].isPrimary = true;
    }
  }

  // Update fields
  if (title) donation.title = title.trim();
  if (category) donation.category = category;
  if (subcategory !== undefined) donation.subcategory = subcategory;
  if (description) donation.description = description.trim();
  if (quantityValue) donation.quantity.value = parseInt(quantityValue);
  if (quantityUnit) donation.quantity.unit = quantityUnit;
  if (condition) donation.condition = condition;
  if (locationAddress !== undefined) donation.location.address = locationAddress;
  if (locationCity) donation.location.city = locationCity;
  if (locationState) donation.location.state = locationState;
  if (locationPincode !== undefined) donation.location.pincode = locationPincode;
  if (pickupAvailable !== undefined) donation.pickupAvailable = pickupAvailable === 'true' || pickupAvailable === true;
  if (pickupInstructions !== undefined) donation.pickupInstructions = pickupInstructions;
  if (expiryDate) donation.expiryDate = new Date(expiryDate);
  if (tags) {
    donation.tags = typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : tags;
  }

  // Re-submit for approval if donor edits
  if (req.user.role === 'donor' && donation.status === 'rejected') {
    donation.status = 'pending';
    donation.rejectionReason = undefined;
  }

  await donation.save();

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'donation_updated',
    targetModel: 'Donation',
    targetId: donation._id,
    target: donation.title,
  });

  res.status(200).json({ success: true, donation });
});

// ─── DELETE DONATION ─────────────────────────────────────────────────

export const deleteDonation = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) return next(new AppError('Donation not found.', 404));

  if (
    donation.donor.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('Not authorized to delete this donation.', 403));
  }

  if (['matched', 'delivered'].includes(donation.status)) {
    return next(new AppError('Cannot delete a matched or delivered donation.', 400));
  }

  // Delete images from Cloudinary
  if (donation.images.length > 0) {
    await deleteMultipleFromCloudinary(donation.images.map((img) => img.publicId));
  }

  await DonorProfile.findOneAndUpdate(
    { user: donation.donor },
    { $inc: { totalDonations: -1 } }
  );

  await donation.deleteOne();

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'donation_deleted',
    targetModel: 'Donation',
    target: donation.title,
  });

  res.status(200).json({ success: true, message: 'Donation deleted successfully.' });
});
