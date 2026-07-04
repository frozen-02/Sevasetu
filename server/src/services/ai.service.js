/**
 * AI Service — Pure Algorithmic Implementation
 * 
 * 1. Sentiment Analysis (VADER-inspired JS implementation)
 * 2. Toxicity Detection (keyword-based with pattern matching)
 * 3. Duplicate Detection (cosine similarity on TF-IDF vectors)
 */

// ─── SENTIMENT ANALYSIS ─────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'nice', 'helpful',
  'kind', 'generous', 'thankful', 'grateful', 'happy', 'satisfied', 'impressed',
  'outstanding', 'superb', 'brilliant', 'perfect', 'love', 'awesome', 'best',
  'quick', 'fast', 'reliable', 'honest', 'caring', 'warm', 'friendly',
  'efficient', 'professional', 'cooperative', 'blessed', 'fortunate',
  'appreciate', 'recommended', 'prompt', 'smooth', 'clean', 'quality',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing', 'unhappy',
  'angry', 'frustrated', 'upset', 'broken', 'damaged', 'fake', 'scam', 'fraud',
  'late', 'slow', 'rude', 'arrogant', 'dishonest', 'useless', 'waste',
  'worst', 'never', 'avoid', 'unresponsive', 'delayed', 'missing', 'incomplete',
  'wrong', 'incorrect', 'fail', 'failed', 'issue', 'problem', 'trouble',
  'disappointing', 'regret', 'dissatisfied', 'unhelpful', 'careless',
]);

const INTENSIFIERS = new Set(['very', 'extremely', 'incredibly', 'highly', 'absolutely', 'really', 'quite', 'so']);
const NEGATORS = new Set(['not', "n't", 'no', 'never', 'neither', 'hardly', 'barely', 'scarcely']);

/**
 * Analyze sentiment of text
 * Returns { score: -1 to 1, label: string, confidence: 0-1 }
 */
export const analyzeSentiment = (text) => {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral', confidence: 0 };
  }

  const words = text.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  let totalRelevant = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const prevPrevWord = i > 1 ? words[i - 2] : '';
    const hasNegator = NEGATORS.has(prevWord) || NEGATORS.has(prevPrevWord);
    const hasIntensifier = INTENSIFIERS.has(prevWord);
    const multiplier = hasIntensifier ? 1.5 : 1;

    if (POSITIVE_WORDS.has(word)) {
      totalRelevant++;
      if (hasNegator) negativeCount += multiplier;
      else positiveCount += multiplier;
    } else if (NEGATIVE_WORDS.has(word)) {
      totalRelevant++;
      if (hasNegator) positiveCount += multiplier;
      else negativeCount += multiplier;
    }
  }

  if (totalRelevant === 0) {
    return { score: 0, label: 'neutral', confidence: 0.3 };
  }

  const score = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1);
  const normalizedScore = Math.max(-1, Math.min(1, score));
  const confidence = Math.min(1, totalRelevant / 10);

  let label;
  if (normalizedScore >= 0.5) label = 'very_positive';
  else if (normalizedScore >= 0.1) label = 'positive';
  else if (normalizedScore >= -0.1) label = 'neutral';
  else if (normalizedScore >= -0.5) label = 'negative';
  else label = 'very_negative';

  return {
    score: Math.round(normalizedScore * 1000) / 1000,
    label,
    confidence: Math.round(confidence * 100) / 100,
  };
};

// ─── TOXICITY DETECTION ─────────────────────────────────────────────

const TOXIC_PATTERNS = [
  // Hate speech patterns (generic, non-specific)
  /\b(hate|despise|kill|murder|attack|threaten)\s+(you|them|him|her|all)\b/i,
  /\b(stupid|idiot|moron|dumb|fool|loser)\s*[!]{0,3}$/i,
  // Scam indicators
  /\b(fraud|scam|fake|phishing|money\s*transfer|send\s*money|wire\s*transfer)\b/i,
  // Harassment
  /\b(shut\s*up|go\s*away|get\s*lost|f[*u]ck\s*(you|off))\b/i,
  // Spam
  /\b(click\s*here|buy\s*now|limited\s*time|free\s*money|earn\s*\$)\b/i,
];

const TOXIC_KEYWORDS = new Set([
  'scam', 'fraud', 'fake', 'liar', 'cheat', 'steal', 'stolen',
  'harassment', 'harass', 'bully', 'abuse', 'abusive',
]);

