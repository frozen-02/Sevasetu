import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Gift, CheckCircle, Truck, Users, Star, BarChart3,
  TrendingUp, TrendingDown, Minus, Eye, FileText,
  AlertCircle, Package, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

import { analyticsService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';
import {
  getCategoryIcon, getCategoryColor, formatNumber, getApiError,
} from '../../utils/index.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#10b981', '#f97316', '#ec4899',
];

const STATUS_COLORS = {
  pending:   '#f59e0b',
  approved:  '#10b981',
  rejected:  '#ef4444',
  matched:   '#6366f1',
  delivered: '#14b8a6',
  draft:     '#6b7280',
  expired:   '#6b7280',
  cancelled: '#6b7280',
};

const STATUS_LABELS = {
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  matched:   'Matched',
  delivered: 'Delivered',
  draft:     'Draft',
  expired:   'Expired',
  cancelled: 'Cancelled',
};

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card !p-3 text-xs min-w-[140px] shadow-2xl">
      {label && <p className="font-semibold text-gray-300 mb-2">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-400 capitalize">{entry.name}</span>
          </span>
          <span className="font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Skeleton Cards ───────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="stat-card">
    <div className="skeleton h-4 w-28 rounded mb-3" />
    <div className="skeleton h-8 w-16 rounded mb-1" />
    <div className="skeleton h-3 w-20 rounded" />
  </div>
);

const ChartSkeleton = ({ height = 'h-64' }) => (
  <div className={`glass-card`}>
    <div className="skeleton h-5 w-40 rounded mb-4" />
    <div className={`skeleton ${height} w-full rounded-xl`} />
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg, suffix = '', delta, delay = 0 }) => (
  <motion.div variants={itemVariants} className="stat-card group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-white">
          {formatNumber(value ?? 0)}{suffix}
        </p>
        {typeof delta !== 'undefined' && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
            delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {delta > 0 ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(delta)}% vs last period
          </div>
        )}
      </div>
      <div className={`p-2.5 rounded-xl ${bg} transition-transform group-hover:scale-110`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </motion.div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color = 'text-indigo-400', subtitle }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5">
      <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// ─── Category legend row ──────────────────────────────────────────────────────
