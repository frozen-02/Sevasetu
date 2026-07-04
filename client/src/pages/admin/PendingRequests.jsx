import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Clock, FileText, MapPin, User,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, X,
  Search, Filter, Users, Zap, Package, Calendar,
  SlidersHorizontal,
} from 'lucide-react';

import { adminService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getInitials, getCategoryIcon,
  getCategoryColor, getUrgencyColor, getApiError,
} from '../../utils/index.js';

const PAGE_SIZE = 8;

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ open, request, onConfirm, onClose, isLoading }) {
  const [reason, setReason] = useState('');

  const handleClose = () => { setReason(''); onClose(); };
  const handleConfirm = () => {
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
    onConfirm(reason.trim());
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="glass-card w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 rounded-xl">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Reject Request</h3>
                <p className="text-gray-400 text-xs truncate max-w-[220px]">
                  {request?.donation?.title || request?.message?.slice(0, 40) || 'This request'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="form-group">
            <label className="label">Rejection Reason <span className="text-red-400">*</span></label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Explain why this request is being rejected…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">{reason.length}/500</p>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button className="btn-ghost" onClick={handleClose} disabled={isLoading}>Cancel</button>
            <button
              className="btn-danger"
              onClick={handleConfirm}
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────
const UrgencyBadge = ({ level }) => {
  if (!level) return null;
  const cls = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-primary', low: 'badge-gray' };
  return <span className={`${cls[level] || 'badge-gray'} capitalize`}>{level}</span>;
};

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ request, onApprove, onReject, approveLoading, rejectLoading }) {
  const donation = request.donation;
  const receiver = request.receiver;
  const catColor = getCategoryColor(donation?.category);
  const catIcon = getCategoryIcon(donation?.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="glass-card"
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Donation thumbnail */}
        <div className="w-full lg:w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          {donation?.images?.[0] ? (
            <img src={donation.images[0]} alt={donation.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              {catIcon}
            </div>
          )}
        </div>

        {/* Middle: Info */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h3 className="text-white font-semibold text-sm flex-1 leading-snug">
              {donation?.title || 'Unknown Donation'}
            </h3>
            {donation?.category && (
              <span className={`badge text-xs ${catColor}`}>{catIcon} {donation.category}</span>
            )}
            <UrgencyBadge level={request.urgencyLevel} />
          </div>

          {/* Message */}
          <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2 italic">
            "{request.message}"
          </p>

          {/* Meta grid */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-teal-400" />
              <span className="font-medium text-gray-300">{receiver?.name || 'Unknown'}</span>
              {receiver?.isNGO && <span className="badge-teal text-[10px] px-1 py-0.5">NGO</span>}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              {donation?.location?.city || '—'}, {donation?.location?.state || '—'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              {request.beneficiaryCount ?? 1} beneficiar{request.beneficiaryCount === 1 ? 'y' : 'ies'}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3 text-gray-500" />
              Qty: {request.quantityRequested ?? 1}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              {formatRelativeTime(request.createdAt)}
            </span>
          </div>

          {/* Purpose description */}
          {request.purposeDescription && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-1">
              <span className="text-gray-400 font-medium">Purpose: </span>
              {request.purposeDescription}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex lg:flex-col gap-2 justify-end">
          <button
            onClick={() => onApprove(request._id)}
            disabled={approveLoading || rejectLoading}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 text-xs font-semibold transition-all disabled:opacity-50 border border-green-500/20"
          >
            {approveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Approve</>}
          </button>
          <button
            onClick={() => onReject(request)}
            disabled={approveLoading || rejectLoading}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold transition-all disabled:opacity-50 border border-red-500/20"
          >
            {rejectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><XCircle className="w-3.5 h-3.5" /> Reject</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="skeleton w-full lg:w-24 h-20 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
          <div className="flex gap-3 mt-3">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between glass-card">
      <p className="text-xs text-gray-500">Page {page} of {totalPages} · {total} total</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${page === n ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {n}
            </button>
          );
        })}
        <button
          onClick={() => onChange(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PendingRequests() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pending-requests', page, search, urgencyFilter],
    queryFn: () => adminService.getPendingRequests({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      urgencyLevel: urgencyFilter || undefined,
    }).then(r => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: id => adminService.approveRequest(id),
    onMutate: id => setApprovingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Request approved!');
      setApprovingId(null);
    },
    onError: err => { toast.error(getApiError(err)); setApprovingId(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminService.rejectRequest(id, reason),
    onMutate: ({ id }) => setRejectingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Request rejected.');
      setRejectTarget(null);
      setRejectingId(null);
    },
    onError: err => { toast.error(getApiError(err)); setRejectingId(null); },
  });

  const requests = data?.requests ?? data ?? [];
  const total = data?.total ?? data?.totalCount ?? requests.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Pending Requests</h1>
            <p className="text-gray-400 text-sm">
              {isLoading ? 'Loading…' : `${total} request${total !== 1 ? 's' : ''} awaiting review`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search + Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="glass-card flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by receiver name, donation title…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          <select
            value={urgencyFilter}
            onChange={e => { setUrgencyFilter(e.target.value); setPage(1); }}
            className="input max-w-[160px]"
          >
            <option value="">All Urgency</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
      </motion.div>

      {/* Content */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-300 font-medium">Failed to load requests</p>
          <p className="text-gray-500 text-sm">{getApiError(error)}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : requests.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center py-16">
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4 opacity-60" />
          <p className="text-white font-semibold text-lg">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending requests to review</p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {requests.map(req => (
                <RequestCard
                  key={req._id}
                  request={req}
                  onApprove={id => approveMutation.mutate(id)}
                  onReject={r => setRejectTarget(r)}
                  approveLoading={approvingId === req._id}
                  rejectLoading={rejectingId === req._id}
                />
              ))}
            </div>
          </AnimatePresence>

          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}

      <RejectModal
        open={!!rejectTarget}
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={reason => rejectMutation.mutate({ id: rejectTarget._id, reason })}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