/**
 * Detect if content is toxic
 * Returns { isToxic: boolean, score: 0-1, categories: string[] }
 */
export const detectToxicity = (text) => {
  if (!text || text.trim().length === 0) {
    return { isToxic: false, score: 0, categories: [] };
  }

  const lower = text.toLowerCase();
  const categories = [];
  let toxicScore = 0;

  // Check patterns
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      categories.push(getPatternCategory(pattern));
      toxicScore += 0.4;
    }
  }

  // Check keywords
  const words = lower.split(/\s+/);
  const toxicWordCount = words.filter((w) => TOXIC_KEYWORDS.has(w)).length;
  if (toxicWordCount > 0) {
    toxicScore += toxicWordCount * 0.15;
    categories.push('harmful_content');
  }

  // Excessive caps check
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 20) {
    toxicScore += 0.1;
    categories.push('aggressive_caps');
  }

  const finalScore = Math.min(1, toxicScore);
  const isToxic = finalScore >= 0.4;

  return {
    isToxic,
    score: Math.round(finalScore * 100) / 100,
    categories: [...new Set(categories)],
  };
};

const getPatternCategory = (pattern) => {
  const str = pattern.toString();
  if (str.includes('fraud|scam')) return 'scam_content';
  if (str.includes('hate|despise')) return 'hate_speech';
  if (str.includes('shut|go away')) return 'harassment';
  if (str.includes('click here')) return 'spam';
  return 'harmful_content';
};

// ─── DUPLICATE DETECTION ─────────────────────────────────────────────

/**
 * Build TF-IDF-like vector for a text
 */
const buildVector = (text) => {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  // Normalize
  const total = words.length || 1;
  Object.keys(freq).forEach((k) => { freq[k] /= total; });

  return freq;
};

/**
 * Cosine similarity between two frequency vectors
 */
const cosineSimilarity = (vecA, vecB) => {
  const keysA = Object.keys(vecA);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  keysA.forEach((key) => {
    dotProduct += (vecA[key] || 0) * (vecB[key] || 0);
    magA += vecA[key] ** 2;
  });

  Object.values(vecB).forEach((v) => { magB += v ** 2; });

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Check if a donation is likely a duplicate
 * Returns { isDuplicate: boolean, similarity: 0-1, matchedId: string|null }
 */
export const detectDuplicate = async (title, description, donorId) => {
  const Donation = (await import('../models/Donation.js')).default;

  const recentDonations = await Donation.find({
    donor: donorId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
  })
    .select('title description _id')
    .limit(50)
    .lean();

  if (recentDonations.length === 0) {
    return { isDuplicate: false, similarity: 0, matchedId: null };
  }

  const candidateText = `${title} ${description}`;
  const candidateVec = buildVector(candidateText);

  let maxSimilarity = 0;
  let matchedId = null;

  for (const donation of recentDonations) {
    const existingText = `${donation.title} ${donation.description}`;
    const existingVec = buildVector(existingText);
    const sim = cosineSimilarity(candidateVec, existingVec);

    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      matchedId = donation._id;
    }
  }

  const DUPLICATE_THRESHOLD = 0.85;

  return {
    isDuplicate: maxSimilarity >= DUPLICATE_THRESHOLD,
    similarity: Math.round(maxSimilarity * 100) / 100,
    matchedId: maxSimilarity >= DUPLICATE_THRESHOLD ? matchedId : null,
  };
};

/**
 * Predict demand trends for a category
 * Simple moving average analysis
 */
export const predictCategoryDemand = async (category) => {
  const Request = (await import('../models/Request.js')).default;
  const Donation = (await import('../models/Donation.js')).default;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [recentRequests, olderRequests] = await Promise.all([
    Request.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Request.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    }),
  ]);

  const trend = olderRequests > 0
    ? ((recentRequests - olderRequests) / olderRequests) * 100
    : 0;

  return {
    category,
    recentRequests,
    olderRequests,
    trend: Math.round(trend * 10) / 10,
    trendLabel: trend > 20 ? 'rising' : trend < -20 ? 'falling' : 'stable',
  };
};

export default {
  analyzeSentiment,
  detectToxicity,
  detectDuplicate,
  predictCategoryDemand,
};
