/**
 * Smart Matching Engine
 * 
 * Score = 40% category + 20% location + 15% urgency + 15% availability + 10% condition
 * 
 * Analyzes donations against receiver requests and returns a weighted compatibility score.
 */

const INDIAN_STATES = {
  'andhra pradesh': 1, 'arunachal pradesh': 2, 'assam': 3, 'bihar': 4, 'chhattisgarh': 5,
  'goa': 6, 'gujarat': 7, 'haryana': 8, 'himachal pradesh': 9, 'jharkhand': 10,
  'karnataka': 11, 'kerala': 12, 'madhya pradesh': 13, 'maharashtra': 14, 'manipur': 15,
  'meghalaya': 16, 'mizoram': 17, 'nagaland': 18, 'odisha': 19, 'punjab': 20,
  'rajasthan': 21, 'sikkim': 22, 'tamil nadu': 23, 'telangana': 24, 'tripura': 25,
  'uttar pradesh': 26, 'uttarakhand': 27, 'west bengal': 28, 'delhi': 29,
};

/**
 * Calculate category match score (0-40)
 */
const getCategoryScore = (donationCategory, receiverNeedCategories) => {
  if (!receiverNeedCategories || receiverNeedCategories.length === 0) return 20; // neutral
  const normalized = donationCategory.toLowerCase();
  const needs = receiverNeedCategories.map((c) => c.toLowerCase());
  if (needs.includes(normalized)) return 40;
  return 10;
};

/**
 * Calculate location score (0-20)
 * Same city = 20, same state = 12, different state = 4
 */
const getLocationScore = (donationLocation, receiverLocation) => {
  if (!donationLocation || !receiverLocation) return 10;

  const donCity = (donationLocation.city || '').toLowerCase().trim();
  const donState = (donationLocation.state || '').toLowerCase().trim();
  const recCity = (receiverLocation.city || '').toLowerCase().trim();
  const recState = (receiverLocation.state || '').toLowerCase().trim();

  if (donCity && recCity && donCity === recCity) return 20;
  if (donState && recState && donState === recState) return 12;
  return 4;
};

/**
 * Calculate urgency score (0-15)
 */
const getUrgencyScore = (urgencyLevel) => {
  const urgencyMap = {
    critical: 15,
    high: 12,
    medium: 8,
    low: 4,
  };
  return urgencyMap[urgencyLevel] || 8;
};

/**
 * Calculate availability score (0-15)
 * Considers pickup availability and expiry
 */
const getAvailabilityScore = (donation) => {
  let score = 10;

  if (donation.pickupAvailable) {
    score += 3;
  }

  if (donation.expiryDate) {
    const daysUntilExpiry = Math.ceil(
      (new Date(donation.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 7) score -= 3;
    else if (daysUntilExpiry > 30) score += 2;
  } else {
    score += 2; // no expiry = always available
  }

  return Math.min(15, Math.max(0, score));
};

/**
 * Calculate condition score (0-10)
 */
const getConditionScore = (condition) => {
  const conditionMap = {
    'New': 10,
    'Like New': 9,
    'Good': 7,
    'Fair': 5,
    'Poor': 2,
  };
  return conditionMap[condition] || 5;
};

/**
 * Calculate full match score for a donation-request pair
 */
export const calculateMatchScore = (donation, request, receiverProfile) => {
  const categoryScore = getCategoryScore(
    donation.category,
    receiverProfile?.needCategories || []
  );
  const locationScore = getLocationScore(
    donation.location,
    receiverProfile?.location || request.receiver?.address
  );
  const urgencyScore = getUrgencyScore(request.urgencyLevel);
  const availabilityScore = getAvailabilityScore(donation);
  const conditionScore = getConditionScore(donation.condition);

  const totalScore =
    categoryScore + locationScore + urgencyScore + availabilityScore + conditionScore;

  return {
    score: Math.round(totalScore * 10) / 10,
    scoreBreakdown: {
      category: categoryScore,
      location: locationScore,
      urgency: urgencyScore,
      availability: availabilityScore,
      condition: conditionScore,
    },
  };
};

/**
 * Find top receivers for a donation
 * Returns sorted array of { receiver, request, score, scoreBreakdown }
 */
export const findTopReceiversForDonation = async (donation, limit = 5) => {
  const Request = (await import('../models/Request.js')).default;
  const ReceiverProfile = (await import('../models/ReceiverProfile.js')).default;

  // Find pending requests in the same category
  const requests = await Request.find({
    status: 'pending',
  })
    .populate('receiver', 'name email address')
    .limit(100)
    .lean();

  // Filter requests for matching donations or open requests
  const relevantRequests = requests.filter((r) => {
    return r.donation.toString() === donation._id.toString();
  });

  const scored = await Promise.all(
    relevantRequests.map(async (request) => {
      const receiverProfile = await ReceiverProfile.findOne({
        user: request.receiver._id,
      }).lean();

      const { score, scoreBreakdown } = calculateMatchScore(
        donation,
        request,
        receiverProfile
      );

      return {
        request,
        receiver: request.receiver,
        score,
        scoreBreakdown,
      };
    })
  );

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
};

/**
 * Find top donations for a receiver request
 * Returns sorted array of { donation, score, scoreBreakdown }
 */
export const findTopDonationsForRequest = async (request, receiverProfile, limit = 5) => {
  const Donation = (await import('../models/Donation.js')).default;

  const donations = await Donation.find({
    status: 'approved',
    category: receiverProfile?.needCategories?.length
      ? { $in: receiverProfile.needCategories }
      : { $exists: true },
  })
    .limit(100)
    .lean();

  const scored = donations.map((donation) => {
    const { score, scoreBreakdown } = calculateMatchScore(
      donation,
      request,
      receiverProfile
    );
    return { donation, score, scoreBreakdown };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
};

export default {
  calculateMatchScore,
  findTopReceiversForDonation,
  findTopDonationsForRequest,
};
