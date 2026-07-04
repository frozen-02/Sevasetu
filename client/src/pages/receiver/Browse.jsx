import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  MapPin,
  Package,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
  Truck,
  SlidersHorizontal,
  Users,
  FileText,
} from 'lucide-react';
import { donationService, requestService } from '../../services/index.js';
import {
  CATEGORIES,
  CONDITIONS,
  INDIAN_STATES,
  getCategoryIcon,
  getCategoryColor,
  formatDate,
  getApiError,
} from '../../utils/index.js';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const requestSchema = z.object({
  message: z.string().min(10, 'Please describe your need (min 10 characters)').max(500),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  quantityRequested: z.coerce.number().min(1, 'At least 1 item').max(1000),
  purposeDescription: z.string().min(10, 'Describe the purpose (min 10 characters)').max(1000),
  beneficiaryCount: z.coerce.number().min(1, 'At least 1 beneficiary').max(100000),
});

// ─── Donation Card Skeleton ───────────────────────────────────────────────────
const DonationCardSkeleton = () => (
  <div className="glass-card !p-0 overflow-hidden">
    <div className="skeleton h-48 w-full rounded-none rounded-t-2xl" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-9 w-full mt-2" />
    </div>
  </div>
);

// ─── Request Modal ────────────────────────────────────────────────────────────
const RequestModal = ({ donation, onClose, onSuccess }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      urgencyLevel: 'medium',
      quantityRequested: 1,
      beneficiaryCount: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      requestService.create({ ...data, donationId: donation._id }),
    onSuccess: () => {
      toast.success('Request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['receiver-requests-all'] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(getApiError(err));
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto !p-0"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800/80">
          <div>
            <h2 className="text-lg font-bold text-white">Request Donation</h2>
            <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{donation?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Message */}
          <div className="form-group">
            <label className="label">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Why do you need this?
            </label>
            <textarea
              {...register('message')}
              rows={3}
              placeholder="Describe your need briefly…"
              className="input resize-none"
            />
            {errors.message && (
              <p className="error-message">{errors.message.message}</p>
            )}
          </div>

          {/* Purpose */}
          <div className="form-group">
            <label className="label">Purpose Description</label>
            <textarea
              {...register('purposeDescription')}
              rows={3}
              placeholder="How will this donation be used?"
              className="input resize-none"
            />
            {errors.purposeDescription && (
              <p className="error-message">{errors.purposeDescription.message}</p>
            )}
          </div>

          {/* Row: Urgency + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Urgency Level</label>
              <select {...register('urgencyLevel')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {errors.urgencyLevel && (
                <p className="error-message">{errors.urgencyLevel.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="label">Quantity Needed</label>
              <input
                type="number"
                min={1}
                {...register('quantityRequested')}
                className="input"
              />
              {errors.quantityRequested && (
                <p className="error-message">{errors.quantityRequested.message}</p>
              )}
            </div>
          </div>

          {/* Beneficiaries */}
          <div className="form-group">
            <label className="label">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              Number of Beneficiaries
            </label>
            <input
              type="number"
              min={1}
              {...register('beneficiaryCount')}
              className="input"
              placeholder="How many people will benefit?"
            />
            {errors.beneficiaryCount && (
              <p className="error-message">{errors.beneficiaryCount.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Donation Card ────────────────────────────────────────────────────────────
const DonationCard = ({ donation, index, onRequest }) => {
  const catColor = getCategoryColor(donation.category);
  const catIcon = getCategoryIcon(donation.category);
  const image = donation.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="glass-card !p-0 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-900/60 overflow-hidden rounded-t-2xl">
        {image ? (
          <img
            src={image}
            alt={donation.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{catIcon}</span>
          </div>
        )}
        {donation.pickupOnly && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-xs text-yellow-300 font-medium">
            <Truck className="w-3 h-3" />
            Pickup Only
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className={`badge text-xs px-2 py-0.5 rounded-full font-semibold ${catColor}`}>
            {catIcon} {donation.category}
          </span>
          {donation.condition && (
            <span className="text-xs text-gray-500">{donation.condition}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
          {donation.title}
        </h3>

        {/* Location */}
        {(donation.location?.city || donation.location?.state) && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {[donation.location.city, donation.location.state]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}

        {/* Date */}
        <p className="text-xs text-gray-600 mt-auto">{formatDate(donation.createdAt)}</p>

        {/* Request Button */}
        <button
          onClick={() => onRequest(donation)}
          className="btn-primary w-full mt-1 text-sm py-2"
        >
          <Package className="w-3.5 h-3.5" />
          Request
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Browse = () => {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [state, setState] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const LIMIT = 12;

  const queryParams = {
    status: 'approved',
    search: search || undefined,
    category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
    state: state || undefined,
    condition: condition || undefined,
    sort: sort === 'newest' ? '-createdAt' : 'createdAt',
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['browse-donations', queryParams],
    queryFn: async () => {
      const res = await donationService.getAll(queryParams);
      return res.data;
    },
    keepPreviousData: true,
  });

  const donations = data?.donations || [];
  const totalPages = Math.ceil((data?.total || 0) / LIMIT);

  const toggleCategory = useCallback((cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  }, []);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setState('');
    setCondition('');
    setSort('newest');
    setPage(1);
  };

  const hasFilters =
    search || selectedCategories.length > 0 || state || condition || sort !== 'newest';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            Browse <span className="gradient-text">Donations</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Discover available donations and make a request.
          </p>
        </div>
        {hasFilters && (
          <button onClick={resetFilters} className="btn-ghost text-sm self-start">
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </motion.div>

      {/* Search & Filter Bar */}
      <div className="glass-card !p-4 space-y-4">
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search donations…"
              className="input pl-10"
            />
          </div>
          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`btn-secondary gap-2 ${showFilters ? 'border-primary-500/50 text-primary-300' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-4"
            >
              {/* Category Multi-select */}
              <div>
                <label className="label text-xs">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          active
                            ? 'bg-primary-600/30 border-primary-500/60 text-primary-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {getCategoryIcon(cat)} {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* State + Condition + Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label text-xs">State</label>
                  <select
                    value={state}
                    onChange={(e) => { setState(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="">All States</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label text-xs">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => { setCondition(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="">Any Condition</option>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label text-xs">Sort By</label>
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Info */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {data?.total ?? 0} donation{(data?.total ?? 0) !== 1 ? 's' : ''} found
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="glass-card flex items-center gap-3 text-red-400 border-red-500/30">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{getApiError(error)}</p>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <DonationCardSkeleton key={i} />
          ))}
        </div>
      ) : donations.length === 0 ? (
        <div className="empty-state">
          <Package className="w-16 h-16 text-gray-700" />
          <p className="text-lg font-semibold text-gray-400">No donations found</p>
          <p className="text-sm text-gray-600 max-w-xs text-center">
            Try adjusting your filters or check back later.
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="btn-secondary mt-2">
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {donations.map((donation, i) => (
            <DonationCard
              key={donation._id}
              donation={donation}
              index={i}
              onRequest={(d) => setSelectedDonation(d)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="btn-secondary !px-4 !py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                  page === pageNum
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="btn-secondary !px-4 !py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {selectedDonation && (
          <RequestModal
            donation={selectedDonation}
            onClose={() => setSelectedDonation(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Browse;
