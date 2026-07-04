import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, Search, Filter, MessageSquare, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Smile, Meh, Frown, BarChart3, X,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

import { feedbackService } from '../../services/index.js';
import { formatDate, formatRelativeTime, getInitials, getApiError } from '../../utils/index.js';

// ─── Star renderer ────────────────────────────────────────────────────────────
const StarRating = ({ rating, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={size}
        className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}
      />
    ))}
  </div>
);

// ─── Sentiment Icon ───────────────────────────────────────────────────────────
const SentimentIcon = ({ label, score }) => {
  if (!label && score === undefined) return null;

  const normalized = label
    ? label
    : score >= 0.5 ? 'very_positive'
    : score >= 0.1 ? 'positive'
    : score <= -0.5 ? 'very_negative'
    : score <= -0.1 ? 'negative'
    : 'neutral';

  if (normalized === 'very_positive' || normalized === 'positive') {
    return <div className="flex items-center gap-1 text-green-400 text-xs font-medium"><Smile size={13} /> Positive</div>;
  }
  if (normalized === 'very_negative' || normalized === 'negative') {
    return <div className="flex items-center gap-1 text-red-400 text-xs font-medium"><Frown size={13} /> Negative</div>;
  }
  return <div className="flex items-center gap-1 text-gray-400 text-xs font-medium"><Meh size={13} /> Neutral</div>;
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-xl px-4 py-2.5 shadow-card text-sm">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const FeedbackSkeleton = () => (
  <div className="space-y-6">
    <div className="skeleton h-10 w-72" />
    <div className="grid sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  </div>
);

// ─── Rating Distribution Bar ──────────────────────────────────────────────────
const RatingBar = ({ star, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400 w-4 text-right">{star}</span>
      <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: (5 - star) * 0.08 }}
        />
      </div>
      <span className="text-gray-500 text-xs w-8">{count}</span>
    </div>
  );
};

