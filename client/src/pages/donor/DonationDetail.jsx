import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Pencil, Trash2, MapPin, Tag, Package, Clock,
  CheckCircle, Truck, Users, Star, AlertTriangle, X, ChevronLeft,
  ChevronRight, Eye, Calendar, ShieldCheck, Target, Info, Phone,
  Building, Zap, AlertCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { donationService, requestService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getStatusColor, getCategoryIcon,
  getCategoryColor, getConditionColor, getUrgencyColor, getApiError,
} from '../../utils/index.js';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`badge-${getStatusColor(status)}`}>{status}</span>
);

// ─── Urgency Badge ────────────────────────────────────────────────────────────
const UrgencyBadge = ({ level }) => (
  <span className={`badge-${getUrgencyColor(level)}`}>{level}</span>
);

// ─── Timeline Step ────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'pending',   label: 'Submitted',  icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { key: 'approved',  label: 'Approved',   icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-500/20' },
  { key: 'matched',   label: 'Matched',    icon: Target,       color: 'text-primary-400',bg: 'bg-primary-500/20' },
  { key: 'delivered', label: 'Delivered',  icon: Truck,        color: 'text-teal-400',   bg: 'bg-teal-500/20' },
];

const STATUS_ORDER = { pending: 0, approved: 1, rejected: 1, matched: 2, delivered: 3 };

const Timeline = ({ status }) => {
  const currentIdx = STATUS_ORDER[status] ?? 0;
  const isRejected = status === 'rejected';

  return (
    <div className="glass-card">
      <h3 className="text-base font-bold text-gray-200 mb-5 flex items-center gap-2">
        <Clock size={16} className="text-primary-400" /> Status Timeline
      </h3>
      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = !isRejected && i <= currentIdx;
          const active = !isRejected && i === currentIdx;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  done ? `${step.bg} ${step.color} ring-2 ring-offset-2 ring-offset-gray-900 ${active ? 'ring-current' : 'ring-transparent'}` : 'bg-gray-800 text-gray-600'
                }`}>
                  <Icon size={16} />
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${done ? step.color : 'text-gray-600'}`}>
                  {step.label}
                </span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-5 mx-1 rounded ${
                  !isRejected && i < currentIdx ? 'bg-gradient-to-r from-green-500/60 to-primary-500/40' : 'bg-gray-800'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {isRejected && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">This donation was rejected.</p>
        </div>
      )}
    </div>
  );
};

