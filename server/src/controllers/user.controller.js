import User from '../models/User.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';

// ─── GET ALL USERS (Admin) ───────────────────────────────────────────

export const getAllUsers = catchAsync(async (req, res) => {
  const {
    page = 1, limit = 20, role, isActive, isVerified, search, sort = '-createdAt',
  } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    users,
  });
});

// ─── GET SINGLE USER ─────────────────────────────────────────────────

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  let profile = null;
  if (user.role === 'donor') {
    profile = await DonorProfile.findOne({ user: user._id });
  } else if (user.role === 'receiver') {
    profile = await ReceiverProfile.findOne({ user: user._id });
  }

  res.status(200).json({ success: true, user, profile });
});

// ─── UPDATE USER PROFILE ─────────────────────────────────────────────

export const updateProfile = catchAsync(async (req, res, next) => {
  const { name, phone, street, city, state, pincode, bio,
    organization, isNGO, ngoRegistrationNumber, preferredCategories,
    needCategories, website } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Access denied.', 403));
  }

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone;
  if (street !== undefined) user.address = { ...user.address, street };
  if (city !== undefined) user.address = { ...user.address, city };
  if (state !== undefined) user.address = { ...user.address, state };
  if (pincode !== undefined) user.address = { ...user.address, pincode };

  // Handle avatar upload
  if (req.file) {
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'avatars');
    user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
  }

  await user.save({ validateBeforeSave: false });

  // Update role-specific profile
  if (user.role === 'donor' && (bio !== undefined || preferredCategories !== undefined)) {
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (preferredCategories) {
      updateData.preferredCategories = typeof preferredCategories === 'string'
        ? JSON.parse(preferredCategories) : preferredCategories;
    }
    await DonorProfile.findOneAndUpdate({ user: user._id }, updateData, { new: true });
  }

  if (user.role === 'receiver') {
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (organization !== undefined) updateData.organization = organization;
    if (isNGO !== undefined) updateData.isNGO = isNGO === 'true' || isNGO === true;
    if (ngoRegistrationNumber !== undefined) updateData.ngoRegistrationNumber = ngoRegistrationNumber;
    if (needCategories) {
      updateData.needCategories = typeof needCategories === 'string'
        ? JSON.parse(needCategories) : needCategories;
    }
    if (website !== undefined) updateData.website = website;
    if (city !== undefined) updateData['location.city'] = city;
    if (state !== undefined) updateData['location.state'] = state;
    if (pincode !== undefined) updateData['location.pincode'] = pincode;
    await ReceiverProfile.findOneAndUpdate({ user: user._id }, updateData, { new: true });
  }

  const updatedUser = await User.findById(user._id);
  res.status(200).json({ success: true, user: updatedUser });
});

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('All password fields are required.', 400));
  }
  if (newPassword !== confirmPassword) {
    return next(new AppError('New passwords do not match.', 400));
  }
  if (newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters.', 400));
  }

  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(new AppError('Current password is incorrect.', 401));

  user.password = newPassword;
  user.refreshTokens = []; // Invalidate all sessions
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully. Please login again.' });
});

// ─── TOGGLE USER STATUS (Admin) ──────────────────────────────────────

export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (user.role === 'admin') {
    return next(new AppError('Cannot deactivate admin accounts.', 403));
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
    isActive: user.isActive,
  });
});

// ─── DELETE USER (Admin) ─────────────────────────────────────────────

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  if (user.role === 'admin') return next(new AppError('Cannot delete admin accounts.', 403));

  await user.deleteOne();

  res.status(200).json({ success: true, message: 'User deleted successfully.' });
});
