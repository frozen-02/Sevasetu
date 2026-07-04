import Match from '../models/Match.js';
import Request from '../models/Request.js';
import Donation from '../models/Donation.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import AuditLog from '../models/AuditLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { calculateMatchScore, findTopReceiversForDonation } from '../services/matching.service.js';
import { sendNotification } from '../services/socket.service.js';
import { sendMatchFoundEmail } from '../services/email.service.js';
import User from '../models/User.js';

// ─── GET MATCHES ─────────────────────────────────────────────────────

export const getMatches = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (req.user.role === 'donor') filter.donor = req.user._id;
  if (req.user.role === 'receiver') filter.receiver = req.user._id;

  const pageNum = parseInt(page);
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate('donor', 'name avatar email')
      .populate('receiver', 'name avatar email')
      .populate('donation', 'title category images condition location')
      .populate('request', 'message urgencyLevel')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Match.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: matches.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    matches,
  });
});

// ─── CREATE MATCH (Admin) ────────────────────────────────────────────

export const createMatch = catchAsync(async (req, res, next) => {
  const { requestId } = req.body;

  const request = await Request.findById(requestId)
    .populate('receiver', '_id name email')
    .populate({
      path: 'donation',
      populate: { path: 'donor', select: '_id name email' },
    });

  if (!request) return next(new AppError('Request not found.', 404));
  if (request.status !== 'approved') {
    return next(new AppError('Request must be approved before matching.', 400));
  }

  const donation = request.donation;
  const receiverProfile = await ReceiverProfile.findOne({ user: request.receiver._id });

  const { score, scoreBreakdown } = calculateMatchScore(donation, request, receiverProfile);

  // Check for existing match
  const existingMatch = await Match.findOne({
    donation: donation._id,
    request: request._id,
  });
  if (existingMatch) {
    return next(new AppError('A match already exists for this request.', 409));
  }

  const match = await Match.create({
    donation: donation._id,
    request: request._id,
    donor: donation.donor._id,
    receiver: request.receiver._id,
    score,
    scoreBreakdown,
    matchedBy: 'admin',
    matchedByAdmin: req.user._id,
    status: 'accepted',
  });

  // Update donation and request statuses
  await Promise.all([
    Donation.findByIdAndUpdate(donation._id, { status: 'matched' }),
    Request.findByIdAndUpdate(request._id, { status: 'matched', match: match._id }),
  ]);

  // Update donor stats
  await DonorProfile.findOneAndUpdate(
    { user: donation.donor._id },
    { $inc: { totalApproved: 1, totalPending: -1 } }
  );

  const donor = await User.findById(donation.donor._id);
  const receiver = request.receiver;

  // Send notifications + emails
  await Promise.all([
    sendNotification({
      recipientId: donation.donor._id,
      type: 'match_found',
      title: '🎯 Match Found!',
      message: `Your donation "${donation.title}" has been matched with ${receiver.name}`,
      data: { matchId: match._id },
      actionUrl: `/donor/donations`,
      priority: 'high',
    }),
    sendNotification({
      recipientId: request.receiver._id,
      type: 'match_accepted',
      title: '🎉 Your Request Was Matched!',
      message: `Your request for "${donation.title}" has been matched!`,
      data: { matchId: match._id },
      actionUrl: `/receiver/requests`,
      priority: 'high',
    }),
  ]);

  // Send emails (non-blocking)
  sendMatchFoundEmail(donor, receiver, donation, match).catch(console.error);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'match_created',
    targetModel: 'Match',
    targetId: match._id,
    details: { score, donationId: donation._id, requestId },
  });

  res.status(201).json({
    success: true,
    message: 'Match created successfully.',
    match,
  });
});

// ─── GET SUGGESTED MATCHES FOR A DONATION ────────────────────────────

export const getSuggestedMatches = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.donationId);
  if (!donation) return next(new AppError('Donation not found.', 404));

  const suggestions = await findTopReceiversForDonation(donation, 5);

  res.status(200).json({
    success: true,
    count: suggestions.length,
    suggestions,
  });
});

// ─── UPDATE MATCH STATUS ─────────────────────────────────────────────

export const updateMatchStatus = catchAsync(async (req, res, next) => {
  const { status, cancelReason } = req.body;
  const match = await Match.findById(req.params.id)
    .populate('donor receiver donation');

  if (!match) return next(new AppError('Match not found.', 404));

  const allowedTransitions = {
    suggested: ['accepted', 'rejected'],
    accepted: ['delivered', 'cancelled'],
    rejected: [],
    delivered: [],
    cancelled: [],
  };

  if (!allowedTransitions[match.status]?.includes(status)) {
    return next(new AppError(`Cannot transition from "${match.status}" to "${status}".`, 400));
  }

  match.status = status;
  if (status === 'delivered') {
    match.deliveredAt = new Date();

    // Update profiles
    await Promise.all([
      DonorProfile.findOneAndUpdate(
        { user: match.donor._id },
        { $inc: { totalDelivered: 1 } }
      ),
      ReceiverProfile.findOneAndUpdate(
        { user: match.receiver._id },
        { $inc: { totalReceived: 1 } }
      ),
      Donation.findByIdAndUpdate(match.donation._id, { status: 'delivered' }),
      Request.findByIdAndUpdate(match.request, { status: 'delivered', deliveredAt: new Date() }),
    ]);
  }

  if (status === 'cancelled') {
    match.cancelledAt = new Date();
    match.cancelReason = cancelReason;
    await Donation.findByIdAndUpdate(match.donation._id, { status: 'approved' });
    await Request.findByIdAndUpdate(match.request, { status: 'approved' });
  }

  await match.save();

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: status === 'delivered' ? 'item_delivered' : 'match_rejected',
    targetModel: 'Match',
    targetId: match._id,
  });

  res.status(200).json({ success: true, match });
});