// ─── Image Gallery ────────────────────────────────────────────────────────────
const ImageGallery = ({ images = [] }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images.length) {
    return (
      <div className="aspect-video bg-gray-800/60 rounded-2xl flex items-center justify-center text-6xl">
        📦
      </div>
    );
  }

  const imgUrls = images.map(img => (typeof img === 'string' ? img : img?.url));

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-800">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeIdx}
            src={imgUrls[activeIdx]}
            alt={`Image ${activeIdx + 1}`}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>
        {/* Nav buttons */}
        {imgUrls.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setActiveIdx(i => Math.min(imgUrls.length - 1, i + 1))}
              disabled={activeIdx === imgUrls.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {activeIdx + 1}/{imgUrls.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {imgUrls.length > 1 && (
        <div className="flex gap-2">
          {imgUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                i === activeIdx ? 'border-primary-500' : 'border-gray-700/60 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Delete Dialog ────────────────────────────────────────────────────────────
const DeleteDialog = ({ title, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onCancel}
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
            Are you sure you want to delete <span className="font-semibold text-gray-200">"{title}"</span>?
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
          {isDeleting ? <><Loader2 size={15} className="animate-spin" /> Deleting...</> : 'Delete'}
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Request Card ─────────────────────────────────────────────────────────────
const RequestCard = ({ request, index }) => {
  const receiver = request.receiver;
  return (
    <motion.div
      className="glass-card !p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-primary-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {receiver?.avatar?.url
              ? <img src={receiver.avatar.url} alt={receiver.name} className="w-full h-full rounded-full object-cover" />
              : (receiver?.name?.[0] || '?').toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{receiver?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 truncate">{receiver?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {request.urgencyLevel && <UrgencyBadge level={request.urgencyLevel} />}
          <StatusBadge status={request.status} />
        </div>
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-3">"{request.message}"</p>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-gray-600" />
          <span>{request.beneficiaryCount || 1} beneficiar{request.beneficiaryCount === 1 ? 'y' : 'ies'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={11} className="text-gray-600" />
          <span>Qty: {request.quantityRequested || 1}</span>
        </div>
        {request.match?.score && (
          <div className="flex items-center gap-1.5">
            <Target size={11} className="text-primary-400" />
            <span className="text-primary-400 font-medium">Match: {Math.round(request.match.score)}%</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="text-gray-600" />
          <span>{formatRelativeTime(request.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const DetailSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <div className="skeleton h-9 w-9 rounded-lg" />
      <div className="space-y-2 flex-1">
        <div className="skeleton h-7 w-64" />
        <div className="skeleton h-4 w-40" />
      </div>
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="glass-card space-y-3">
          {[80, 60, 100, 70].map((w, i) => (
            <div key={i} className={`skeleton h-4`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="glass-card space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-4 w-full" />)}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Fetch donation
  const { data: donationData, isLoading: donationLoading, isError } = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationService.getById(id),
    select: (res) => res.data?.donation ?? res.data,
    enabled: !!id,
  });

  // Fetch requests for this donation
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['donationRequests', id],
    queryFn: () => requestService.getAll({ donation: id, limit: 50 }),
    select: (res) => res.data?.requests ?? [],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => donationService.delete(id),
    onSuccess: () => {
      toast.success('Donation deleted');
      queryClient.invalidateQueries({ queryKey: ['myDonations'] });
      navigate('/donor/donations');
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  if (donationLoading) return <DetailSkeleton />;

  if (isError || !donationData) {
    return (
      <div className="empty-state glass-card">
        <AlertCircle size={48} className="text-red-500/60" />
        <p className="text-xl font-semibold">Donation not found</p>
        <Link to="/donor/donations" className="btn-secondary">
          <ArrowLeft size={16} /> Back to Donations
        </Link>
      </div>
    );
  }

  const d = donationData;
  const requests = requestsData ?? [];
  const canEdit = !['delivered', 'matched'].includes(d.status);
  const catColor = getCategoryColor(d.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/donor/donations')} className="btn-ghost py-2 px-3">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{d.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={d.status} />
              <span className={`badge text-xs ${catColor}`}>
                {getCategoryIcon(d.category)} {d.category}
              </span>
              {d.subcategory && <span className="badge-gray">{d.subcategory}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          {canEdit && (
            <button
              onClick={() => navigate(`/donor/donations/${id}/edit`)}
              className="btn-secondary py-2 px-4 text-sm"
            >
              <Pencil size={15} /> Edit
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowDelete(true)}
              className="btn-ghost py-2 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Image + Description + Timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <ImageGallery images={d.images ?? []} />
          </motion.div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Timeline status={d.status} />
          </motion.div>

          {/* Description */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Info size={16} className="text-primary-400" /> Description
            </h3>
            <p className="text-gray-400 leading-relaxed whitespace-pre-line">{d.description}</p>

            {d.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Tag size={13} className="text-gray-600" />
                {d.tags.map(t => (
                  <span key={t} className="px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Requests */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-200 flex items-center gap-2">
                <Users size={16} className="text-primary-400" />
                Receiver Requests
                {requests.length > 0 && (
                  <span className="badge-primary ml-1">{requests.length}</span>
                )}
              </h3>
            </div>

            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="glass-card text-center py-10">
                <Users size={36} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 font-medium">No requests yet</p>
                <p className="text-xs text-gray-600 mt-1">Requests from receivers will appear here once your donation is approved.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req, i) => (
                  <RequestCard key={req._id} request={req} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column — Details */}
        <div className="space-y-4">
          {/* Key Details */}
          <motion.div
            className="glass-card space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              <Package size={16} className="text-primary-400" /> Details
            </h3>

            {[
              { label: 'Condition', value: (
                <span className={`font-semibold ${getConditionColor(d.condition)}`}>{d.condition || '—'}</span>
              )},
              { label: 'Quantity', value: `${d.quantity?.value ?? '—'} ${d.quantity?.unit ?? ''}` },
              { label: 'Pickup', value: d.pickupAvailable ? (
                <span className="text-green-400 font-medium flex items-center gap-1"><ShieldCheck size={13} /> Available</span>
              ) : (
                <span className="text-gray-500">Not available</span>
              )},
              { label: 'Views', value: <span className="flex items-center gap-1"><Eye size={13} className="text-gray-500" /> {d.viewCount ?? 0}</span> },
              { label: 'Requests', value: d.requestCount ?? requests.length },
              ...(d.expiryDate ? [{ label: 'Expires', value: formatDate(d.expiryDate) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm text-gray-200">{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Location */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-teal-400" /> Location
            </h3>
            <p className="text-gray-300 font-medium">{d.location?.city}</p>
            <p className="text-gray-500 text-sm">{d.location?.state}, India</p>
            {d.location?.pincode && (
              <p className="text-gray-600 text-xs mt-1">PIN: {d.location.pincode}</p>
            )}
          </motion.div>

          {/* Dates */}
          <motion.div
            className="glass-card space-y-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              <Calendar size={16} className="text-accent-400" /> Dates
            </h3>
            {[
              { label: 'Created', value: formatDate(d.createdAt), icon: Clock },
              ...(d.approvedAt ? [{ label: 'Approved', value: formatDate(d.approvedAt), icon: CheckCircle }] : []),
              ...(d.deliveredAt ? [{ label: 'Delivered', value: formatDate(d.deliveredAt), icon: Truck }] : []),
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Icon size={13} /> {label}
                </div>
                <span className="text-sm text-gray-300">{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Rejection reason */}
          {d.status === 'rejected' && d.rejectionReason && (
            <motion.div
              className="glass-card border-red-500/20 bg-red-500/5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Rejection Reason</p>
                  <p className="text-sm text-red-400/80 mt-1">{d.rejectionReason}</p>
                </div>
              </div>
              <Link
                to={`/donor/donations/${id}/edit`}
                className="btn-secondary mt-4 w-full justify-center text-sm py-2"
              >
                <Pencil size={14} /> Edit & Resubmit
              </Link>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Quick Actions
            </h3>
            <div className="space-y-2">
              <Link to="/donor/donations" className="btn-ghost w-full justify-start text-sm py-2">
                <Package size={15} /> All Donations
              </Link>
              <Link to="/donor/donations/new" className="btn-ghost w-full justify-start text-sm py-2">
                <Star size={15} /> Add Another
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AnimatePresence>
        {showDelete && (
          <DeleteDialog
            title={d.title}
            onCancel={() => setShowDelete(false)}
            onConfirm={() => deleteMutation.mutate()}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