const CategoryRow = ({ item, total, index }) => {
  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
  const color = CHART_COLORS[index % CHART_COLORS.length];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-xl w-6 flex-shrink-0">{getCategoryIcon(item.category)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-200 font-medium">{item.category}</span>
          <span className="text-xs font-bold text-white">{item.count} <span className="text-gray-500 font-normal">({pct}%)</span></span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, delay: index * 0.07 }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChart = ({ label = 'No data yet' }) => (
  <div className="flex flex-col items-center justify-center h-52 gap-3 text-gray-600">
    <BarChart3 size={36} className="text-gray-700" />
    <p className="text-sm">{label}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DonorAnalytics() {
  const { user, profile } = useAuthStore();

  // ── Donor-specific breakdown from dedicated endpoint
  const {
    data: donorData,
    isLoading: donorLoading,
    isError: donorError,
    error: donorErr,
  } = useQuery({
    queryKey: ['donor-analytics', user?._id],
    queryFn: () => analyticsService.getDonorAnalytics().then(r => r.data),
    enabled: !!user?._id,
    staleTime: 1000 * 60 * 5,
  });

  // ── Platform-level impact for context / comparison
  const { data: impactData, isLoading: impactLoading } = useQuery({
    queryKey: ['analytics-impact'],
    queryFn: () => analyticsService.getImpact().then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = donorLoading || impactLoading;

  // ── Computed values from response
  const monthlyDonations = donorData?.monthlyDonations ?? [];
  const categoryBreakdown = donorData?.categoryBreakdown ?? [];
  const statusBreakdown   = donorData?.statusBreakdown   ?? [];
  const engagement        = donorData?.engagement        ?? { totalViews: 0, totalRequests: 0 };

  // Profile stats (from persisted store, no extra fetch)
  const totalDonations = profile?.totalDonations ?? 0;
  const totalApproved  = profile?.totalApproved  ?? 0;
  const totalDelivered = profile?.totalDelivered ?? 0;
  const impactScore    = profile?.impactScore    ?? 0;

  // Derived counts from status breakdown
  const deliveredCount  = statusBreakdown.find(s => s.status === 'delivered')?.count  ?? totalDelivered;
  const pendingCount    = statusBreakdown.find(s => s.status === 'pending')?.count    ?? 0;
  const approvedCount   = statusBreakdown.find(s => s.status === 'approved')?.count   ?? totalApproved;
  const rejectedCount   = statusBreakdown.find(s => s.status === 'rejected')?.count   ?? 0;
  const matchedCount    = statusBreakdown.find(s => s.status === 'matched')?.count    ?? 0;
  const grandTotal      = statusBreakdown.reduce((acc, s) => acc + s.count, 0) || totalDonations;
  const successRate     = grandTotal > 0 ? Math.round((deliveredCount / grandTotal) * 100) : 0;
  const categoryCount   = categoryBreakdown.length;
  const totalCategoryItems = categoryBreakdown.reduce((acc, c) => acc + c.count, 0);

  // ── Pie data for status chart
  const statusPieData = statusBreakdown
    .filter(s => s.count > 0)
    .map(s => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
      color: STATUS_COLORS[s.status] || '#6b7280',
    }));

  // ── Success rate trend (derived from monthly — delivered / total ratio)
  const successTrendData = monthlyDonations.map(m => ({
    month: m.month,
    rate: m.count > 0 ? Math.round((m.delivered ?? 0) / m.count * 100) : 0,
    donations: m.count,
  }));

  // ── Activity timeline — last 5 months of donation activity
  const activityData = [...monthlyDonations].slice(-6);

  // ─── Error State ────────────────────────────────────────────────────────────
  if (donorError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-2xl bg-red-500/10">
          <AlertCircle size={40} className="text-red-400" />
        </div>
        <p className="text-gray-300 text-lg font-semibold">Failed to load analytics</p>
        <p className="text-gray-500 text-sm">{getApiError(donorErr)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            My <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track the impact of your donations · Last 6 months
          </p>
        </div>
        {!isLoading && grandTotal > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold self-start sm:self-auto">
            <TrendingUp size={15} />
            {successRate}% Success Rate
          </div>
        )}
      </motion.div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          <StatCard
            label="Total Donations"
            value={grandTotal || totalDonations}
            icon={Gift}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            icon={CheckCircle}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <StatCard
            label="Delivered"
            value={deliveredCount}
            icon={Truck}
            color="text-teal-400"
            bg="bg-teal-500/10"
          />
          <StatCard
            label="People Helped"
            value={impactData?.impact?.totalBeneficiaries ?? 0}
            icon={Users}
            color="text-cyan-400"
            bg="bg-cyan-500/10"
          />
          <StatCard
            label="Impact Score"
            value={impactScore}
            icon={Star}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <StatCard
            label="Categories"
            value={categoryCount}
            icon={Layers}
            color="text-purple-400"
            bg="bg-purple-500/10"
          />
        </motion.div>
      )}

      {/* ── Engagement Row ───────────────────────────────────────────────── */}
      {!isLoading && (engagement.totalViews > 0 || engagement.totalRequests > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { icon: Eye,      label: 'Total Views',       value: engagement.totalViews,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { icon: FileText, label: 'Requests Received', value: engagement.totalRequests, color: 'text-pink-400',   bg: 'bg-pink-500/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="glass-card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatNumber(value)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Charts Row 1: Monthly Trend + Status Distribution ────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Monthly Donation Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card lg:col-span-2"
        >
          {isLoading ? (
            <>
              <div className="skeleton h-5 w-48 rounded mb-4" />
              <div className="skeleton h-64 w-full rounded-xl" />
            </>
          ) : (
            <>
              <SectionHeader
                icon={TrendingUp}
                title="Monthly Donations"
                subtitle="Contribution trend over the last 6 months"
                color="text-indigo-400"
              />
              {monthlyDonations.length === 0 ? (
                <EmptyChart label="No monthly data available" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyDonations} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Donations"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#donGrad)"
                      dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#1e1b4b' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </motion.div>

        {/* Status Distribution (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card"
        >
          {isLoading ? (
            <>
              <div className="skeleton h-5 w-40 rounded mb-4" />
              <div className="skeleton h-52 w-full rounded-xl" />
            </>
          ) : (
            <>
              <SectionHeader
                icon={Package}
                title="Status Breakdown"
                subtitle="Distribution by current status"
                color="text-teal-400"
              />
              {statusPieData.length === 0 ? (
                <EmptyChart label="No status data" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [v, n]}
                        contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '12px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        itemStyle={{ color: '#9ca3af' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
                    {statusPieData.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-400 truncate">{s.name}</span>
                        <span className="text-xs font-bold text-white ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ── Charts Row 2: Category Breakdown + Success Rate ──────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          {isLoading ? (
            <>
              <div className="skeleton h-5 w-44 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
              </div>
            </>
          ) : (
            <>
              <SectionHeader
                icon={BarChart3}
                title="Category Breakdown"
                subtitle={`${categoryCount} categor${categoryCount !== 1 ? 'ies' : 'y'} donated`}
                color="text-purple-400"
              />
              {categoryBreakdown.length === 0 ? (
                <EmptyChart label="No category data yet" />
              ) : (
                <div className="space-y-0">
                  {categoryBreakdown
                    .sort((a, b) => b.count - a.count)
                    .map((item, i) => (
                      <CategoryRow
                        key={item.category}
                        item={item}
                        total={totalCategoryItems}
                        index={i}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Success Rate Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card"
        >
          {isLoading ? (
            <>
              <div className="skeleton h-5 w-44 rounded mb-4" />
              <div className="skeleton h-64 w-full rounded-xl" />
            </>
          ) : (
            <>
              <SectionHeader
                icon={TrendingUp}
                title="Success Rate Trend"
                subtitle="Delivery rate (%) per month"
                color="text-green-400"
              />
              {successTrendData.length === 0 ? (
                <EmptyChart label="No trend data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={successTrendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(v) => [`${v}%`, 'Success Rate']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Rate"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#064e3b' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ── Charts Row 3: Activity Bar Chart + Summary ────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* People Helped / Activity timeline bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card lg:col-span-2"
        >
          {isLoading ? (
            <>
              <div className="skeleton h-5 w-52 rounded mb-4" />
              <div className="skeleton h-56 w-full rounded-xl" />
            </>
          ) : (
            <>
              <SectionHeader
                icon={Users}
                title="Recent Activity Timeline"
                subtitle="Monthly donation volumes"
                color="text-cyan-400"
              />
              {activityData.length === 0 ? (
                <EmptyChart label="No activity data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Donations" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </motion.div>

        {/* Impact Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card bg-gradient-to-br from-indigo-600/5 to-teal-600/5 border-indigo-500/15 flex flex-col justify-between"
        >
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-5 w-36 rounded" />
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : (
            <>
              <SectionHeader
                icon={Star}
                title="Your Impact"
                subtitle="Platform-wide contribution"
                color="text-amber-400"
              />
              <div className="space-y-3">
                {[
                  {
                    label: 'Total Donated',
                    value: formatNumber(grandTotal || totalDonations),
                    sub: 'items listed',
                    color: 'text-indigo-400',
                    bg: 'bg-indigo-500/15',
                  },
                  {
                    label: 'Delivered',
                    value: formatNumber(deliveredCount),
                    sub: `${successRate}% success`,
                    color: 'text-teal-400',
                    bg: 'bg-teal-500/15',
                  },
                  {
                    label: 'Pending Review',
                    value: formatNumber(pendingCount),
                    sub: 'awaiting approval',
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/15',
                  },
                  {
                    label: 'Rejected',
                    value: formatNumber(rejectedCount),
                    sub: 'not approved',
                    color: 'text-red-400',
                    bg: 'bg-red-500/15',
                  },
                ].map(({ label, value, sub, color, bg }) => (
                  <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${bg} border border-white/5`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-xl font-black ${color} leading-tight`}>{value}</p>
                    </div>
                    <p className="text-xs text-gray-600 shrink-0">{sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Summary Banner ────────────────────────────────────────── */}
      {!isLoading && grandTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-teal-600/20 border border-indigo-500/20">
                <TrendingUp size={28} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Your Donation Journey</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  You have donated across <span className="text-white font-semibold">{categoryCount}</span> categor{categoryCount !== 1 ? 'ies' : 'y'}.
                  {' '}<span className="text-teal-400 font-semibold">{deliveredCount}</span> items successfully delivered.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/8">
                <p className="text-2xl font-black text-white">{successRate}%</p>
                <p className="text-xs text-gray-500">Success Rate</p>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/8">
                <p className="text-2xl font-black text-white">{impactScore}</p>
                <p className="text-xs text-gray-500">Impact Score</p>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/8">
                <p className="text-2xl font-black text-amber-400">{engagement.totalRequests}</p>
                <p className="text-xs text-gray-500">Requests</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Empty State (no donations at all) ───────────────────────────── */}
      {!isLoading && grandTotal === 0 && totalDonations === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center py-16"
        >
          <div className="p-5 rounded-3xl bg-indigo-500/10 w-fit mx-auto mb-5">
            <Gift size={40} className="text-indigo-400" />
          </div>
          <p className="text-white font-bold text-xl mb-2">No Donations Yet</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Start donating to see your analytics, charts, and impact metrics here.
          </p>
        </motion.div>
      )}
    </div>
  );
}
