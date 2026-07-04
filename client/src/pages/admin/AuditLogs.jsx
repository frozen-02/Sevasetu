import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Filter, Download, Eye, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, X, Clock, User, Globe,
  Monitor, Tag, ChevronDown, ChevronUp, Calendar, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService } from '../../services/index.js';
import { formatDate, formatRelativeTime, getInitials, getApiError } from '../../utils/index.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const ALL_ACTIONS = [
  // Auth
  'user_registered', 'user_login', 'user_logout', 'password_reset',
  'email_verified', 'account_locked',
  // User
  'user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated',
  // Donations
  'donation_created', 'donation_updated', 'donation_deleted',
  'donation_approved', 'donation_rejected',
  // Requests
  'request_created', 'request_approved', 'request_rejected', 'request_cancelled',
  // Matches
  'match_created', 'match_accepted', 'match_rejected', 'item_delivered',
  // Feedback
  'feedback_created', 'feedback_hidden', 'feedback_deleted',
  // Admin
  'admin_action', 'report_generated', 'settings_changed',
];

const TARGET_MODELS = ['User', 'Donation', 'Request', 'Match', 'Feedback', 'Notification'];

// ─── Action display config ────────────────────────────────────────────────────
const ACTION_META = {
  user_registered:    { color: 'badge-primary',  label: 'Registered'       },
  user_login:         { color: 'badge-gray',      label: 'Login'            },
  user_logout:        { color: 'badge-gray',      label: 'Logout'           },
  password_reset:     { color: 'badge-warning',   label: 'Pwd Reset'        },
  email_verified:     { color: 'badge-success',   label: 'Email Verified'   },
  account_locked:     { color: 'badge-danger',    label: 'Acct Locked'      },
  user_created:       { color: 'badge-primary',   label: 'User Created'     },
  user_updated:       { color: 'badge-primary',   label: 'User Updated'     },
  user_deleted:       { color: 'badge-danger',    label: 'User Deleted'     },
  user_activated:     { color: 'badge-success',   label: 'Activated'        },
  user_deactivated:   { color: 'badge-danger',    label: 'Deactivated'      },
  donation_created:   { color: 'badge-primary',   label: 'Don. Created'     },
  donation_updated:   { color: 'badge-primary',   label: 'Don. Updated'     },
  donation_deleted:   { color: 'badge-danger',    label: 'Don. Deleted'     },
  donation_approved:  { color: 'badge-success',   label: 'Don. Approved'    },
  donation_rejected:  { color: 'badge-danger',    label: 'Don. Rejected'    },
  request_created:    { color: 'badge-primary',   label: 'Req. Created'     },
  request_approved:   { color: 'badge-success',   label: 'Req. Approved'    },
  request_rejected:   { color: 'badge-danger',    label: 'Req. Rejected'    },
  request_cancelled:  { color: 'badge-warning',   label: 'Req. Cancelled'   },
  match_created:      { color: 'badge-primary',   label: 'Match Created'    },
  match_accepted:     { color: 'badge-success',   label: 'Match Accepted'   },
  match_rejected:     { color: 'badge-danger',    label: 'Match Rejected'   },
  item_delivered:     { color: 'badge-success',   label: 'Delivered'        },
  feedback_created:   { color: 'badge-primary',   label: 'Feedback'         },
  feedback_hidden:    { color: 'badge-warning',   label: 'Feedback Hidden'  },
  feedback_deleted:   { color: 'badge-danger',    label: 'Feedback Deleted' },
  admin_action:       { color: 'badge-warning',   label: 'Admin Action'     },
  report_generated:   { color: 'badge-gray',      label: 'Report'           },
  settings_changed:   { color: 'badge-warning',   label: 'Settings'         },
};

const ACTION_GROUPS = [
  { label: 'Authentication', actions: ['user_registered','user_login','user_logout','password_reset','email_verified','account_locked'] },
  { label: 'User Management', actions: ['user_created','user_updated','user_deleted','user_activated','user_deactivated'] },
  { label: 'Donations', actions: ['donation_created','donation_updated','donation_deleted','donation_approved','donation_rejected'] },
  { label: 'Requests', actions: ['request_created','request_approved','request_rejected','request_cancelled'] },
  { label: 'Matches', actions: ['match_created','match_accepted','match_rejected','item_delivered'] },
  { label: 'Feedback', actions: ['feedback_created','feedback_hidden','feedback_deleted'] },
  { label: 'Admin', actions: ['admin_action','report_generated','settings_changed'] },
];

