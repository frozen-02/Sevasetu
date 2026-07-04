import Donation from '../models/Donation.js';
import Request from '../models/Request.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { catchAsync } from '../utils/catchAsync.js';
import { predictCategoryDemand } from '../services/ai.service.js';

const CATEGORIES = ['Education', 'Clothing', 'Electronics', 'Food', 'Medical', 'Furniture', 'Books', 'Sports', 'Others'];

// ─── OVERVIEW STATS ──────────────────────────────────────────────────

export const getOverview = catchAsync(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalDonations, newDonations, prevDonations,
    totalRequests, newRequests, prevRequests,
    totalUsers, newUsers,
    totalMatches, newMatches,
    successRate,
  ] = await Promise.all([
    Donation.countDocuments(),
    Donation.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Donation.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    Request.countDocuments(),
    Request.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Request.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Match.countDocuments({ status: 'delivered' }),
    Match.countDocuments({ status: 'delivered', createdAt: { $gte: thirtyDaysAgo } }),
    (async () => {
      const total = await Donation.countDocuments();
      const delivered = await Donation.countDocuments({ status: 'delivered' });
      return total > 0 ? Math.round((delivered / total) * 100) : 0;
    })(),
  ]);

  res.status(200).json({
    success: true,
    overview: {
      donations: {
        total: totalDonations,
        recent: newDonations,
        growth: prevDonations > 0
          ? Math.round(((newDonations - prevDonations) / prevDonations) * 100) : 0,
      },
      requests: {
        total: totalRequests,
        recent: newRequests,
        growth: prevRequests > 0
          ? Math.round(((newRequests - prevRequests) / prevRequests) * 100) : 0,
      },
      users: { total: totalUsers, recent: newUsers },
      matches: { total: totalMatches, recent: newMatches },
      successRate,
    },
  });
});

// ─── DONATIONS OVER TIME ─────────────────────────────────────────────

export const getDonationTrends = catchAsync(async (req, res) => {
  const { months = 12 } = req.query;
  const monthsNum = Math.min(24, parseInt(months));
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsNum);

  const [donationData, requestData, userGrowth] = await Promise.all([
    Donation.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Request.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          donors: { $sum: { $cond: [{ $eq: ['$role', 'donor'] }, 1, 0] } },
          receivers: { $sum: { $cond: [{ $eq: ['$role', 'receiver'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatMonth = (d) => `${MONTHS[d._id.month - 1]} ${d._id.year}`;

  res.status(200).json({
    success: true,
    donations: donationData.map((d) => ({
      month: formatMonth(d),
      donations: d.count,
      delivered: d.delivered,
    })),
    requests: requestData.map((d) => ({
      month: formatMonth(d),
      requests: d.count,
    })),
    userGrowth: userGrowth.map((d) => ({
      month: formatMonth(d),
      total: d.count,
      donors: d.donors,
      receivers: d.receivers,
    })),
  });
});

// ─── CATEGORY DISTRIBUTION ───────────────────────────────────────────

export const getCategoryDistribution = catchAsync(async (req, res) => {
  const [donationsByCategory, requestsByCategory] = await Promise.all([
    Donation.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    Request.aggregate([
      {
        $lookup: {
          from: 'donations',
          localField: 'donation',
          foreignField: '_id',
          as: 'donationData',
        },
      },
      { $unwind: '$donationData' },
      { $group: { _id: '$donationData.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    donationsByCategory: donationsByCategory.map((d) => ({
      category: d._id,
      count: d.count,
      delivered: d.delivered,
    })),
    requestsByCategory: requestsByCategory.map((r) => ({
      category: r._id,
      count: r.count,
    })),
  });
});

// ─── STATE DISTRIBUTION ──────────────────────────────────────────────

export const getStateDistribution = catchAsync(async (req, res) => {
  const stateData = await Donation.aggregate([
    { $match: { 'location.state': { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$location.state',
        donations: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
      },
    },
    { $sort: { donations: -1 } },
    { $limit: 20 },
  ]);

  res.status(200).json({
    success: true,
    states: stateData.map((s) => ({
      state: s._id,
      donations: s.donations,
      delivered: s.delivered,
    })),
  });
});

// ─── IMPACT METRICS ──────────────────────────────────────────────────

export const getImpactMetrics = catchAsync(async (req, res) => {
  const [
    totalDelivered,
    totalBeneficiaries,
    avgMatchScore,
    feedbackStats,
    categoryDemand,
  ] = await Promise.all([
    Match.countDocuments({ status: 'delivered' }),
    Request.aggregate([
      { $match: { status: { $in: ['delivered', 'matched'] } } },
      { $group: { _id: null, total: { $sum: '$beneficiaryCount' } } },
    ]),
    Match.aggregate([
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]),
    Feedback.aggregate([
      { $match: { isHidden: false } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
          positive: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
        },
      },
    ]),
    Promise.all(CATEGORIES.slice(0, 4).map(predictCategoryDemand)),
  ]);

  res.status(200).json({
    success: true,
    impact: {
      totalDelivered,
      totalBeneficiaries: totalBeneficiaries[0]?.total || 0,
      avgMatchScore: Math.round((avgMatchScore[0]?.avg || 0) * 10) / 10,
      avgRating: Math.round((feedbackStats[0]?.avg || 0) * 10) / 10,
      feedbackCount: feedbackStats[0]?.count || 0,
      positiveFeedback: feedbackStats[0]?.positive || 0,
    },
    categoryDemand,
  });
});

// ─── DONOR ANALYTICS ─────────────────────────────────────────────────

export const getDonorAnalytics = catchAsync(async (req, res) => {
  const donorId = req.user._id;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const [monthlyDonations, categoryBreakdown, statusBreakdown, viewStats] = await Promise.all([
    Donation.aggregate([
      { $match: { donor: donorId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Donation.aggregate([
      { $match: { donor: donorId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Donation.aggregate([
      { $match: { donor: donorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Donation.aggregate([
      { $match: { donor: donorId } },
      { $group: { _id: null, totalViews: { $sum: '$viewCount' }, totalRequests: { $sum: '$requestCount' } } },
    ]),
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  res.status(200).json({
    success: true,
    monthlyDonations: monthlyDonations.map((d) => ({
      month: `${MONTHS[d._id.month - 1]} ${d._id.year}`,
      count: d.count,
    })),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c._id,
      count: c.count,
    })),
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s._id,
      count: s.count,
    })),
    engagement: viewStats[0] || { totalViews: 0, totalRequests: 0 },
  });
});
