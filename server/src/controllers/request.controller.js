import Request from '../models/Request.js';
import Donation from '../models/Donation.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import AuditLog from '../models/AuditLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { sendNotification } from '../services/socket.service.js';

// ─── GET ALL REQUESTS ────────────────────────────────────────────────

export const getRequests = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, urgencyLevel, sort = '-createdAt' } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (urgencyLevel) filter.urgencyLevel = urgencyLevel;

  // Non-admins see only their requests
  if (req.user.role === 'receiver') {
    filter.receiver = req.user._id;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    Request.find(filter)
      .populate('receiver', 'name avatar email')
      .populate({
        path: 'donation',
        select: 'title category images status condition location donor',
        populate: { path: 'donor', select: 'name avatar' },
      })
      .populate('match')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Request.countDocuments(filter),
  ]);

  const stats = await Request.aggregate([
    { $match: req.user.role === 'receiver' ? { receiver: req.user._id } : {} },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statsMap = stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

  res.status(200).json({
    success: true,
    count: requests.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    requests,
    stats: {
      pending: statsMap.pending || 0,
      approved: statsMap.approved || 0,
      delivered: statsMap.delivered || 0,
      rejected: statsMap.rejected || 0,
    },
  });
});

// ─── GET SINGLE REQUEST ──────────────────────────────────────────────

export const getRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findById(req.params.id)
    .populate('receiver', 'name avatar email phone address')
    .populate({
      path: 'donation',
      populate: { path: 'donor', select: 'name avatar email phone' },
    })
    .populate('match');

  if (!request) return next(new AppError('Request not found.', 404));

  // Authorization
  if (
    req.user.role === 'receiver' &&
    request.receiver._id.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Access denied.', 403));
  }

  res.status(200).json({ success: true, request });
});

// ─── CREATE REQUEST ──────────────────────────────────────────────────

export const createRequest = catchAsync(async (req, res, next) => {
  const {
    donationId, message, urgencyLevel = 'medium',
    quantityRequested = 1, purposeDescription, beneficiaryCount = 0,
  } = req.body;

  // Verify donation exists and is available
  const donation = await Donation.findById(donationId).populate('donor', 'name _id');
  if (!donation) return next(new AppError('Donation not found.', 404));
  if (donation.status !== 'approved') {
    return next(new AppError('This donation is not available for requests.', 400));
  }
  if (donation.isExpired) {
    return next(new AppError('This donation has expired.', 400));
  }
  if (donation.donor._id.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot request your own donation.', 400));
  }

  // Check for existing active request
  const existing = await Request.findOne({
    receiver: req.user._id,
    donation: donationId,
    status: { $nin: ['cancelled', 'rejected'] },
  });
  if (existing) {
    return next(new AppError('You already have an active request for this donation.', 409));
  }

  const request = await Request.create({
    receiver: req.user._id,
    donation: donationId,
    message,
    urgencyLevel,
    quantityRequested: Math.min(parseInt(quantityRequested), donation.quantity.value),
    purposeDescription,
    beneficiaryCount: parseInt(beneficiaryCount),
  });

  // Update donation request count
  await Donation.findByIdAndUpdate(donationId, { $inc: { requestCount: 1 } });

  // Update receiver profile
  await ReceiverProfile.findOneAndUpdate(
    { user: req.user._id },
    { $inc: { totalRequests: 1 } }
  );

  // Notify donor
  await sendNotification({
    recipientId: donation.donor._id,
    type: 'request_submitted',
    title: 'New Request for Your Donation',
    message: `${req.user.name} has requested your donation: "${donation.title}"`,
    data: { requestId: request._id, donationId },
    actionUrl: `/donor/donations/${donationId}`,
    priority: 'normal',
  });

  // Notify admins
  const User = (await import('../models/User.js')).default;
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(
    admins.map((admin) =>
      sendNotification({
        recipientId: admin._id,
        type: 'request_submitted',
        title: 'New Request Pending Review',
        message: `New request from ${req.user.name} for "${donation.title}"`,
        data: { requestId: request._id },
        actionUrl: `/admin/requests/pending`,
      })
    )
  );

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'request_created',
    targetModel: 'Request',
    targetId: request._id,
  });

  res.status(201).json({
    success: true,
    message: 'Request submitted successfully. You will be notified when it is reviewed.',
    request,
  });
});

// ─── CANCEL REQUEST ──────────────────────────────────────────────────

export const cancelRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findById(req.params.id);

  if (!request) return next(new AppError('Request not found.', 404));
  if (request.receiver.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized.', 403));
  }
  if (['delivered', 'matched'].includes(request.status)) {
    return next(new AppError('Cannot cancel a matched or delivered request.', 400));
  }

  request.status = 'cancelled';
  await request.save();

  await Donation.findByIdAndUpdate(request.donation, { $inc: { requestCount: -1 } });

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'request_cancelled',
    targetModel: 'Request',
    targetId: request._id,
  });

  res.status(200).json({ success: true, message: 'Request cancelled.' });
});

// ─── CONFIRM DELIVERY ────────────────────────────────────────────────

export const confirmDelivery = catchAsync(async (req, res, next) => {
  const request = await Request.findById(req.params.id)
    .populate('donation', 'donor title');

  if (!request) return next(new AppError('Request not found.', 404));

  const isReceiver = request.receiver.toString() === req.user._id.toString();
  const isDonor = request.donation?.donor?.toString() === req.user._id.toString();

  if (!isReceiver && !isDonor) {
    return next(new AppError('Not authorized.', 403));
  }

  if (isReceiver) request.deliveryConfirmedByReceiver = true;
  if (isDonor) request.deliveryConfirmedByDonor = true;

  // Both confirmed = mark delivered
  if (request.deliveryConfirmedByReceiver && request.deliveryConfirmedByDonor) {
    request.status = 'delivered';
    request.deliveredAt = new Date();

    await ReceiverProfile.findOneAndUpdate(
      { user: request.receiver },
      { $inc: { totalReceived: 1 } }
    );

    // Notify both parties
    await sendNotification({
      recipientId: request.receiver,
      type: 'item_delivered',
      title: 'Delivery Confirmed! 🎉',
      message: `"${request.donation.title}" has been marked as delivered. Please leave feedback!`,
      data: { requestId: request._id },
      actionUrl: `/receiver/requests/${request._id}`,
    });
  }

  await request.save();

  res.status(200).json({
    success: true,
    message: 'Delivery confirmation recorded.',
    fullyDelivered: request.status === 'delivered',
  });
});
