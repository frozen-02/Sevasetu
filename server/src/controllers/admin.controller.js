import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Request from '../models/Request.js';
import Match from '../models/Match.js';
import Feedback from '../models/Feedback.js';
import AuditLog from '../models/AuditLog.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { sendNotification } from '../services/socket.service.js';
import { sendDonationApprovedEmail } from '../services/email.service.js';

// ─── ADMIN DASHBOARD OVERVIEW ────────────────────────────────────────

export const getDashboardOverview = catchAsync(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalDonors,
    totalReceivers,
    totalDonations,
    pendingDonations,
    approvedDonations,
    deliveredDonations,
    totalRequests,
    pendingRequests,
    totalMatches,
    deliveredMatches,
    totalFeedback,
    recentUsers,
    recentDonations,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'receiver' }),
    Donation.countDocuments(),
    Donation.countDocuments({ status: 'pending' }),
    Donation.countDocuments({ status: 'approved' }),
    Donation.countDocuments({ status: 'delivered' }),
    Request.countDocuments(),
    Request.countDocuments({ status: 'pending' }),
    Match.countDocuments(),
    Match.countDocuments({ status: 'delivered' }),
    Feedback.countDocuments({ isHidden: false }),
    User.find().sort('-createdAt').limit(5).select('name email role avatar createdAt isVerified'),
    Donation.find().sort('-createdAt').limit(5)
      .populate('donor', 'name avatar')
      .select('title category status createdAt'),
  ]);

  const successRate = totalDonations > 0
    ? Math.round((deliveredDonations / totalDonations) * 100)
    : 0;

  res.status(200).json({
    success: true,
    stats: {
      users: { total: totalUsers, active: activeUsers, donors: totalDonors, receivers: totalReceivers },
      donations: { total: totalDonations, pending: pendingDonations, approved: approvedDonations, delivered: deliveredDonations },
      requests: { total: totalRequests, pending: pendingRequests },
      matches: { total: totalMatches, delivered: deliveredMatches },
      feedback: { total: totalFeedback },
      successRate,
    },
    recentUsers,
    recentDonations,
  });
});

// ─── APPROVE DONATION ────────────────────────────────────────────────

export const approveDonation = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id).populate('donor', 'name email _id');
  if (!donation) return next(new AppError('Donation not found.', 404));
  if (donation.status !== 'pending') {
    return next(new AppError('Only pending donations can be approved.', 400));
  }

  donation.status = 'approved';
  donation.approvedBy = req.user._id;
  donation.approvedAt = new Date();
  await donation.save();

  // Notify donor
  await sendNotification({
    recipientId: donation.donor._id,
    type: 'donation_approved',
    title: '✅ Donation Approved!',
    message: `Your donation "${donation.title}" has been approved and is now live.`,
    data: { donationId: donation._id },
    actionUrl: `/donor/donations/${donation._id}`,
    priority: 'high',
  });

  // Send email (non-blocking)
  sendDonationApprovedEmail(donation.donor, donation).catch(console.error);

  await DonorProfile.findOneAndUpdate(
    { user: donation.donor._id },
    { $inc: { totalApproved: 1, totalPending: -1 } }
  );

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'donation_approved',
    targetModel: 'Donation',
    targetId: donation._id,
    target: donation.title,
  });

  res.status(200).json({ success: true, message: 'Donation approved.', donation });
});

// ─── REJECT DONATION ─────────────────────────────────────────────────

export const rejectDonation = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new AppError('Rejection reason is required.', 400));

  const donation = await Donation.findById(req.params.id).populate('donor', '_id name');
  if (!donation) return next(new AppError('Donation not found.', 404));
  if (donation.status !== 'pending') {
    return next(new AppError('Only pending donations can be rejected.', 400));
  }

  donation.status = 'rejected';
  donation.rejectionReason = reason;
  await donation.save();

  await sendNotification({
    recipientId: donation.donor._id,
    type: 'donation_rejected',
    title: '❌ Donation Rejected',
    message: `Your donation "${donation.title}" was rejected. Reason: ${reason}`,
    data: { donationId: donation._id },
    actionUrl: `/donor/donations/${donation._id}/edit`,
    priority: 'high',
  });

  await DonorProfile.findOneAndUpdate(
    { user: donation.donor._id },
    { $inc: { totalPending: -1 } }
  );

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'donation_rejected',
    targetModel: 'Donation',
    targetId: donation._id,
    details: { reason },
  });

  res.status(200).json({ success: true, message: 'Donation rejected.' });
});

// ─── APPROVE REQUEST ─────────────────────────────────────────────────

export const approveRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findById(req.params.id)
    .populate('receiver', '_id name')
    .populate('donation', 'title');

  if (!request) return next(new AppError('Request not found.', 404));
  if (request.status !== 'pending') {
    return next(new AppError('Only pending requests can be approved.', 400));
  }

  request.status = 'approved';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  await request.save();

  await sendNotification({
    recipientId: request.receiver._id,
    type: 'request_approved',
    title: '✅ Request Approved!',
    message: `Your request for "${request.donation.title}" has been approved!`,
    data: { requestId: request._id },
    actionUrl: `/receiver/requests/${request._id}`,
    priority: 'high',
  });

  await ReceiverProfile.findOneAndUpdate(
    { user: request.receiver._id },
    { $inc: { totalApprovedRequests: 1 } }
  );

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'request_approved',
    targetModel: 'Request',
    targetId: request._id,
  });

  res.status(200).json({ success: true, message: 'Request approved.', request });
});

// ─── REJECT REQUEST ──────────────────────────────────────────────────

export const rejectRequest = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new AppError('Rejection reason is required.', 400));

  const request = await Request.findById(req.params.id)
    .populate('receiver', '_id')
    .populate('donation', 'title');

  if (!request) return next(new AppError('Request not found.', 404));
  if (request.status !== 'pending') {
    return next(new AppError('Only pending requests can be rejected.', 400));
  }

  request.status = 'rejected';
  request.rejectionReason = reason;
  await request.save();

  await sendNotification({
    recipientId: request.receiver._id,
    type: 'request_rejected',
    title: '❌ Request Rejected',
    message: `Your request for "${request.donation.title}" was rejected. Reason: ${reason}`,
    data: { requestId: request._id },
    actionUrl: `/receiver/requests`,
    priority: 'high',
  });

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'request_rejected',
    targetModel: 'Request',
    targetId: request._id,
    details: { reason },
  });

  res.status(200).json({ success: true, message: 'Request rejected.' });
});

// ─── GET AUDIT LOGS ──────────────────────────────────────────────────

export const getAuditLogs = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, action, actorId, targetModel, sort = '-createdAt' } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (actorId) filter.actor = actorId;
  if (targetModel) filter.targetModel = targetModel;

  const pageNum = parseInt(page);
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    logs,
  });
});
