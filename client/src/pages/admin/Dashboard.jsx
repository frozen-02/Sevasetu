import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Gift, Clock, CheckCircle, FileText, Shuffle,
  Truck, TrendingUp, AlertCircle, Package, Star, Activity,
} from 'lucide-react';
import { adminService } from '../../services/index.js';
import { formatDate, formatRelativeTime, formatNumber, getInitials, getStatusColor } from '../../utils/index.js';

const STAT_CARDS = [
  { key: 'totalUsers',       label: 'Total Users',       icon: Users,       color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  { key: 'totalDonations',   label: 'Total Donations',   icon: Gift,        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  { key: 'pendingDonations', label: 'Pending Donations', icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
  { key: 'approvedDonations',label: 'Approved Donations',icon: CheckCircle, color: 'text-green-400',   bg: 'bg-green-500/10'  },
  { key: 'totalRequests',    label: 'Total Requests',    icon: FileText,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10'   },
  { key: 'successfulMatches',label: 'Successful Matches',icon: Shuffle,     color: 'text-pink-400',    bg: 'bg-pink-500/10'   },
  { key: 'deliveredItems',   label: 'Delivered Items',   icon: Truck,       color: 'text-teal-400',    bg: 'bg-teal-500/10'   },
  { key: 'successRate',      label: 'Success Rate',      icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', suffix: '%' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton h-4 w-28 rounded mb-3" />
      <div className="skeleton h-8 w-16 rounded mb-1" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

function StatCard({ stat, value, loading }) {
  const Icon = stat.icon;
  const displayValue = stat.suffix
    ? `${typeof value === 'number' ? value.toFixed(1) : '0'}${stat.suffix}`
    : formatNumber(value ?? 0);

  return (
    <motion.div variants={itemVariants} className="stat-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{stat.label}</p>
          {loading ? (
            <div className="skeleton h-8 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-white">{displayValue}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${stat.bg} transition-transform group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${stat.color}`} />
        </div>
      </div>
    </motion.div>
  );
}

function UserRow({ user, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-3 w-44 rounded" />
        </div>
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
    );
  }

  const initials = getInitials(user?.name);
  const roleColor = user?.role === 'admin' ? 'badge-danger' : user?.role === 'donor' ? 'badge-primary' : 'badge-success';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`badge ${roleColor} capitalize`}>{user?.role}</span>
        <span className="text-xs text-gray-500">{formatRelativeTime(user?.createdAt)}</span>
      </div>
    </div>
  );
}

function DonationRow({ donation, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="skeleton w-9 h-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-40 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    );
  }

  const statusColor = getStatusColor(donation?.status);
  const badgeClass = {
    primary: 'badge-primary', success: 'badge-success', warning: 'badge-warning',
    danger: 'badge-danger', gray: 'badge-gray', teal: 'badge-success',
  }[statusColor] || 'badge-gray';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {donation?.images?.[0] ? (
          <img src={donation.images[0]} alt={donation.title} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Package className="w-4 h-4 text-purple-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{donation?.title}</p>
        <p className="text-xs text-gray-400">{donation?.category} · {donation?.donor?.name || 'Unknown'}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`badge ${badgeClass} capitalize`}>{donation?.status}</span>
        <span className="text-xs text-gray-500">{formatRelativeTime(donation?.createdAt)}</span>
      </div>
    </div>
  );
}

function ActivityItem({ activity, loading }) {
  if (loading) {
    return (
      <div className="flex items-start gap-3 py-2.5">
        <div className="skeleton w-7 h-7 rounded-full mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-56 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
    );
  }

  const iconMap = {
    user_registered: { icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    donation_submitted: { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    donation_approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
    request_submitted: { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    match_created: { icon: Shuffle, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    item_delivered: { icon: Truck, color: 'text-teal-400', bg: 'bg-teal-500/20' },
    feedback_submitted: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  };

  const { icon: Icon, color, bg } = iconMap[activity?.type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/20' };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">{activity?.description}</p>
        <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(activity?.createdAt)}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard().then((r) => r.data?.data ?? r.data),
    staleTime: 1000 * 60 * 2,
  });

  const stats = data?.stats ?? {};
  const recentUsers = data?.recentUsers ?? [];
  const recentDonations = data?.recentDonations ?? [];
  const recentActivity = data?.recentActivity ?? [];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-300 text-lg font-medium">Failed to load dashboard</p>
        <p className="text-gray-500 text-sm">{error?.response?.data?.message || error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Overview of SEVASETU platform activity · {formatDate(new Date())}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {STAT_CARDS.map((stat) =>
          isLoading ? (
            <StatCardSkeleton key={stat.key} />
          ) : (
            <StatCard key={stat.key} stat={stat} value={stats[stat.key]} loading={isLoading} />
          )
        )}
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Recent Users
            </h2>
            <span className="text-xs text-gray-500">Last 5</span>
          </div>
          <div>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <UserRow key={i} loading />)
              : recentUsers.length > 0
                ? recentUsers.slice(0, 5).map((u) => <UserRow key={u._id} user={u} />)
                : (
                  <div className="empty-state py-8">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No users yet</p>
                  </div>
                )}
          </div>
        </motion.div>

        {/* Recent Donations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              Recent Donations
            </h2>
            <span className="text-xs text-gray-500">Last 5</span>
          </div>
          <div>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <DonationRow key={i} loading />)
              : recentDonations.length > 0
                ? recentDonations.slice(0, 5).map((d) => <DonationRow key={d._id} donation={d} />)
                : (
                  <div className="empty-state py-8">
                    <Gift className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No donations yet</p>
                  </div>
                )}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              Activity Feed
            </h2>
            <span className="text-xs text-gray-500">Latest</span>
          </div>
          <div>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ActivityItem key={i} loading />)
              : recentActivity.length > 0
                ? recentActivity.slice(0, 8).map((a, i) => <ActivityItem key={i} activity={a} />)
                : (
                  <div className="empty-state py-8">
                    <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  </div>
                )}
          </div>
        </motion.div>
      </div>

      {/* Summary Bar */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Platform Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Approval Rate (Donations)', value: stats.donationApprovalRate, suffix: '%', color: 'bg-indigo-500' },
              { label: 'Approval Rate (Requests)', value: stats.requestApprovalRate, suffix: '%', color: 'bg-purple-500' },
              { label: 'Avg Match Score', value: stats.avgMatchScore, suffix: '%', color: 'bg-teal-500' },
              { label: 'Avg Rating', value: stats.avgRating, suffix: '★', color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">{item.label}</p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold text-white">
                    {typeof item.value === 'number' ? item.value.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm text-gray-400 mb-0.5">{item.suffix}</span>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(item.value ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
