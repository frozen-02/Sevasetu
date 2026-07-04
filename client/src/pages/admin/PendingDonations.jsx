import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Clock, Package, MapPin, User,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, X,
  Image as ImageIcon, Calendar, Tag,
} from 'lucide-react';
import { adminService } from '../../services/index.js';
import { formatDate, formatRelativeTime, getInitials, getCategoryIcon, getCategoryColor, getApiError } from '../../utils/index.js';

const PAGE_SIZE = 8;

function RejectModal({ open, donation, onConfirm, onClose, isLoading }) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    onConfirm(reason.trim());
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 rounded-xl">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Reject Donation</h3>
                  <p className="text-gray-400 text-xs truncate max-w-[220px]">{donation?.title}</p>
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
                placeholder="Explain why this donation is being rejected…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
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
      )}
    </AnimatePresence>
  );
}

function DonationCard({ donation, onApprove, onReject, approveLoading, rejectLoading }) {
  const catColor = getCategoryColor(donation.category);
  const catIcon = getCategoryIcon(donation.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="glass-card"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Image */}
        <div className="w-full sm:w-28 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          {donation.images?.[0] ? (
            <img
              src={donation.images[0]}
              alt={donation.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h3 className="text-white font-semibold text-sm leading-snug flex-1">{donation.title}</h3>
            <span className={`badge ${catColor} text-xs`}>{catIcon} {donation.category}</span>
          </div>

          <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
            {donation.description || 'No description provided.'}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-indigo-400" />
              {donation.donor?.name || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-400" />
              {donation.location?.city}, {donation.location?.state}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-purple-400" />
              {donation.condition}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              {formatRelativeTime(donation.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2 justify-end">
          <button
            onClick={() => onApprove(donation._id)}
            disabled={approveLoading || rejectLoading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 text-xs font-semibold transition-all disabled:opacity-50 border border-green-500/20"
          >
            {approveLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><CheckCircle className="w-3.5 h-3.5" /> Approve</>
            )}
          </button>
          <button
            onClick={() => onReject(donation)}
            disabled={approveLoading || rejectLoading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold transition-all disabled:opacity-50 border border-red-500/20"
          >
            {rejectLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><XCircle className="w-3.5 h-3.5" /> Reject</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="skeleton w-full sm:w-28 h-24 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
          <div className="flex gap-3 mt-3">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PendingDonations() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pending-donations', page],
    queryFn: () => adminService.getPendingDonations({ page, limit: PAGE_SIZE }).then((r) => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => adminService.approveDonation(id),
    onMutate: (id) => setApprovingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-donations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Donation approved successfully!');
      setApprovingId(null);
    },
    onError: (err) => {
      toast.error(getApiError(err));
      setApprovingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminService.rejectDonation(id, reason),
    onMutate: ({ id }) => setRejectingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-donations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Donation rejected.');
      setRejectTarget(null);
      setRejectingId(null);
    },
    onError: (err) => {
      toast.error(getApiError(err));
      setRejectingId(null);
    },
  });

  const donations = data?.donations ?? data ?? [];
  const total = data?.total ?? data?.totalCount ?? donations.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Pending Donations</h1>
            <p className="text-gray-400 text-sm">
              {isLoading ? 'Loading…' : `${total} donation${total !== 1 ? 's' : ''} awaiting review`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-300 font-medium">Failed to load pending donations</p>
          <p className="text-gray-500 text-sm">{getApiError(error)}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : donations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card text-center py-16"
        >
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4 opacity-60" />
          <p className="text-white font-semibold text-lg">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending donations to review</p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {donations.map((donation) => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(d) => setRejectTarget(d)}
                  approveLoading={approvingId === donation._id}
                  rejectLoading={rejectingId === donation._id}
                />
              ))}
            </div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between glass-card">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                        page === n ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <RejectModal
        open={!!rejectTarget}
        donation={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget._id, reason })}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
