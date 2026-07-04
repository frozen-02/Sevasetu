import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Eye, Pencil, Trash2, Package, X,
  ChevronLeft, ChevronRight, AlertTriangle, MapPin, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { donationService } from '../../services/index.js';
import {
  CATEGORIES, getCategoryIcon, getCategoryColor, getStatusColor,
  formatDate, formatRelativeTime, getApiError,
} from '../../utils/index.js';

const STATUSES = ['pending', 'approved', 'rejected', 'matched', 'delivered', 'cancelled', 'expired'];
const PAGE_SIZE = 9;

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`badge-${getStatusColor(status)}`}>{status}</span>
);

// ─── Delete Dialog ────────────────────────────────────────────────────────────
const DeleteDialog = ({ donation, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onCancel}
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
          <h3 className="text-lg font-bold text-white">Delete Donation?</h3>
          <p className="text-gray-400 text-sm mt-1">
            Are you sure you want to delete <span className="font-semibold text-gray-200">"{donation?.title}"</span>?
            This action cannot be undone.
          </p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={onConfirm} disabled={isDeleting} className="btn-danger flex-1">
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Donation Card Skeleton ───────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="glass-card !p-0 overflow-hidden">
    <div className="skeleton h-44 rounded-none" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-8 flex-1 rounded-lg" />
        <div className="skeleton h-8 flex-1 rounded-lg" />
        <div className="skeleton h-8 w-8 rounded-lg" />
      </div>
    </div>
  </div>
);

// ─── Donation Card ────────────────────────────────────────────────────────────
const DonationCard = ({ donation, onDelete }) => {
  const navigate = useNavigate();
  const catColor = getCategoryColor(donation.category);

  return (
    <motion.div
      className="glass-card !p-0 overflow-hidden flex flex-col"
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
    >
      {/* Image */}
      <div
        className="relative h-44 bg-gray-800/60 cursor-pointer overflow-hidden"
        onClick={() => navigate(`/donor/donations/${donation._id}`)}
      >
        {donation.images?.[0] ? (
          <img
            src={donation.images[0]}
            alt={donation.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {getCategoryIcon(donation.category)}
          </div>
        )}
        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={donation.status} />
        </div>
        {donation.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            +{donation.images.length - 1}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3
          className="font-semibold text-gray-100 line-clamp-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => navigate(`/donor/donations/${donation._id}`)}
        >
          {donation.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={11} />
          <span className="truncate">{donation.location?.city}, {donation.location?.state}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge text-xs ${catColor}`}>
            {getCategoryIcon(donation.category)} {donation.category}
          </span>
          {donation.condition && (
            <span className="badge-gray">{donation.condition}</span>
          )}
        </div>

        {donation.tags?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Tag size={10} />
            <span className="truncate">{donation.tags.slice(0, 3).join(', ')}</span>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-auto">{formatRelativeTime(donation.createdAt)}</p>

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-1 border-t border-gray-800/60">
          <button
            onClick={() => navigate(`/donor/donations/${donation._id}`)}
            className="btn-ghost flex-1 text-xs py-1.5 px-2 justify-center"
          >
            <Eye size={13} /> View
          </button>
          <button
            onClick={() => navigate(`/donor/donations/${donation._id}/edit`)}
            className="btn-ghost flex-1 text-xs py-1.5 px-2 justify-center text-blue-400 hover:text-blue-300"
            disabled={['delivered', 'matched'].includes(donation.status)}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(donation)}
            className="btn-ghost text-xs py-1.5 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            disabled={['delivered', 'matched'].includes(donation.status)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DonorDonations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['myDonations'],
    queryFn: () => donationService.getMy({ limit: 500 }),
    onError: (err) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => donationService.delete(id),
    onSuccess: () => {
      toast.success('Donation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['myDonations'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const allDonations = data?.data?.donations ?? [];

  const filtered = useMemo(() => {
    let list = allDonations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.location?.city?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((d) => d.status === statusFilter);
    if (categoryFilter) list = list.filter((d) => d.category === categoryFilter);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allDonations, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPage(1);
  };

  const hasFilters = search || statusFilter || categoryFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-black">
            My <span className="gradient-text">Donations</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {isLoading ? '...' : `${allDonations.length} donation${allDonations.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link to="/donor/donations/new" className="btn-primary shrink-0">
          <Plus size={18} /> Add Donation
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="glass-card flex flex-col sm:flex-row gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by title, category, city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>

        {/* Status */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input pl-8 pr-8 min-w-[140px] appearance-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input pr-8 min-w-[140px] appearance-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost shrink-0 text-red-400 hover:text-red-300">
            <X size={16} /> Clear
          </button>
        )}
      </motion.div>

      {/* Error */}
      {isError && (
        <div className="glass-card text-red-400 flex items-center gap-2 border-red-500/20">
          <AlertTriangle size={18} /> {getApiError(error)}
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="empty-state glass-card">
          <Package size={52} className="text-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">
              {hasFilters ? 'No donations match your filters' : 'No donations yet'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {hasFilters ? 'Try adjusting your search or filters.' : 'Start by adding your first donation.'}
            </p>
          </div>
          {hasFilters ? (
            <button onClick={clearFilters} className="btn-secondary">
              <X size={16} /> Clear Filters
            </button>
          ) : (
            <Link to="/donor/donations/new" className="btn-primary">
              <Plus size={16} /> Add Donation
            </Link>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((donation) => (
              <DonationCard
                key={donation._id}
                donation={donation}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-2 px-3 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-2 text-gray-600">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={p === page ? 'btn-primary py-2 px-3.5' : 'btn-secondary py-2 px-3.5'}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary py-2 px-3 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            donation={deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
