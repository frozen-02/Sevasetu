import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Gift, Clock, CheckCircle, Truck, Star, Plus, ArrowRight,
  TrendingUp, Package, AlertCircle, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

import useAuthStore from '../../store/authStore.js';
import { donationService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getStatusColor, getCategoryIcon,
  getCategoryColor, getApiError,
} from '../../utils/index.js';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, delay, trend }) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <div className="flex items-center justify-between">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <span className="text-xs text-green-400 flex items-center gap-1 font-medium">
          <TrendingUp size={12} /> {trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-3xl font-black text-white">{value ?? 0}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

// ─── Stat Skeleton ────────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="stat-card">
    <div className="skeleton h-10 w-10 rounded-xl" />
    <div className="space-y-2 mt-2">
      <div className="skeleton h-8 w-16" />
      <div className="skeleton h-4 w-24" />
    </div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const color = getStatusColor(status);
  return <span className={`badge-${color}`}>{status}</span>;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['myDonations'],
    queryFn: () => donationService.getMy({ limit: 100 }),
    onError: (err) => toast.error(getApiError(err)),
  });

  const donations = data?.data?.donations ?? [];

  // Compute stats
  const stats = {
    total: donations.length,
    pending: donations.filter((d) => d.status === 'pending').length,
    approved: donations.filter((d) => d.status === 'approved').length,
    delivered: donations.filter((d) => d.status === 'delivered').length,
    matched: donations.filter((d) => d.status === 'matched').length,
  };

  const impactScore = stats.delivered * 10 + stats.matched * 5 + stats.approved * 2;
  const recentDonations = [...donations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-black">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your donations.</p>
        </div>
        <Link to="/donor/donations/new" className="btn-primary shrink-0">
          <Plus size={18} /> Add Donation
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Gift} label="Total Donations" value={stats.total} color="bg-primary-500/20 text-primary-400" delay={0} />
            <StatCard icon={Clock} label="Pending Review" value={stats.pending} color="bg-yellow-500/20 text-yellow-400" delay={0.08} />
            <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="bg-green-500/20 text-green-400" delay={0.16} />
            <StatCard icon={Truck} label="Delivered" value={stats.delivered} color="bg-teal-500/20 text-teal-400" delay={0.24} trend={stats.delivered > 0 ? 12 : undefined} />
            <StatCard icon={Star} label="Impact Score" value={impactScore} color="bg-accent-500/20 text-accent-400" delay={0.32} />
          </>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="glass-card flex items-center gap-3 text-red-400 border-red-500/20">
          <AlertCircle size={20} />
          <p>{getApiError(error)}</p>
        </div>
      )}

      {/* Recent Donations + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Donations Table */}
        <motion.div
          className="lg:col-span-2 glass-card !p-0 overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package size={18} className="text-primary-400" /> Recent Donations
            </h2>
            <Link to="/donor/donations" className="btn-ghost text-sm py-1.5 px-3">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="skeleton h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentDonations.length === 0 ? (
            <div className="empty-state py-16">
              <Gift size={40} className="text-gray-700" />
              <p className="text-gray-500">No donations yet.</p>
              <Link to="/donor/donations/new" className="btn-primary text-sm">
                <Plus size={16} /> Add Your First Donation
              </Link>
            </div>
          ) : (
            <motion.div
              className="divide-y divide-gray-800/60"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {recentDonations.map((donation) => (
                <motion.div
                  key={donation._id}
                  variants={rowVariants}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/donor/donations/${donation._id}`)}
                >
                  {/* Thumbnail / Icon */}
                  <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-gray-800/60 flex items-center justify-center text-xl">
                    {donation.images?.[0] ? (
                      <img
                        src={donation.images[0]}
                        alt={donation.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getCategoryIcon(donation.category)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                      {donation.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {donation.category} · {formatRelativeTime(donation.createdAt)}
                    </p>
                  </div>

                  {/* Status */}
                  <StatusBadge status={donation.status} />

                  <Eye size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions & Summary */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {/* Quick Actions */}
          <div className="glass-card">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/donor/donations/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-primary-600/10 border border-primary-500/20 hover:bg-primary-600/20 transition-all group"
              >
                <div className="p-2 rounded-lg bg-primary-600/20 text-primary-400">
                  <Plus size={16} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-primary-300">Add Donation</p>
                  <p className="text-xs text-gray-500">List a new item to donate</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to="/donor/donations"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all group"
              >
                <div className="p-2 rounded-lg bg-gray-700/50 text-gray-300">
                  <Package size={16} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-200">My Donations</p>
                  <p className="text-xs text-gray-500">View & manage all donations</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to="/donor/analytics"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all group"
              >
                <div className="p-2 rounded-lg bg-teal-600/20 text-teal-400">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-200">Analytics</p>
                  <p className="text-xs text-gray-500">Your donation impact</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Summary by Status */}
          <div className="glass-card">
            <h2 className="text-base font-bold mb-3 text-gray-300">Donation Summary</h2>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Pending', value: stats.pending, cls: 'badge-warning' },
                  { label: 'Approved', value: stats.approved, cls: 'badge-success' },
                  { label: 'Matched', value: stats.matched, cls: 'badge-primary' },
                  { label: 'Delivered', value: stats.delivered, cls: 'badge-teal' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={cls}>{label}</span>
                    <span className="font-bold text-gray-200">{value}</span>
                  </div>
                ))}
                <div className="divider pt-2 mt-1">
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-sm text-gray-400 font-medium">Total</span>
                    <span className="font-black text-white text-lg">{stats.total}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Impact Banner */}
          {!isLoading && impactScore > 0 && (
            <motion.div
              className="glass-card bg-gradient-to-br from-primary-600/10 to-accent-600/10 border-primary-500/20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent-500/20 text-accent-400">
                  <Star size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Your Impact Score</p>
                  <p className="text-2xl font-black gradient-text">{impactScore}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Score based on {stats.delivered} deliveries, {stats.matched} matches, and {stats.approved} approvals.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
