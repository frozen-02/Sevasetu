import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle, Target, Truck, XCircle,
  Search, X, AlertTriangle, Package, MapPin, Calendar,
  ChevronRight, Loader2, Users, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { requestService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getStatusColor, getUrgencyColor,
  getCategoryIcon, getCategoryColor, getApiError,
} from '../../utils/index.js';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'All',       icon: ClipboardList },
  { key: 'pending',   label: 'Pending',   icon: Clock         },
  { key: 'approved',  label: 'Approved',  icon: CheckCircle   },
  { key: 'matched',   label: 'Matched',   icon: Target        },
  { key: 'delivered', label: 'Delivered', icon: Truck         },
  { key: 'rejected',  label: 'Rejected',  icon: XCircle       },
  { key: 'cancelled', label: 'Cancelled', icon: X             },
];

// ─── Reusable Badges ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`badge-${getStatusColor(status)} capitalize`}>{status}</span>
);

const UrgencyBadge = ({ level }) => {
  if (!level) return null;
  const cls = {
    critical: 'badge-danger', high: 'badge-warning',
    medium: 'badge-primary',  low: 'badge-gray',
  };
  return <span className={cls[level] || 'badge-gray'}>{level}</span>;
};

// ─── Cancel Dialog ────────────────────────────────────────────────────────────
const CancelDialog = ({ request, onConfirm, onClose, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
    />
    <motion.div
      className="relative glass-card max-w-md w-full z-10"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-red-500/20 text-red-400 shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Cancel Request?</h3>
          <p className="text-gray-400 text-sm mt-1">
            Are you sure you want to cancel your request for{' '}
            <span className="font-semibold text-gray-200">
              "{request?.donation?.title || 'this donation'}"
            </span>? This cannot be undone.
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Keep Request</button>
        <button onClick={onConfirm} disabled={isLoading} className="btn-danger flex-1">
          {isLoading ? <><Loader2 size={15} className="animate-spin" /> Cancelling...</> : 'Yes, Cancel'}
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="glass-card !p-0 overflow-hidden">
    <div className="flex gap-4 p-4">
      <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// ─── Status Timeline (mini) ───────────────────────────────────────────────────
const MINI_STEPS = ['pending', 'approved', 'matched', 'delivered'];
const STATUS_IDX = { pending: 0, approved: 1, matched: 2, delivered: 3 };

const MiniTimeline = ({ status }) => {
  const cur = STATUS_IDX[status] ?? -1;
  const rejected = status === 'rejected' || status === 'cancelled';
  return (
    <div className="flex items-center gap-1 mt-2">
      {MINI_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
            rejected ? 'bg-red-500/40'
            : i < cur ? 'bg-green-500'
            : i === cur ? 'bg-primary-400'
            : 'bg-gray-700'
          }`} />
          {i < MINI_STEPS.length - 1 && (
            <div className={`flex-1 h-px ${
              rejected ? 'bg-red-500/20'
              : i < cur ? 'bg-green-500/40'
              : 'bg-gray-800'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Request Card ─────────────────────────────────────────────────────────────
const RequestCard = ({ request, index, onCancel }) => {
  const donation = request.donation;
  const imgSrc = donation?.images?.[0];
  const canCancel = request.status === 'pending';

  return (
    <motion.div
      className="glass-card !p-0 overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      layout
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800/60 flex items-center justify-center text-3xl flex-shrink-0">
          {imgSrc ? (
            <img src={imgSrc} alt={donation?.title} className="w-full h-full object-cover" />
          ) : (
            getCategoryIcon(donation?.category)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm leading-snug truncate max-w-[220px]">
              {donation?.title || 'Donation'}
            </h3>
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {donation?.category && (
              <span className={`badge text-xs ${getCategoryColor(donation.category)}`}>
                {getCategoryIcon(donation.category)} {donation.category}
              </span>
            )}
            <UrgencyBadge level={request.urgencyLevel} />
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
            {donation?.location?.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {donation.location.city}, {donation.location.state}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={10} /> {request.beneficiaryCount ?? 1} beneficiar{request.beneficiaryCount === 1 ? 'y' : 'ies'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={10} /> {formatRelativeTime(request.createdAt)}
            </span>
          </div>

          <MiniTimeline status={request.status} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-0 border-t border-gray-800/60 mt-0 pt-3">
        <p className="text-xs text-gray-600 flex-1 truncate">
          {request.message ? `"${request.message.slice(0, 60)}${request.message.length > 60 ? '…' : ''}"` : ''}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {request.status === 'delivered' && (
            <Link
              to="/receiver/feedback"
              className="btn-ghost text-xs py-1.5 px-3 text-teal-400 hover:text-teal-300"
            >
              ⭐ Rate
            </Link>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(request)}
              className="btn-ghost text-xs py-1.5 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Cancel
            </button>
          )}
          {donation?._id && (
            <Link
              to="/receiver/browse"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
            >
              View <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {request.status === 'rejected' && request.rejectionReason && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">
            <strong>Reason:</strong> {request.rejectionReason}
          </p>
        </div>
      )}

      {/* Delivery info */}
      {request.status === 'delivered' && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <p className="text-xs text-teal-400 flex items-center gap-1">
            <Truck size={12} /> Delivered on {formatDate(request.deliveredAt)}
          </p>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReceiverRequests() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receiver-requests-all'],
    queryFn: () => requestService.getAll({ limit: 200 }),
    select: (res) => res.data?.requests ?? [],
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => requestService.cancel(id),
    onSuccess: () => {
      toast.success('Request cancelled');
      queryClient.invalidateQueries({ queryKey: ['receiver-requests-all'] });
      setCancelTarget(null);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const requests = data ?? [];

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: requests.length };
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? requests : requests.filter(r => r.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.donation?.title?.toLowerCase().includes(q) ||
        r.donation?.category?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests, activeTab, search]);

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
            My <span className="gradient-text">Requests</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {isLoading ? '...' : `${requests.length} total request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/receiver/browse" className="btn-primary shrink-0">
          <Package size={16} /> Browse Donations
        </Link>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1.5 flex-wrap"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeTab === key
                ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Icon size={13} />
            {label}
            {counts[key] > 0 && (
              <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === key ? 'bg-primary-500/30 text-primary-200' : 'bg-gray-700 text-gray-400'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </motion.div>

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
          placeholder="Search by donation title, category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <ClipboardList size={48} className="text-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">
              {search ? 'No requests match your search' : `No ${activeTab === 'all' ? '' : activeTab} requests`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {search ? 'Try different keywords.' : 'Browse donations to make your first request.'}
            </p>
          </div>
          {search ? (
            <button onClick={() => setSearch('')} className="btn-secondary text-sm">
              <X size={14} /> Clear Search
            </button>
          ) : (
            <Link to="/receiver/browse" className="btn-primary">
              <Package size={15} /> Browse Donations
            </Link>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((req, i) => (
              <RequestCard
                key={req._id}
                request={req}
                index={i}
                onCancel={setCancelTarget}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Cancel Dialog */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelDialog
            request={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={() => cancelMutation.mutate(cancelTarget._id)}
            isLoading={cancelMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
