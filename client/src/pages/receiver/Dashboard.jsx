import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle,
  PackageCheck,
  ListFilter,
  ArrowRight,
  AlertCircle,
  Search,
} from 'lucide-react';
import { requestService } from '../../services/index.js';
import { formatDate, getStatusColor, getApiError } from '../../utils/index.js';

// ─── Skeleton ────────────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="stat-card">
    <div className="skeleton h-4 w-24 mb-2" />
    <div className="skeleton h-8 w-16" />
    <div className="skeleton h-3 w-32 mt-1" />
  </div>
);

const RowSkeleton = () => (
  <tr>
    {[1, 2, 3, 4, 5].map((i) => (
      <td key={i} className="px-4 py-3">
        <div className="skeleton h-4 w-full rounded" />
      </td>
    ))}
  </tr>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="stat-card"
  >
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-400 font-medium">{label}</p>
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-3xl font-bold text-white mt-1">{value ?? 0}</p>
  </motion.div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const color = getStatusColor(status);
  return (
    <span className={`badge-${color}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReceiverDashboard = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receiver-requests-all'],
    queryFn: async () => {
      const res = await requestService.getAll({ limit: 50 });
      return res.data;
    },
  });

  const requests = data?.requests || [];

  // Compute stats
  const stats = {
    total: requests.length,
    active: requests.filter((r) => ['pending', 'approved'].includes(r.status)).length,
    approved: requests.filter((r) => r.status === 'approved').length,
    delivered: requests.filter((r) => r.status === 'delivered').length,
  };

  const recent = [...requests]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            Receiver <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track your donation requests and items received.
          </p>
        </div>
        <Link to="/receiver/browse" className="btn-primary self-start sm:self-auto">
          <Search className="w-4 h-4" />
          Browse Donations
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Active Requests"
              value={stats.active}
              icon={ClipboardList}
              color="bg-primary-500/20 text-primary-400"
              delay={0}
            />
            <StatCard
              label="Approved Requests"
              value={stats.approved}
              icon={CheckCircle}
              color="bg-green-500/20 text-green-400"
              delay={0.05}
            />
            <StatCard
              label="Received Items"
              value={stats.delivered}
              icon={PackageCheck}
              color="bg-teal-500/20 text-teal-400"
              delay={0.1}
            />
            <StatCard
              label="Total Requests"
              value={stats.total}
              icon={ListFilter}
              color="bg-accent-500/20 text-accent-400"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="glass-card flex items-center gap-3 text-red-400 border-red-500/30">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{getApiError(error)}</p>
        </div>
      )}

      {/* Recent Requests Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card !p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80">
          <h2 className="text-lg font-semibold text-white">Recent Requests</h2>
          <Link
            to="/receiver/requests"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  {['Donation', 'Category', 'Urgency', 'Status', 'Date'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : recent.length === 0 ? (
          <div className="empty-state py-12">
            <PackageCheck className="w-12 h-12 text-gray-700" />
            <p className="text-base font-medium text-gray-500">No requests yet</p>
            <Link to="/receiver/browse" className="btn-primary mt-2">
              <Search className="w-4 h-4" />
              Browse Donations
            </Link>
          </div>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Donation</th>
                  <th>Category</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((req) => (
                  <tr key={req._id}>
                    <td className="font-medium text-gray-200 max-w-[180px] truncate">
                      {req.donation?.title || '—'}
                    </td>
                    <td>
                      <span className="text-gray-400 text-sm">
                        {req.donation?.category || '—'}
                      </span>
                    </td>
                    <td>
                      {req.urgencyLevel ? (
                        <span
                          className={`badge ${
                            req.urgencyLevel === 'critical'
                              ? 'badge-danger'
                              : req.urgencyLevel === 'high'
                              ? 'badge-warning'
                              : req.urgencyLevel === 'medium'
                              ? 'badge-primary'
                              : 'badge-gray'
                          }`}
                        >
                          {req.urgencyLevel}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="text-gray-500 text-sm whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            to="/receiver/browse"
            className="glass-card flex items-center gap-4 cursor-pointer group !p-5"
          >
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400 group-hover:bg-primary-500/30 transition-colors">
              <Search className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Browse Donations</p>
              <p className="text-sm text-gray-400">Find items available near you</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Link
            to="/receiver/requests"
            className="glass-card flex items-center gap-4 cursor-pointer group !p-5"
          >
            <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 group-hover:bg-teal-500/30 transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">My Requests</p>
              <p className="text-sm text-gray-400">Track all your donation requests</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-teal-400 transition-colors" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ReceiverDashboard;
