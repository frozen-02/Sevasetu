import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Gift, FileText, Shuffle, Truck, TrendingUp, TrendingDown,
  Minus, BarChart3, PieChartIcon, MapPin, AlertCircle, Activity,
  Star, CheckCircle, Clock, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

import { analyticsService, adminService } from '../../services/index.js';
import { getCategoryIcon, formatNumber, getApiError } from '../../utils/index.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#10b981', '#f97316', '#ec4899', '#a78bfa',
];

const MONTHS_RANGE_OPTIONS = [
  { label: '3 Months',  value: 3  },
  { label: '6 Months',  value: 6  },
  { label: '12 Months', value: 12 },
];

// ─── Motion Variants ──────────────────────────────────────────────────────────
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
    <div className="glass-card !p-3 text-xs min-w-[150px] shadow-2xl border border-white/10">
      {label && <p className="font-semibold text-gray-300 mb-2">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-400 capitalize">{entry.name}</span>
          </span>
          <span className="font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Skeleton Components ──────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="stat-card">
    <div className="skeleton h-3.5 w-24 rounded mb-3" />
    <div className="skeleton h-8 w-16 rounded mb-1" />
    <div className="skeleton h-3 w-20 rounded" />
  </div>
);

const ChartSkeleton = ({ height = 'h-64' }) => (
  <div className="glass-card">
    <div className="skeleton h-5 w-48 rounded mb-1" />
    <div className="skeleton h-3.5 w-32 rounded mb-5" />
    <div className={`skeleton ${height} w-full rounded-xl`} />
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg, sub, trend }) => (
  <motion.div variants={itemVariants} className="stat-card group">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-white">{formatNumber(value ?? 0)}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        {typeof trend === 'number' && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
            trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(trend)}% vs prev period
          </div>
        )}
      </div>
      <div className={`p-2.5 rounded-xl ${bg} transition-transform group-hover:scale-110 flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </motion.div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'text-indigo-400' }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2.5">
      <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
        <Icon size={15} />
      </div>
      <h2 className="text-sm font-bold text-white">{title}</h2>
    </div>
    {subtitle && <p className="text-xs text-gray-500 mt-1 pl-9">{subtitle}</p>}
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyChart = ({ label = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center h-52 gap-3 text-gray-600">
    <BarChart3 size={36} className="text-gray-700" />
    <p className="text-sm">{label}</p>
  </div>
);

// ─── Category Bar Legend ──────────────────────────────────────────────────────
const CategoryBarRow = ({ item, maxCount, index }) => {
  const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
  const color = CHART_COLORS[index % CHART_COLORS.length];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-lg w-7 flex-shrink-0">{getCategoryIcon(item.category)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-200 font-medium">{item.category}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{item.delivered ?? 0} delivered</span>
            <span className="text-xs font-bold text-white">{item.count}</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, delay: index * 0.06 }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Tab Selector ─────────────────────────────────────────────────────────────
const TabBar = ({ options, active, onChange }) => (
  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active === opt.value
            ? 'bg-indigo-600 text-white shadow'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ─── Rate Gauge ───────────────────────────────────────────────────────────────
const RateGauge = ({ label, value, color, icon: Icon }) => (
  <div className="flex flex-col items-center gap-3 p-5 bg-white/3 rounded-2xl border border-white/8">
    <div className={`p-3 rounded-2xl bg-white/5 ${color}`}>
      <Icon size={22} />
    </div>
    <div className="text-center">
      <p className="text-3xl font-black text-white">{value}%</p>
      <p className="text-xs text-gray-500 mt-1 max-w-[100px] leading-snug">{label}</p>
    </div>
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${
          color.includes('green') ? 'bg-green-500' :
          color.includes('teal')  ? 'bg-teal-500'  :
          color.includes('amber') ? 'bg-amber-500' : 'bg-indigo-500'
        }`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.9, delay: 0.2 }}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [monthsRange, setMonthsRange] = useState(6);

  // ── Query: Admin Dashboard overview stats
  const {
    data: dashData,
    isLoading: dashLoading,
    isError: dashError,
    error: dashErr,
  } = useQuery({
    queryKey: ['admin-dashboard-analytics'],
    queryFn: () => adminService.getDashboard().then(r => r.data?.data ?? r.data),
    staleTime: 1000 * 60 * 3,
  });

  // ── Query: Trends (time-series for line/area charts)
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends', monthsRange],
    queryFn: () => analyticsService.getTrends({ months: monthsRange }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  // ── Query: Category distribution
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: () => analyticsService.getCategories().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // ── Query: State distribution
  const { data: stateData, isLoading: stateLoading } = useQuery({
    queryKey: ['analytics-states'],
    queryFn: () => analyticsService.getStates().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  });

  // ── Query: Impact metrics
  const { data: impactData, isLoading: impactLoading } = useQuery({
    queryKey: ['analytics-impact'],
    queryFn: () => analyticsService.getImpact().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = dashLoading || trendsLoading || catLoading || stateLoading || impactLoading;

  // ── Pull data from queries
  const stats        = dashData?.stats ?? {};
  const usersStats   = stats.users        ?? {};
  const donStats     = stats.donations    ?? {};
  const reqStats     = stats.requests     ?? {};
  const matchStats   = stats.matches      ?? {};
  const successRate  = stats.successRate  ?? 0;

  const donationTrends  = trendsData?.donations  ?? [];
  const requestTrends   = trendsData?.requests   ?? [];
  const userGrowth      = trendsData?.userGrowth ?? [];

  // Merge trends into unified time-series
  const mergedTrends = donationTrends.map((d, i) => ({
    month:     d.month,
    Donations: d.donations ?? 0,
    Delivered: d.delivered ?? 0,
    Requests:  requestTrends[i]?.requests ?? 0,
  }));

  const donByCategory = catData?.donationsByCategory ?? [];
  const reqByCategory = catData?.requestsByCategory  ?? [];
  const states        = (stateData?.states ?? []).slice(0, 10);
  const impact        = impactData?.impact           ?? {};
  const categoryDemand = impactData?.categoryDemand  ?? [];

  const approvalRate  = donStats.total > 0
    ? Math.round(((donStats.approved ?? 0) / donStats.total) * 100) : 0;
  const matchingRate  = matchStats.total > 0
    ? Math.round(((matchStats.delivered ?? 0) / matchStats.total) * 100) : 0;
  const activeUserPct = usersStats.total > 0
    ? Math.round(((usersStats.active ?? 0) / usersStats.total) * 100) : 0;

  // Pie: User roles
  const userRolePie = [
    { name: 'Donors',    value: usersStats.donors    ?? 0, color: '#6366f1' },
    { name: 'Receivers', value: usersStats.receivers ?? 0, color: '#14b8a6' },
  ].filter(d => d.value > 0);

  // Pie: Donation status distribution
  const donStatusPie = [
    { name: 'Pending',   value: donStats.pending   ?? 0, color: '#f59e0b' },
    { name: 'Approved',  value: donStats.approved  ?? 0, color: '#10b981' },
    { name: 'Delivered', value: donStats.delivered ?? 0, color: '#14b8a6' },
    { name: 'Other',     value: Math.max(0, (donStats.total ?? 0) - (donStats.pending ?? 0) - (donStats.approved ?? 0) - (donStats.delivered ?? 0)), color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Category demand trend data
  const demandData = categoryDemand.map(d => ({
    category: d.category,
    trend:    d.trend ?? 0,
    label:    d.trendLabel ?? 'stable',
  }));

  // ─── Error State ────────────────────────────────────────────────────────────
  if (dashError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-2xl bg-red-500/10">
          <AlertCircle size={40} className="text-red-400" />
        </div>
        <p className="text-gray-300 text-lg font-semibold">Failed to load analytics</p>
        <p className="text-gray-500 text-sm">{getApiError(dashErr)}</p>
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
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            Platform <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Comprehensive data insights across all platform activity
          </p>
        </div>
        <TabBar
          options={MONTHS_RANGE_OPTIONS}
          active={monthsRange}
          onChange={setMonthsRange}
        />
      </motion.div>

      {/* ── 8 Stat Cards ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Users"
            value={usersStats.total}
            icon={Users}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
            sub={`${usersStats.active ?? 0} active`}
          />
          <StatCard
            label="Total Donations"
            value={donStats.total}
            icon={Gift}
            color="text-purple-400"
            bg="bg-purple-500/10"
            sub={`${donStats.pending ?? 0} pending`}
          />
          <StatCard
            label="Total Requests"
            value={reqStats.total}
            icon={FileText}
            color="text-cyan-400"
            bg="bg-cyan-500/10"
            sub={`${reqStats.pending ?? 0} pending`}
          />
          <StatCard
            label="Total Matches"
            value={matchStats.total}
            icon={Shuffle}
            color="text-pink-400"
            bg="bg-pink-500/10"
            sub={`${matchStats.delivered ?? 0} delivered`}
          />
          <StatCard
            label="Delivered Items"
            value={donStats.delivered}
            icon={Truck}
            color="text-teal-400"
            bg="bg-teal-500/10"
          />
          <StatCard
            label="Approval Rate"
            value={`${approvalRate}%`}
            icon={CheckCircle}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <StatCard
            label="Active Users"
            value={usersStats.active}
            icon={Activity}
            color="text-blue-400"
            bg="bg-blue-500/10"
            sub={`${activeUserPct}% of total`}
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            icon={TrendingUp}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
        </motion.div>
      )}

      {/* ── Rate Gauges ──────────────────────────────────────────────────── */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          <SectionHeader
            icon={Zap}
            title="Platform Performance Rates"
            subtitle="Key conversion and success metrics"
            color="text-amber-400"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <RateGauge label="Donation Approval Rate"  value={approvalRate}  color="text-green-400" icon={CheckCircle} />
            <RateGauge label="Matching Success Rate"   value={matchingRate}  color="text-teal-400"  icon={Shuffle}     />
            <RateGauge label="Overall Success Rate"    value={successRate}   color="text-indigo-400" icon={TrendingUp}  />
            <RateGauge label="User Active Rate"        value={activeUserPct} color="text-amber-400" icon={Users}       />
          </div>
        </motion.div>
      )}

      {/* ── Row 1: Unified Trend Chart ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
      >
        {isLoading ? (
          <>
            <div className="skeleton h-5 w-56 rounded mb-1" />
            <div className="skeleton h-3.5 w-40 rounded mb-5" />
            <div className="skeleton h-72 w-full rounded-xl" />
          </>
        ) : (
          <>
            <SectionHeader
              icon={TrendingUp}
              title="Monthly Donations & Requests Trend"
              subtitle={`Platform activity over the last ${monthsRange} months`}
              color="text-indigo-400"
            />
            {mergedTrends.length === 0 ? (
              <EmptyChart label="No trend data available for this range" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={mergedTrends} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                    formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
                  />
                  <Area type="monotone" dataKey="Donations" stroke="#6366f1" strokeWidth={2.5} fill="url(#donGrad)"
                    dot={{ fill: '#6366f1', r: 3.5, strokeWidth: 2, stroke: '#1e1b4b' }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="Requests"  stroke="#14b8a6" strokeWidth={2.5} fill="url(#reqGrad)"
                    dot={{ fill: '#14b8a6', r: 3.5, strokeWidth: 2, stroke: '#042f2e' }} activeDot={{ r: 5 }} />
                  <Bar dataKey="Delivered" fill="#10b981" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </motion.div>

      {/* ── Row 2: User Growth + Donor/Receiver Pie ──────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* User Growth Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card lg:col-span-2"
        >
          {isLoading ? (
            <ChartSkeleton height="h-56" />
          ) : (
            <>
              <SectionHeader
                icon={Users}
                title="User Growth Trend"
                subtitle="New registrations by month"
                color="text-purple-400"
              />
              {userGrowth.length === 0 ? (
                <EmptyChart label="No user growth data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={userGrowth} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="donorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="receiverGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
                    />
                    <Area type="monotone" dataKey="donors"    name="Donors"    stroke="#6366f1" strokeWidth={2} fill="url(#donorGrad)"
                      dot={{ fill: '#6366f1', r: 3 }} />
                    <Area type="monotone" dataKey="receivers" name="Receivers" stroke="#14b8a6" strokeWidth={2} fill="url(#receiverGrad)"
                      dot={{ fill: '#14b8a6', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </motion.div>

        {/* User Role Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          {isLoading ? (
            <ChartSkeleton height="h-44" />
          ) : (
            <>
              <SectionHeader
                icon={PieChartIcon}
                title="User Distribution"
                subtitle="By role"
                color="text-teal-400"
              />
              {userRolePie.length === 0 ? (
                <EmptyChart label="No user data" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={userRolePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {userRolePie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#9ca3af' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {userRolePie.map((d, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-2 rounded-xl bg-white/4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-gray-300">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{formatNumber(d.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-xs text-gray-500">Total Users</span>
                      <span className="text-sm font-black text-white">{formatNumber(usersStats.total ?? 0)}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: Category Breakdown + Status Pie ───────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
        >
          {catLoading ? (
            <ChartSkeleton height="h-72" />
          ) : (
            <>
              <SectionHeader
                icon={BarChart3}
                title="Donation Category Distribution"
                subtitle="All-time volume by category"
                color="text-purple-400"
              />
              {donByCategory.length === 0 ? (
                <EmptyChart label="No category data" />
              ) : (
                <div className="space-y-0">
                  {donByCategory.map((item, i) => (
                    <CategoryBarRow
                      key={item.category}
                      item={item}
                      maxCount={donByCategory[0]?.count ?? 1}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Donation Status Pie + Bar combo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card"
        >
          {dashLoading ? (
            <ChartSkeleton height="h-72" />
          ) : (
            <>
              <SectionHeader
                icon={PieChartIcon}
                title="Donation Status Distribution"
                subtitle="Current status breakdown"
                color="text-amber-400"
              />
              {donStatusPie.length === 0 ? (
                <EmptyChart label="No donation status data" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={donStatusPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#374151', strokeWidth: 1 }}
                      >
                        {donStatusPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#9ca3af' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {donStatusPie.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-400 flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-white">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ── Row 4: State Distribution ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        {stateLoading ? (
          <ChartSkeleton height="h-64" />
        ) : (
          <>
            <SectionHeader
              icon={MapPin}
              title="State-wise Donation Distribution"
              subtitle="Top 10 states by total donations"
              color="text-cyan-400"
            />
            {states.length === 0 ? (
              <EmptyChart label="No state data available" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={states}
                  layout="vertical"
                  margin={{ top: 5, right: 30, bottom: 5, left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={75}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
                  />
                  <Bar dataKey="donations" name="Donations" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  <Bar dataKey="delivered" name="Delivered" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </motion.div>

      {/* ── Row 5: Category Demand + Impact Metrics ──────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Category Demand Trend (AI-predicted) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card"
        >
          {impactLoading ? (
            <ChartSkeleton height="h-52" />
          ) : (
            <>
              <SectionHeader
                icon={TrendingUp}
                title="Category Demand Trend"
                subtitle="AI-predicted demand change (%) vs. prior period"
                color="text-green-400"
              />
              {demandData.length === 0 ? (
                <EmptyChart label="No demand trend data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={demandData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(v) => [`${v}%`, 'Trend']}
                    />
                    <Bar
                      dataKey="trend"
                      name="Demand %"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    >
                      {demandData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.trend > 0 ? '#10b981' : entry.trend < 0 ? '#ef4444' : '#6b7280'}
                          opacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </motion.div>

        {/* Impact Metrics Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card bg-gradient-to-br from-indigo-600/5 to-teal-600/5 border-indigo-500/15"
        >
          {impactLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-5 w-40 rounded" />
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : (
            <>
              <SectionHeader
                icon={Star}
                title="Platform Impact Metrics"
                subtitle="All-time aggregated impact"
                color="text-amber-400"
              />
              <div className="space-y-3">
                {[
                  {
                    label:  'Total Delivered',
                    value:  formatNumber(impact.totalDelivered ?? 0),
                    sub:    'successful deliveries',
                    color:  'text-teal-400',
                    bg:     'bg-teal-500/15',
                  },
                  {
                    label:  'Total Beneficiaries',
                    value:  formatNumber(impact.totalBeneficiaries ?? 0),
                    sub:    'people helped',
                    color:  'text-cyan-400',
                    bg:     'bg-cyan-500/15',
                  },
                  {
                    label:  'Avg Match Score',
                    value:  `${impact.avgMatchScore ?? 0}/100`,
                    sub:    'AI compatibility score',
                    color:  'text-indigo-400',
                    bg:     'bg-indigo-500/15',
                  },
                  {
                    label:  'Avg Rating',
                    value:  `${impact.avgRating ?? 0} ★`,
                    sub:    `${formatNumber(impact.feedbackCount ?? 0)} reviews`,
                    color:  'text-amber-400',
                    bg:     'bg-amber-500/15',
                  },
                  {
                    label:  'Positive Reviews',
                    value:  formatNumber(impact.positiveFeedback ?? 0),
                    sub:    'rated 4+ stars',
                    color:  'text-green-400',
                    bg:     'bg-green-500/15',
                  },
                ].map(({ label, value, sub, color, bg }) => (
                  <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${bg} border border-white/5`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-xl font-black ${color} leading-tight`}>{value}</p>
                    </div>
                    <p className="text-xs text-gray-600 shrink-0 text-right leading-snug max-w-[80px]">{sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Summary Bar ────────────────────────────────────────────── */}
      {!isLoading && (usersStats.total ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-teal-600/20 border border-indigo-500/20">
                <Activity size={28} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Platform Health Summary</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  <span className="text-white font-semibold">{formatNumber(usersStats.total ?? 0)}</span> registered users ·{' '}
                  <span className="text-teal-400 font-semibold">{formatNumber(donStats.delivered ?? 0)}</span> deliveries completed ·{' '}
                  <span className="text-amber-400 font-semibold">{formatNumber(impact.totalBeneficiaries ?? 0)}</span> lives impacted
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {[
                { label: 'Approval',  value: `${approvalRate}%`, sub: 'rate'    },
                { label: 'Matching',  value: `${matchingRate}%`, sub: 'success' },
                { label: 'Delivery',  value: `${successRate}%`,  sub: 'rate'    },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/8">
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-[10px] text-gray-500">{label} {sub}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
