import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star, Pencil, Search, X, AlertCircle, MessageSquare,
  Smile, Meh, Frown, AlertTriangle, SendHorizonal, Loader2,
  CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { feedbackService, requestService } from '../../services/index.js';
import { formatRelativeTime, formatDate, getInitials, getApiError } from '../../utils/index.js';

// ─── Star Picker ──────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange, size = 24 }) => (
  <div className="flex gap-1.5">
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        className="transition-transform hover:scale-115 focus:outline-none"
      >
        <Star
          size={size}
          className={`transition-colors ${
            i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 hover:text-yellow-500/60'
          }`}
        />
      </button>
    ))}
  </div>
);

// ─── Star Display ─────────────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 13 }) => (
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

// ─── Sentiment ────────────────────────────────────────────────────────────────
const SentimentIcon = ({ label, score }) => {
  const isPos = label === 'positive' || label === 'very_positive' || score > 0.1;
  const isNeg = label === 'negative' || label === 'very_negative' || score < -0.1;
  if (isPos) return <div className="flex items-center gap-1 text-green-400 text-xs"><Smile size={12} /> Positive</div>;
  if (isNeg) return <div className="flex items-center gap-1 text-red-400 text-xs"><Frown size={12} /> Negative</div>;
  return <div className="flex items-center gap-1 text-gray-400 text-xs"><Meh size={12} /> Neutral</div>;
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ feedback, onClose }) => {
  const [rating, setRating] = useState(feedback.rating);
  const [comment, setComment] = useState(feedback.comment || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => feedbackService.update(feedback._id, { rating, comment }),
    onSuccess: () => {
      toast.success('Feedback updated ✅');
      queryClient.invalidateQueries({ queryKey: ['receiver-feedback'] });
      onClose();
    },
    onError: err => toast.error(getApiError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
      />
      <motion.div
        className="relative glass-card max-w-md w-full z-10"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Edit Feedback</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="label mb-2">Rating</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div className="form-group">
            <label className="label">Comment</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="input resize-none"
              placeholder="Update your comment..."
            />
            <p className="text-xs text-gray-600 text-right mt-1">{comment.length}/500</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : <><CheckCircle size={14} /> Update</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Submit Feedback Form ─────────────────────────────────────────────────────
const SubmitFeedbackSection = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // Pending deliveries without feedback
  const { data: pending = [] } = useQuery({
    queryKey: ['pending-feedback-requests'],
    queryFn: () => requestService.getAll({ limit: 50 }),
    select: res =>
      (res.data?.requests ?? []).filter(r => r.status === 'delivered' && !r.feedbackGiven),
  });

  const [selectedRequest, setSelectedRequest] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const req = pending.find(r => r._id === selectedRequest);
      return feedbackService.create({
        toUserId: req?.donation?.donor?._id ?? req?.donor,
        donationId: req?.donation?._id ?? req?.donation,
        matchId: req?.match,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      toast.success('Feedback submitted ⭐');
      setSelectedRequest('');
      setRating(5);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['receiver-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['pending-feedback-requests'] });
      queryClient.invalidateQueries({ queryKey: ['receiver-requests-all'] });
    },
    onError: err => toast.error(getApiError(err)),
  });

  const canSubmit = selectedRequest && rating > 0;

  if (pending.length === 0) return null;

  return (
    <motion.div
      className="glass-card border-primary-500/15 bg-gradient-to-br from-primary-600/5 to-teal-600/5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400">
            <Star size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-white">Leave Feedback</p>
            <p className="text-xs text-gray-400">{pending.length} donation{pending.length !== 1 ? 's' : ''} awaiting your review</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-4">
              {/* Select donation */}
              <div className="form-group">
                <label className="label">Select Donation to Review</label>
                <select
                  value={selectedRequest}
                  onChange={e => setSelectedRequest(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a delivered donation…</option>
                  {pending.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.donation?.title || 'Donation'} — {formatDate(r.updatedAt)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <p className="label mb-2">Your Rating <span className="text-red-400">*</span></p>
                <StarPicker value={rating} onChange={setRating} size={28} />
                <p className="text-xs text-gray-600 mt-1.5">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}
                </p>
              </div>

              {/* Comment */}
              <div className="form-group">
                <label className="label">Comment <span className="text-gray-600 text-xs font-normal">(optional)</span></label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Share your experience…"
                  className="input resize-none"
                />
                <p className="text-xs text-gray-600 text-right mt-1">{comment.length}/500</p>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={!canSubmit || mutation.isPending}
                className="btn-primary w-full justify-center"
              >
                {mutation.isPending
                  ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                  : <><SendHorizonal size={15} /> Submit Feedback</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Feedback Card ────────────────────────────────────────────────────────────
const FeedbackCard = ({ item, index, onEdit }) => {
  const toUser = item.to;
  return (
    <motion.div
      className="glass-card !p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
            {toUser?.avatar?.url
              ? <img src={toUser.avatar.url} alt={toUser.name} className="w-full h-full object-cover" />
              : getInitials(toUser?.name || 'D')
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{toUser?.name || 'Donor'}</p>
            <p className="text-xs text-gray-500 capitalize">{item.toRole || 'donor'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StarDisplay rating={item.rating} />
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
            title="Edit feedback"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {item.comment && (
        <p className="text-sm text-gray-400 mt-3 leading-relaxed">"{item.comment}"</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/60">
        <div className="flex items-center gap-3">
          <SentimentIcon label={item.sentimentLabel} score={item.sentimentScore} />
          {item.isToxic && (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <AlertTriangle size={12} /> Flagged
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600">{formatRelativeTime(item.createdAt)}</span>
      </div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const FeedbackSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton h-28 rounded-2xl" />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReceiverFeedback() {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [editTarget, setEditTarget] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receiver-feedback'],
    queryFn: () => feedbackService.getMy({ limit: 100 }),
    select: res => res.data?.feedbacks ?? res.data?.feedback ?? [],
  });

  const feedbacks = data ?? [];

  // Stats
  const avgRating = useMemo(() => {
    if (!feedbacks.length) return 0;
    return feedbacks.reduce((a, f) => a + f.rating, 0) / feedbacks.length;
  }, [feedbacks]);

  // Filtered
  const filtered = useMemo(() => {
    let list = feedbacks;
    if (ratingFilter > 0) list = list.filter(f => f.rating === ratingFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.comment?.toLowerCase().includes(q) ||
        f.to?.name?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [feedbacks, ratingFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          My <span className="gradient-text">Feedback</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Rate donors and review your submitted feedback
        </p>
      </motion.div>

      {/* Submit Feedback (collapsible) */}
      <SubmitFeedbackSection />

      {/* Error */}
      {isError && (
        <div className="glass-card flex items-center gap-2 text-red-400 border-red-500/20">
          <AlertCircle size={18} /> {getApiError(error)}
        </div>
      )}

      {/* Stats row */}
      {!isLoading && feedbacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            {
              icon: Star,
              label: 'Average Rating',
              value: avgRating.toFixed(1),
              extra: (
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={11}
                      className={i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'} />
                  ))}
                </div>
              ),
              color: 'bg-yellow-500/20 text-yellow-400',
            },
            { icon: MessageSquare, label: 'Reviews Given', value: feedbacks.length, color: 'bg-primary-500/20 text-primary-400' },
            {
              icon: Smile,
              label: 'Positive Reviews',
              value: `${feedbacks.length > 0 ? Math.round((feedbacks.filter(f => f.rating >= 4).length / feedbacks.length) * 100) : 0}%`,
              color: 'bg-green-500/20 text-green-400',
            },
          ].map(({ icon: Icon, label, value, extra, color }) => (
            <div key={label} className="stat-card">
              <div className={`p-2.5 rounded-xl w-fit ${color}`}><Icon size={18} /></div>
              <div>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
                {extra}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Submitted Feedback heading */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-primary-400" />
          Submitted Reviews
          {feedbacks.length > 0 && (
            <span className="badge-primary ml-1">{feedbacks.length}</span>
          )}
        </h2>

        {/* Filters */}
        {feedbacks.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search reviews…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X size={14} />
                </button>
              )}
            </div>
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
          </div>
        )}
      </motion.div>

      {/* List */}
      {isLoading ? (
        <FeedbackSkeleton />
      ) : feedbacks.length === 0 ? (
        <div className="empty-state glass-card">
          <Star size={48} className="text-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">No feedback given yet</p>
            <p className="text-sm text-gray-600 mt-1">
              After receiving a donation, you can rate the donor here.
            </p>
          </div>
          <Link to="/receiver/received" className="btn-secondary text-sm">
            View Received Items
          </Link>
        </div>
      ) : filtered.length === 0 ? (
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
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <FeedbackCard
              key={item._id}
              item={item}
              index={i}
              onEdit={setEditTarget}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <EditModal
            feedback={editTarget}
            onClose={() => setEditTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
