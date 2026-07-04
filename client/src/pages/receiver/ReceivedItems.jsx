import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  PackageCheck, Truck, Star, Calendar, MapPin, User,
  Package, CheckCircle, AlertCircle, ChevronRight, Search, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { requestService, feedbackService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getCategoryIcon, getCategoryColor,
  getInitials, getApiError,
} from '../../utils/index.js';

// ─── Star picker for inline feedback ─────────────────────────────────────────
const StarPicker = ({ value, onChange, size = 20 }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        className="transition-transform hover:scale-110"
      >
        <Star
          size={size}
          className={i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
        />
      </button>
    ))}
  </div>
);

// ─── Feedback Modal ───────────────────────────────────────────────────────────
const FeedbackModal = ({ request, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      feedbackService.create({
        toUserId: request.donation?.donor?._id ?? request.donor,
        matchId: request.match,
        donationId: request.donation?._id ?? request.donation,
        rating,
        comment,
      }),
    onSuccess: () => {
      toast.success('Thank you for your feedback! ⭐');
      queryClient.invalidateQueries({ queryKey: ['receiver-requests-all'] });
      queryClient.invalidateQueries({ queryKey: ['receiver-feedback'] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
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
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Leave Feedback</h3>
            <p className="text-sm text-gray-400 mt-0.5 truncate max-w-[260px]">
              {request.donation?.title || 'Donation'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Rating */}
          <div>
            <p className="label mb-2">Your Rating</p>
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
              placeholder="Share your experience with this donation..."
              className="input resize-none"
              maxLength={500}
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
              {mutation.isPending ? 'Submitting…' : '⭐ Submit'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="glass-card !p-0 overflow-hidden">
    <div className="h-40 skeleton rounded-none" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-9 w-32 rounded-xl" />
    </div>
  </div>
);

// ─── Item Card ────────────────────────────────────────────────────────────────
const ItemCard = ({ request, index, onFeedback }) => {
  const donation = request.donation;
  const donor = donation?.donor;
  const imgSrc = donation?.images?.[0];
  const hasFeedback = !!request.feedbackGiven;

  return (
    <motion.div
      className="glass-card !p-0 overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-800/60 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={donation?.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {getCategoryIcon(donation?.category)}
          </div>
        )}
        {/* Delivered chip */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-600/80 backdrop-blur-sm text-xs font-semibold text-white">
          <CheckCircle size={11} /> Delivered
        </div>
        {donation?.category && (
          <div className={`absolute top-2 right-2 badge text-xs ${getCategoryColor(donation.category)}`}>
            {getCategoryIcon(donation.category)} {donation.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-white leading-snug line-clamp-2">
            {donation?.title || 'Donation'}
          </h3>
          {donation?.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{donation.description}</p>
          )}
        </div>

        {/* Delivery date */}
        <div className="flex items-center gap-1.5 text-xs text-teal-400">
          <Truck size={12} />
          <span>Delivered {formatRelativeTime(request.deliveredAt || request.updatedAt)}</span>
        </div>

        {/* Donor info */}
        {donor && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/40 border border-gray-700/40">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
              {donor?.avatar?.url
                ? <img src={donor.avatar.url} alt={donor.name} className="w-full h-full object-cover" />
                : getInitials(donor?.name || 'D')
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{donor?.name || 'Donor'}</p>
              <p className="text-xs text-gray-500">Donor</p>
            </div>
          </div>
        )}

        {/* Location */}
        {donation?.location?.city && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin size={11} /> {donation.location.city}, {donation.location.state}
          </p>
        )}

        {/* Quantity received */}
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Package size={11} />
          Qty: {request.quantityRequested ?? 1} {donation?.quantity?.unit || 'item(s)'}
          {request.beneficiaryCount && ` · ${request.beneficiaryCount} beneficiar${request.beneficiaryCount === 1 ? 'y' : 'ies'}`}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 border-t border-gray-800/60">
          {hasFeedback ? (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Feedback submitted</span>
              <Link to="/receiver/feedback" className="ml-auto btn-ghost text-xs py-1 px-2">
                View <ChevronRight size={12} />
              </Link>
            </div>
          ) : (
            <button
              onClick={() => onFeedback(request)}
              className="btn-primary w-full justify-center text-sm py-2"
            >
              <Star size={14} /> Leave Feedback
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReceivedItems() {
  const [search, setSearch] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receiver-requests-all'],
    queryFn: () => requestService.getAll({ limit: 200 }),
    select: (res) => {
      const all = res.data?.requests ?? [];
      return all.filter(r => r.status === 'delivered');
    },
  });

  const items = data ?? [];

  const filtered = search
    ? items.filter(r =>
        r.donation?.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.donation?.category?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black">
            Received <span className="gradient-text">Items</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {isLoading ? '...' : `${items.length} item${items.length !== 1 ? 's' : ''} received`}
          </p>
        </div>
        <Link to="/receiver/browse" className="btn-secondary shrink-0">
          <Search size={15} /> Browse More
        </Link>
      </motion.div>

      {/* Summary card */}
      {!isLoading && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card bg-gradient-to-br from-teal-600/10 to-primary-600/5 border-teal-500/15 flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 flex-shrink-0">
            <PackageCheck size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{items.length}</p>
            <p className="text-sm text-gray-400">Donations successfully received</p>
          </div>
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-sm text-gray-500">Feedback pending</p>
            <p className="text-xl font-bold text-yellow-400">
              {items.filter(r => !r.feedbackGiven).length}
            </p>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search received items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </motion.div>

      {/* Error */}
      {isError && (
        <div className="glass-card flex items-center gap-2 text-red-400 border-red-500/20">
          <AlertCircle size={18} /> {getApiError(error)}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <PackageCheck size={52} className="text-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">
              {search ? 'No items match your search' : 'No items received yet'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {search
                ? 'Try different keywords.'
                : 'Once donations are delivered, they will appear here.'}
            </p>
          </div>
          {search ? (
            <button onClick={() => setSearch('')} className="btn-secondary text-sm">
              <X size={14} /> Clear
            </button>
          ) : (
            <Link to="/receiver/browse" className="btn-primary">
              <Package size={15} /> Browse Donations
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((req, i) => (
            <ItemCard
              key={req._id}
              request={req}
              index={i}
              onFeedback={setFeedbackTarget}
            />
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackTarget && (
          <FeedbackModal
            request={feedbackTarget}
            onClose={() => setFeedbackTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