// ─── CSV Export ───────────────────────────────────────────────────────────────
const exportToCSV = (logs) => {
  const headers = ['Timestamp', 'Actor', 'Email', 'Action', 'Target', 'Target Model', 'Status', 'IP', 'User Agent'];
  const rows = logs.map(log => [
    formatDate(log.createdAt, { hour: '2-digit', minute: '2-digit' }),
    log.actor?.name || 'System',
    log.actorEmail || log.actor?.email || '',
    log.action,
    log.target || '',
    log.targetModel || '',
    log.status,
    log.ip || '',
    `"${(log.userAgent || '').replace(/"/g, "'")}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Audit logs exported to CSV');
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ log, onClose }) {
  if (!log) return null;
  const meta = ACTION_META[log.action] || { color: 'badge-gray', label: log.action };

  const detailFields = log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0
    ? Object.entries(log.details)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="glass-card w-full max-w-lg max-h-[80vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Audit Log Detail</h3>
                <p className="text-gray-500 text-xs">{formatDate(log.createdAt, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Status + Action */}
          <div className="flex items-center gap-3 mb-5">
            <span className={`badge ${meta.color} text-xs`}>{meta.label}</span>
            {log.status === 'success'
              ? <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle size={12} /> Success</span>
              : <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><XCircle size={12} /> Failed</span>
            }
            {log.errorMessage && (
              <span className="text-xs text-red-300 italic truncate flex-1">{log.errorMessage}</span>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {[
              {
                icon: User,
                label: 'Actor',
                value: log.actor?.name || 'System',
                sub: log.actorEmail || log.actor?.email || '—',
                color: 'text-indigo-400',
              },
              log.actor?.role && {
                icon: Tag,
                label: 'Role',
                value: <span className="capitalize">{log.actor.role}</span>,
                color: 'text-purple-400',
              },
              log.target && {
                icon: Shield,
                label: 'Target',
                value: log.target,
                sub: log.targetModel ? `Model: ${log.targetModel}` : undefined,
                color: 'text-teal-400',
              },
              log.ip && {
                icon: Globe,
                label: 'IP Address',
                value: log.ip,
                color: 'text-cyan-400',
                mono: true,
              },
              log.userAgent && {
                icon: Monitor,
                label: 'User Agent',
                value: log.userAgent,
                color: 'text-gray-400',
                wrap: true,
              },
            ].filter(Boolean).map(({ icon: Icon, label, value, sub, color, mono, wrap }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
                <Icon size={14} className={`${color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className={`text-sm text-gray-200 ${mono ? 'font-mono' : 'font-medium'} ${wrap ? 'break-all text-xs' : 'truncate'}`}>
                    {value}
                  </p>
                  {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}

            {/* Extra details (JSON fields) */}
            {detailFields && (
              <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Tag size={12} /> Additional Details</p>
                <div className="space-y-1.5">
                  {detailFields.map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 capitalize min-w-[90px] flex-shrink-0">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-xs text-gray-300 break-all font-mono">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
              <Calendar size={14} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Timestamp</p>
                <p className="text-sm text-gray-200 font-medium">
                  {formatDate(log.createdAt, { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500">{formatRelativeTime(log.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={onClose} className="btn-ghost">Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    <td className="py-3 px-4"><div className="skeleton h-3.5 w-24 rounded" /></td>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <div className="skeleton w-7 h-7 rounded-full" />
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-2.5 w-32 rounded" />
        </div>
      </div>
    </td>
    <td className="py-3 px-4"><div className="skeleton h-5 w-24 rounded-full" /></td>
    <td className="py-3 px-4"><div className="skeleton h-3 w-28 rounded" /></td>
    <td className="py-3 px-4"><div className="skeleton h-3 w-16 rounded" /></td>
    <td className="py-3 px-4"><div className="skeleton h-5 w-14 rounded-full" /></td>
    <td className="py-3 px-4"><div className="skeleton h-3 w-16 rounded" /></td>
    <td className="py-3 px-4"><div className="skeleton w-7 h-7 rounded-lg" /></td>
  </tr>
);

// ─── Table Row ────────────────────────────────────────────────────────────────
function LogRow({ log, onView }) {
  const meta = ACTION_META[log.action] || { color: 'badge-gray', label: log.action.replace(/_/g, ' ') };
  const initials = getInitials(log.actor?.name || log.actorEmail || 'S');

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-800/60 hover:bg-white/3 transition-colors group"
    >
      {/* Timestamp */}
      <td className="py-3 px-4 whitespace-nowrap">
        <p className="text-xs text-gray-400">{formatRelativeTime(log.createdAt)}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{formatDate(log.createdAt, { hour: '2-digit', minute: '2-digit' })}</p>
      </td>

      {/* Actor */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate max-w-[120px]">
              {log.actor?.name || 'System'}
            </p>
            <p className="text-[11px] text-gray-500 truncate max-w-[140px]">
              {log.actorEmail || log.actor?.email || '—'}
            </p>
          </div>
        </div>
      </td>

      {/* Action badge */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span className={`badge ${meta.color} text-[11px] capitalize`}>{meta.label}</span>
      </td>

      {/* Target */}
      <td className="py-3 px-4">
        <p className="text-xs text-gray-300 truncate max-w-[150px]">{log.target || '—'}</p>
        {log.targetModel && (
          <p className="text-[11px] text-gray-600 mt-0.5">{log.targetModel}</p>
        )}
      </td>

      {/* IP */}
      <td className="py-3 px-4 whitespace-nowrap">
        <p className="text-xs text-gray-500 font-mono">{log.ip || '—'}</p>
      </td>

      {/* Status */}
      <td className="py-3 px-4 whitespace-nowrap">
        {log.status === 'success'
          ? <span className="inline-flex items-center gap-1 text-green-400 text-[11px] font-semibold"><CheckCircle size={11} /> OK</span>
          : <span className="inline-flex items-center gap-1 text-red-400 text-[11px] font-semibold"><XCircle size={11} /> Fail</span>
        }
      </td>

      {/* Role */}
      <td className="py-3 px-4 whitespace-nowrap">
        {log.actor?.role
          ? <span className={`badge capitalize text-[11px] ${
              log.actor.role === 'admin'    ? 'badge-danger'  :
              log.actor.role === 'donor'    ? 'badge-primary' : 'badge-success'
            }`}>{log.actor.role}</span>
          : <span className="text-xs text-gray-600">—</span>
        }
      </td>

      {/* View action */}
      <td className="py-3 px-4">
        <button
          onClick={() => onView(log)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
          title="View details"
        >
          <Eye size={14} />
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Sort Button ──────────────────────────────────────────────────────────────
const SortBtn = ({ field, sort, onSort, children }) => {
  const isActive = sort.replace('-', '') === field;
  const isDesc   = sort.startsWith('-') && isActive;
  return (
    <button
      onClick={() => onSort(isActive ? (isDesc ? field : `-${field}`) : `-${field}`)}
      className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
        isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
      {isActive ? (isDesc ? <ChevronDown size={11} /> : <ChevronUp size={11} />) : null}
    </button>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-500">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of <span className="text-white font-semibold">{total}</span> logs
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
          const n = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
          if (n < 1 || n > totalPages) return null;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                page === n ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {n}
            </button>
          );
        })}
        <button
          onClick={() => onChange(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuditLogs() {
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [actionFilter, setAction]     = useState('');
  const [modelFilter, setModel]       = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [sort, setSort]               = useState('-createdAt');
  const [selectedLog, setSelectedLog] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const resetFilters = useCallback(() => {
    setSearch('');
    setAction('');
    setModel('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const hasActiveFilters = search || actionFilter || modelFilter || dateFrom || dateTo;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, modelFilter, sort, dateFrom, dateTo],
    queryFn: () => adminService.getAuditLogs({
      page,
      limit: PAGE_SIZE,
      action:      actionFilter  || undefined,
      targetModel: modelFilter   || undefined,
      sort,
    }).then(r => r.data),
    keepPreviousData: true,
    staleTime: 1000 * 30,
  });

  const logs       = data?.logs        ?? [];
  const total      = data?.total       ?? 0;
  const totalPages = data?.totalPages  ?? 1;

  // Client-side search on name/email/target/ip (server doesn't support search param)
  const filtered = search
    ? logs.filter(l =>
        l.actor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.target?.toLowerCase().includes(search.toLowerCase()) ||
        l.ip?.includes(search)
      )
    : logs;

  // Client-side date filter
  const visibleLogs = filtered.filter(l => {
    const ts = new Date(l.createdAt);
    if (dateFrom && ts < new Date(dateFrom)) return false;
    if (dateTo   && ts > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleSort = (field) => {
    setSort(field);
    setPage(1);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Audit Logs</h1>
              <p className="text-gray-400 text-sm">
                {isLoading ? 'Loading…' : `${total.toLocaleString()} log${total !== 1 ? 's' : ''} recorded`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(visibleLogs)}
              disabled={visibleLogs.length === 0}
              className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Search + Filter Bar ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="glass-card space-y-4"
      >
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by actor, email, target, IP…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              filtersOpen || hasActiveFilters
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border-white/10 hover:bg-white/10'
            }`}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              <RefreshCw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Action filter */}
                <div>
                  <label className="label mb-1.5">Action</label>
                  <select
                    value={actionFilter}
                    onChange={e => { setAction(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="">All Actions</option>
                    {ACTION_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.actions.map(a => (
                          <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Target model filter */}
                <div>
                  <label className="label mb-1.5">Target Model</label>
                  <select
                    value={modelFilter}
                    onChange={e => { setModel(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="">All Models</option>
                    {TARGET_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Date from */}
                <div>
                  <label className="label mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    className="input"
                    max={dateTo || undefined}
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="label mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    className="input"
                    min={dateFrom || undefined}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Summary Chips ────────────────────────────────────────────────── */}
      {hasActiveFilters && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500">Active filters:</span>
          {search       && <span className="badge-primary">Search: "{search}"</span>}
          {actionFilter && <span className="badge-primary">{ACTION_META[actionFilter]?.label ?? actionFilter}</span>}
          {modelFilter  && <span className="badge-primary">{modelFilter}</span>}
          {dateFrom     && <span className="badge-gray">From: {dateFrom}</span>}
          {dateTo       && <span className="badge-gray">To: {dateTo}</span>}
          <span className="text-gray-500 ml-1">→ {visibleLogs.length} result{visibleLogs.length !== 1 ? 's' : ''}</span>
        </motion.div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-gray-300 font-semibold">Failed to load audit logs</p>
          <p className="text-gray-500 text-sm">{getApiError(error)}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card !p-0 overflow-hidden"
        >
          {/* Fetching indicator */}
          {isFetching && !isLoading && (
            <div className="h-0.5 w-full bg-gray-800 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800/80 bg-white/2">
                  <th className="py-3 px-4">
                    <SortBtn field="createdAt" sort={sort} onSort={handleSort}>
                      <Clock size={12} /> Time
                    </SortBtn>
                  </th>
                  <th className="py-3 px-4">
                    <SortBtn field="actorEmail" sort={sort} onSort={handleSort}>
                      <User size={12} /> Actor
                    </SortBtn>
                  </th>
                  <th className="py-3 px-4">
                    <SortBtn field="action" sort={sort} onSort={handleSort}>
                      <Shield size={12} /> Action
                    </SortBtn>
                  </th>
                  <th className="py-3 px-4">
                    <span className="text-xs font-semibold text-gray-500">Target</span>
                  </th>
                  <th className="py-3 px-4">
                    <SortBtn field="ip" sort={sort} onSort={handleSort}>
                      <Globe size={12} /> IP
                    </SortBtn>
                  </th>
                  <th className="py-3 px-4">
                    <SortBtn field="status" sort={sort} onSort={handleSort}>
                      Status
                    </SortBtn>
                  </th>
                  <th className="py-3 px-4">
                    <span className="text-xs font-semibold text-gray-500">Role</span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                  : visibleLogs.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-600">
                            <Shield size={40} className="text-gray-700" />
                            <p className="font-semibold text-gray-400">No audit logs found</p>
                            {hasActiveFilters && (
                              <button onClick={resetFilters} className="text-indigo-400 hover:text-indigo-300 text-sm underline">
                                Clear filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                    : visibleLogs.map(log => (
                      <LogRow key={log._id} log={log} onView={setSelectedLog} />
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-800/60">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onChange={setPage}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