// ─── Feedback Card ────────────────────────────────────────────────────────────
const FeedbackCard = ({ item, index }) => {
  const fromUser = item.from;
  const isToxic = item.isToxic;

  return (
    <motion.div
      className={`glass-card !p-4 ${isToxic ? 'border-red-500/20' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {fromUser?.avatar?.url
              ? <img src={fromUser.avatar.url} alt={fromUser.name} className="w-full h-full rounded-full object-cover" />
              : getInitials(fromUser?.name || 'U')
            }
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{fromUser?.name || 'Anonymous'}</p>
            <p className="text-xs text-gray-500 capitalize">{item.fromRole}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StarRating rating={item.rating} size={13} />
        </div>
      </div>

      {/* Comment */}
      <p className="text-sm text-gray-400 mt-3 leading-relaxed">"{item.comment}"</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/60">
        <div className="flex items-center gap-3">
          <SentimentIcon label={item.sentimentLabel} score={item.sentimentScore} />
          {isToxic && (
            <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
              <AlertTriangle size={12} /> Flagged
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600">{formatRelativeTime(item.createdAt)}</span>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DonorFeedback() {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0); // 0 = all

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['myFeedback'],
    queryFn: () => feedbackService.getMy({ limit: 100 }),
    select: (res) => res.data?.feedbacks ?? res.data?.feedback ?? [],
    onError: (err) => toast.error(getApiError(err)),
  });

  const feedbacks = data ?? [];

  // ── Computed Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!feedbacks.length) return null;
    const total = feedbacks.length;
    const avgRating = feedbacks.reduce((acc, f) => acc + f.rating, 0) / total;
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: feedbacks.filter(f => f.rating === star).length,
    }));
    const positive = feedbacks.filter(f =>
      f.sentimentLabel === 'positive' || f.sentimentLabel === 'very_positive' || (f.sentimentScore > 0.1)
    ).length;
    const negative = feedbacks.filter(f =>
      f.sentimentLabel === 'negative' || f.sentimentLabel === 'very_negative' || (f.sentimentScore < -0.1)
    ).length;
    const neutral = total - positive - negative;
    const toxic = feedbacks.filter(f => f.isToxic).length;
    return { total, avgRating, distribution, positive, negative, neutral, toxic };
  }, [feedbacks]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = feedbacks;
    if (ratingFilter > 0) list = list.filter(f => f.rating === ratingFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.comment?.toLowerCase().includes(q) ||
        f.from?.name?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [feedbacks, ratingFilter, search]);

  // ── Sentiment pie data ─────────────────────────────────────────────────────
  const sentimentData = stats ? [
    { name: 'Positive', value: stats.positive, fill: '#22c55e' },
    { name: 'Neutral',  value: stats.neutral,  fill: '#6b7280' },
    { name: 'Negative', value: stats.negative,  fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  if (isLoading) return <FeedbackSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black">
          My <span className="gradient-text">Feedback</span>
        </h1>
        <p className="text-gray-400 mt-1">
          {feedbacks.length > 0
            ? `${feedbacks.length} review${feedbacks.length !== 1 ? 's' : ''} received`
            : 'Feedback from receivers will appear here'}
        </p>
      </motion.div>

      {isError && (
        <div className="glass-card flex items-center gap-2 text-red-400 border-red-500/20">
          <AlertTriangle size={18} /> {getApiError(error)}
        </div>
      )}

      {feedbacks.length === 0 && !isLoading ? (
        <div className="empty-state glass-card">
          <Star size={52} className="text-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">No feedback yet</p>
            <p className="text-sm text-gray-600 mt-1">Receivers can leave feedback after a donation is delivered.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats Row ───────────────────────────────────────────────────── */}
          {stats && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Average Rating */}
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400">
                    <Star size={18} />
                  </div>
                  {stats.avgRating >= 4 ? (
                    <TrendingUp size={16} className="text-green-400" />
                  ) : stats.avgRating < 3 ? (
                    <TrendingDown size={16} className="text-red-400" />
                  ) : (
                    <Minus size={16} className="text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-gray-400">Average Rating</p>
                  <StarRating rating={Math.round(stats.avgRating)} size={12} />
                </div>
              </motion.div>

              {/* Total Reviews */}
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 w-fit">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{stats.total}</p>
                  <p className="text-sm text-gray-400">Total Reviews</p>
                </div>
              </motion.div>

              {/* Positive Rate */}
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400 w-fit">
                  <Smile size={18} />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">
                    {stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-400">Positive Sentiment</p>
                </div>
              </motion.div>

              {/* Toxicity */}
              <motion.div
                className={`stat-card ${stats.toxic > 0 ? 'border-red-500/20' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={`p-2.5 rounded-xl w-fit ${stats.toxic > 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{stats.toxic}</p>
                  <p className="text-sm text-gray-400">Flagged Reviews</p>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Charts Row ──────────────────────────────────────────────────── */}
          {stats && stats.total > 0 && (
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Rating Distribution */}
              <motion.div
                className="glass-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-yellow-400" /> Rating Distribution
                </h3>
                <div className="space-y-3">
                  {stats.distribution.map(({ star, count }) => (
                    <RatingBar key={star} star={star} count={count} total={stats.total} />
                  ))}
                </div>
              </motion.div>

              {/* Sentiment Pie */}
              <motion.div
                className="glass-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <Smile size={16} className="text-green-400" /> Sentiment Analysis
                </h3>
                {sentimentData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {sentimentData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} opacity={0.9} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-1">
                      {sentimentData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-xs text-gray-400">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <Meh size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No sentiment data</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* ── Filter Row ──────────────────────────────────────────────────── */}
          <motion.div
            className="glass-card flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or comment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>

            {/* Star filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-gray-500 shrink-0" />
              <div className="flex gap-1">
                {[0, 5, 4, 3, 2, 1].map(r => (
                  <button
                    key={r}
                    onClick={() => setRatingFilter(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      ratingFilter === r
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {r === 0 ? 'All' : `${r}★`}
                  </button>
                ))}
              </div>
              {(search || ratingFilter > 0) && (
                <button
                  onClick={() => { setSearch(''); setRatingFilter(0); }}
                  className="btn-ghost py-1.5 px-2 text-red-400 hover:text-red-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>

          {/* ── Feedback List ────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="empty-state glass-card py-12">
              <Search size={36} className="text-gray-700" />
              <p className="text-gray-500">No reviews match your filters</p>
              <button
                onClick={() => { setSearch(''); setRatingFilter(0); }}
                className="btn-secondary text-sm"
              >
                <X size={14} /> Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((item, i) => (
                <FeedbackCard key={item._id} item={item} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
