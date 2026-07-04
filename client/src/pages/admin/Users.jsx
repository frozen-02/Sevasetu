import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, Filter, ChevronLeft, ChevronRight, UserCheck,
  UserX, Shield, Users, ToggleLeft, ToggleRight, AlertCircle,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { userService } from '../../services/index.js';
import { formatDate, getInitials, getApiError } from '../../utils/index.js';

const ROLES = ['all', 'donor', 'receiver', 'admin'];
const PAGE_SIZE = 10;

function ConfirmModal({ open, user, onConfirm, onClose, isLoading }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2 }}
            className="glass-card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              {user?.isActive ? (
                <div className="p-2.5 bg-red-500/20 rounded-xl">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
              ) : (
                <div className="p-2.5 bg-green-500/20 rounded-xl">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
              )}
              <div>
                <h3 className="text-white font-semibold">
                  {user?.isActive ? 'Deactivate User' : 'Activate User'}
                </h3>
                <p className="text-gray-400 text-sm">{user?.name}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              {user?.isActive
                ? `Are you sure you want to deactivate ${user?.name}? They will be unable to log in until reactivated.`
                : `Are you sure you want to activate ${user?.name}? They will regain full access to the platform.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={onClose} disabled={isLoading}>Cancel</button>
              <button
                className={user?.isActive ? 'btn-danger' : 'btn-primary'}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : user?.isActive ? (
                  <>
                    <UserX className="w-4 h-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" /> Activate
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [isActive, setIsActive] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmUser, setConfirmUser] = useState(null);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(search && { search }),
    ...(role !== 'all' && { role }),
    ...(isActive !== 'all' && { isActive: isActive === 'active' }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => userService.getAll(queryParams).then((r) => r.data?.data ?? r.data),
    keepPreviousData: true,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => userService.toggleStatus(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      const wasActive = confirmUser?.isActive;
      toast.success(`User ${wasActive ? 'deactivated' : 'activated'} successfully`);
      setConfirmUser(null);
    },
    onError: (err) => {
      toast.error(getApiError(err));
    },
  });

  const users = data?.users ?? data ?? [];
  const total = data?.total ?? data?.totalCount ?? users.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleChange = (r) => {
    setRole(r);
    setPage(1);
  };

  const handleStatusChange = (s) => {
    setIsActive(s);
    setPage(1);
  };

  const roleColors = {
    admin: 'badge-danger',
    donor: 'badge-primary',
    receiver: 'badge-success',
  };

  const roleIcons = {
    admin: Shield,
    donor: Users,
    receiver: UserCheck,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold gradient-text">Users Management</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage platform users · {total > 0 ? `${total} total` : 'Loading…'}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Search by name or email…"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  role === r
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {['all', 'active', 'inactive'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  isActive === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-0 overflow-hidden"
      >
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-gray-300 font-medium">Failed to load users</p>
            <p className="text-gray-500 text-sm">{getApiError(error)}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                  : users.length === 0
                    ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state py-12">
                            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No users found</p>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : users.map((user) => {
                      const RoleIcon = roleIcons[user.role] ?? Users;
                      return (
                        <tr key={user._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                                {user.avatar
                                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                  : getInitials(user.name)}
                              </div>
                              <span className="font-medium text-white text-sm whitespace-nowrap">{user.name}</span>
                            </div>
                          </td>
                          <td className="text-gray-300 text-sm">{user.email}</td>
                          <td>
                            <span className={`badge ${roleColors[user.role] ?? 'badge-gray'} capitalize flex items-center gap-1 w-fit`}>
                              <RoleIcon className="w-3 h-3" />
                              {user.role}
                            </span>
                          </td>
                          <td>
                            {user.isVerified ? (
                              <span className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500 text-xs">
                                <XCircle className="w-3.5 h-3.5" /> Unverified
                              </span>
                            )}
                          </td>
                          <td>
                            {user.isActive ? (
                              <span className="badge badge-success">Active</span>
                            ) : (
                              <span className="badge badge-gray">Inactive</span>
                            )}
                          </td>
                          <td className="text-gray-400 text-sm whitespace-nowrap">{formatDate(user.createdAt)}</td>
                          <td className="text-right">
                            <button
                              onClick={() => setConfirmUser(user)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                user.isActive
                                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                  : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                              }`}
                            >
                              {user.isActive ? (
                                <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</>
                              ) : (
                                <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isError && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      page === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
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
      </motion.div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!confirmUser}
        user={confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={() => toggleMutation.mutate(confirmUser?._id)}
        isLoading={toggleMutation.isPending}
      />
    </div>
  );
}
