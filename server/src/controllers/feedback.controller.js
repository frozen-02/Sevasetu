import Feedback from '../models/Feedback.js';
import Match from '../models/Match.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { analyzeSentiment, detectToxicity } from '../services/ai.service.js';
import { sendNotification } from '../services/socket.service.js';
import AuditLog from '../models/AuditLog.js';

// ─── GET FEEDBACK ────────────────────────────────────────────────────

export const getFeedback = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, userId, matchId, sort = '-createdAt' } = req.query;

  const filter = { isHidden: false };
  if (userId) filter.to = userId;
  if (matchId) filter.match = matchId;

  // Admins can see hidden feedback
  if (req.user?.role === 'admin') delete filter.isHidden;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [feedbacks, total] = await Promise.all([
    Feedback.find(filter)
      .populate('from', 'name avatar role')
      .populate('to', 'name avatar role')
      .populate('match', 'score')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    feedbacks,
  });
});

// ─── GET MY RECEIVED FEEDBACK ────────────────────────────────────────

export const getMyFeedback = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [feedbacks, total] = await Promise.all([
    Feedback.find({ to: req.user._id, isHidden: false })
      .populate('from', 'name avatar role')
      .populate('match', 'score')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Feedback.countDocuments({ to: req.user._id, isHidden: false }),
  ]);

  // Calculate average rating
  const avgResult = await Feedback.aggregate([
    { $match: { to: req.user._id, isHidden: false } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = avgResult[0]?.avg || 0;

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    feedbacks,
    averageRating: Math.round(avgRating * 10) / 10,
  });
});

// ─── CREATE FEEDBACK ─────────────────────────────────────────────────

export const createFeedback = catchAsync(async (req, res, next) => {
  const { matchId, rating, comment } = req.body;

  // Verify match exists and user is part of it
  const match = await Match.findById(matchId)
    .populate('donor', '_id name')
    .populate('receiver', '_id name');

  if (!match) return next(new AppError('Match not found.', 404));

  if (match.status !== 'delivered') {
    return next(new AppError('Feedback can only be submitted after delivery.', 400));
  }

  const isDonor = match.donor._id.toString() === req.user._id.toString();
  const isReceiver = match.receiver._id.toString() === req.user._id.toString();

  if (!isDonor && !isReceiver) {
    return next(new AppError('You are not part of this match.', 403));
  }

  // Check if already submitted
  const existing = await Feedback.findOne({ from: req.user._id, match: matchId });
  if (existing) {
    return next(new AppError('You have already submitted feedback for this match.', 409));
  }

  const recipient = isDonor ? match.receiver._id : match.donor._id;
  const fromRole = isDonor ? 'donor' : 'receiver';

  // AI Analysis
  const sentiment = analyzeSentiment(comment);
  const toxicity = detectToxicity(comment);

  if (toxicity.isToxic && toxicity.score > 0.7) {
    return next(
      new AppError(
        'Your feedback contains inappropriate content. Please revise your comment.',
        400
      )
    );
  }

  const feedback = await Feedback.create({
    from: req.user._id,
    to: recipient,
    match: matchId,
    donation: match.donation,
    rating: parseInt(rating),
    comment,
    fromRole,
    sentimentScore: sentiment.score,
    sentimentLabel: sentiment.label,
    isToxic: toxicity.isToxic,
    toxicityScore: toxicity.score,
    toxicCategories: toxicity.categories,
    isHidden: toxicity.isToxic,
  });

  // Update rating in profiles
  const updateRating = async (userId, role) => {
    const Model = role === 'donor' ? DonorProfile : ReceiverProfile;
    const allFeedback = await Feedback.find({ to: userId, isHidden: false });
    const avg = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
    await Model.findOneAndUpdate(
      { user: userId },
      { 'rating.average': Math.round(avg * 10) / 10, 'rating.count': allFeedback.length }
    );
  };

  const recipientRole = isDonor ? 'receiver' : 'donor';
  await updateRating(recipient, recipientRole);

  // Notify recipient
  await sendNotification({
    recipientId: recipient,
    type: 'feedback_received',
    title: 'New Feedback Received ⭐',
    message: `${req.user.name} left you a ${rating}-star review.`,
    data: { feedbackId: feedback._id, rating },
    actionUrl: `/${recipientRole}/feedback`,
  });

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'feedback_created',
    targetModel: 'Feedback',
    targetId: feedback._id,
  });

  res.status(201).json({
    success: true,
    message: toxicity.isToxic
      ? 'Feedback submitted but is under review due to content policy.'
      : 'Feedback submitted successfully. Thank you!',
    feedback,
  });
});

// ─── HIDE FEEDBACK (Admin) ───────────────────────────────────────────

export const hideFeedback = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  feedback.isHidden = true;
  feedback.hiddenReason = reason || 'Removed by admin';
  await feedback.save();

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'feedback_hidden',
    targetModel: 'Feedback',
    targetId: feedback._id,
  });

  res.status(200).json({ success: true, message: 'Feedback hidden.' });
});

// ─── UPDATE FEEDBACK (receiver / donor can edit their own) ────────────

export const updateFeedback = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  if (feedback.from.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own feedback.', 403));
  }

  if (rating !== undefined) feedback.rating = parseInt(rating);
  if (comment !== undefined) {
    const sentiment = analyzeSentiment(comment);
    const toxicity = detectToxicity(comment);
    feedback.comment = comment;
    feedback.sentimentScore = sentiment.score;
    feedback.sentimentLabel = sentiment.label;
    feedback.isToxic = toxicity.isToxic;
    feedback.toxicityScore = toxicity.score;
    feedback.isHidden = toxicity.isToxic;
  }

  await feedback.save();

  res.status(200).json({ success: true, message: 'Feedback updated.', feedback });
});
