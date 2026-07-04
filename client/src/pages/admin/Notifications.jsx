import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell, BellOff, CheckCheck, Trash2, Search, Filter,
  X, AlertCircle, CheckCircle, Shuffle, Gift, FileText,
  Star, ShieldAlert, Settings, Users, Zap, Clock,
  RefreshCw, Inbox, WifiOff, Wifi,
} from 'lucide-react';

import { notificationService } from '../../services/index.js';
import useNotificationStore from '../../store/notificationStore.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { formatRelativeTime, formatDate, getApiError } from '../../utils/index.js';

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_META = {
  // Donation
  new_donation:       { icon: Gift,       color: 'text-purple-400',  bg: 'bg-purple-500/15',  label: 'New Donation',       group: 'Donations'   },
  donation_approved:  { icon: CheckCircle,color: 'text-green-400',   bg: 'bg-green-500/15',   label: 'Donation Approved',  group: 'Donations'   },
  donation_rejected:  { icon: X,          color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Donation Rejected',  group: 'Donations'   },
  // Requests
  request_submitted:  { icon: FileText,   color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    label: 'Request Submitted',  group: 'Requests'    },
  request_approved:   { icon: CheckCircle,color: 'text-teal-400',    bg: 'bg-teal-500/15',    label: 'Request Approved',   group: 'Requests'    },
  request_rejected:   { icon: X,          color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Request Rejected',   group: 'Requests'    },
  // Matches
  match_found:        { icon: Shuffle,    color: 'text-pink-400',    bg: 'bg-pink-500/15',    label: 'Match Found',        group: 'Matches'     },
  match_accepted:     { icon: Shuffle,    color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Match Accepted',     group: 'Matches'     },
  item_delivered:     { icon: CheckCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Item Delivered',     group: 'Matches'     },
  // Users
  user_registered:    { icon: Users,      color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'User Registered',    group: 'Users'       },
  account_update:     { icon: Users,      color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Account Update',     group: 'Users'       },
  // Feedback
  feedback_received:  { icon: Star,       color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Feedback',           group: 'Feedback'    },
  // System & Security
  system_alert:       { icon: Settings,   color: 'text-gray-400',    bg: 'bg-gray-500/15',    label: 'System Alert',       group: 'System'      },
  security_alert:     { icon: ShieldAlert,color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Security Alert',     group: 'Security'    },
};

const FALLBACK_META = { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/15', label: 'Notification', group: 'Other' };

const TYPE_GROUPS = ['Donations', 'Requests', 'Matches', 'Users', 'Feedback', 'System', 'Security'];

// Tab config
const TABS = [
  { id: 'all',    label: 'All'    },
  { id: 'unread', label: 'Unread' },
  { id: 'read',   label: 'Read'   },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const NotifSkeleton = () => (
  <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-800/50">
    <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  </div>
);

// ─── Single Notification Card ─────────────────────────────────────────────────
function NotifCard({ notif, onMarkRead, onDelete, markingId, deletingId }) {
  const meta = TYPE_META[notif.type] || FALLBACK_META;
  const Icon = meta.icon;
  const isMarking  = markingId  === notif._id;
  const isDeleting = deletingId === notif._id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-colors group ${
        notif.isRead
          ? 'border-gray-800/50 bg-gray-900/20'
          : 'border-indigo-500/20 bg-indigo-600/4'
      }`}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/40" />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-5 h-5 ${meta.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className={`text-sm font-semibold leading-snug ${notif.isRead ? 'text-gray-300' : 'text-white'}`}>
            {notif.title}
          </p>
          <span className="text-[11px] text-gray-500 shrink-0 mt-0.5">
            {formatRelativeTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{notif.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          {notif.priority === 'high' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
              High Priority
            </span>
          )}
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
        {!notif.isRead && (
          <button
            onClick={() => onMarkRead(notif._id)}
            disabled={isMarking}
            title="Mark as read"
            className="p-1.5 rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-50"
          >
            {isMarking
              ? <RefreshCw size={12} className="animate-spin" />
              : <CheckCheck size={12} />
            }
          </button>
        )}
        <button
          onClick={() => onDelete(notif._id)}
          disabled={isDeleting}
          title="Delete"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {isDeleting
            ? <RefreshCw size={12} className="animate-spin" />
            : <Trash2 size={12} />
          }
        </button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ tab, hasFilters, onReset }) => {
  const messages = {
    all:    { icon: Inbox,   title: 'No notifications yet',     sub: 'Platform notifications will appear here.' },
    unread: { icon: BellOff, title: 'All caught up!',            sub: 'No unread notifications at the moment.'  },
    read:   { icon: CheckCheck, title: 'No read notifications', sub: 'Notifications you have read will show here.' },
  };
  const { icon: Icon, title, sub } = messages[tab] || messages.all;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1,  scale: 1    }}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="p-5 rounded-3xl bg-gray-800/50">
        <Icon size={36} className="text-gray-600" />
      </div>
      <div>
        <p className="text-white font-semibold text-base">{title}</p>
        <p className="text-gray-500 text-sm mt-1">{sub}</p>
      </div>
      {hasFilters && (
        <button onClick={onReset} className="text-indigo-400 hover:text-indigo-300 text-sm underline transition-colors">
          Clear filters
        </button>
      )}
    </motion.div>
  );
};

// ─── Connection Badge ─────────────────────────────────────────────────────────
const ConnectionBadge = ({ connected }) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
    connected ? 'bg-green-500/15 text-green-400' : 'bg-gray-700/50 text-gray-500'
  }`}>
    {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
    {connected ? 'Live' : 'Offline'}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const { socket }  = useSocket();

  // Zustand store (updated in real-time by SocketContext)
  const {
    addNotification,
    markAsRead: storeMarkRead,
    markAllAsRead: storeMarkAll,
    removeNotification,
    unreadCount,
  } = useNotificationStore();

  // Local UI state
  const [tab,         setTab]         = useState('all');
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [markingId,   setMarkingId]   = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);
  const [socketAlive, setSocketAlive] = useState(false);

  // Track socket connection status
  useEffect(() => {
    if (!socket) { setSocketAlive(false); return; }
    const onConnect    = () => setSocketAlive(true);
    const onDisconnect = () => setSocketAlive(false);
    setSocketAlive(socket.connected);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // ── Fetch notifications from server
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications-admin'],
    queryFn:  () => notificationService.getAll({ limit: 100 }).then(r => r.data),
    onSuccess: (res) => {
      // Sync zustand store with server data on initial load
      if (res?.notifications) {
        useNotificationStore.getState().setNotifications(res.notifications);
      }
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // ── Mark one as read
  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onMutate:   (id) => setMarkingId(id),
    onSuccess:  (_, id) => {
      storeMarkRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
    },
    onError:    (err) => toast.error(getApiError(err)),
    onSettled:  () => setMarkingId(null),
  });

  // ── Mark all as read
  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      storeMarkAll();
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
      toast.success('All notifications marked as read');
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  // ── Delete one
  const deleteMutation = useMutation({
    mutationFn: (id) => notificationService.delete(id),
    onMutate:   (id) => setDeletingId(id),
    onSuccess:  (_, id) => {
      removeNotification(id);
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
    },
    onError:    (err) => toast.error(getApiError(err)),
    onSettled:  () => setDeletingId(null),
  });

  // ── Clear all read
  const clearReadMutation = useMutation({
    mutationFn: notificationService.clearRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-admin'] });
      toast.success('Read notifications cleared');
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  // ── Derive notification list from server response
  const allNotifications = data?.notifications ?? [];
  const hasFilters = !!search || !!typeFilter;

  // ── Filter pipeline
  const visible = useMemo(() => {
    let list = allNotifications;

    // Tab filter
    if (tab === 'unread') list = list.filter(n => !n.isRead);
    if (tab === 'read')   list = list.filter(n =>  n.isRead);

    // Type filter
    if (typeFilter) list = list.filter(n => n.type === typeFilter);

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allNotifications, tab, typeFilter, search]);

  // ── Counts for tab badges
  const unreadTotal = allNotifications.filter(n => !n.isRead).length;
  const readTotal   = allNotifications.filter(n =>  n.isRead).length;

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Notifications</h1>
              <p className="text-gray-400 text-sm">
                {isLoading ? 'Loading…' : `${allNotifications.length} total · ${unreadTotal} unread`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ConnectionBadge connected={socketAlive} />

            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            {unreadTotal > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
              >
                {markAllMutation.isPending
                  ? <RefreshCw size={12} className="animate-spin" />
                  : <CheckCheck size={13} />
                }
                Mark all read
              </button>
            )}

            {readTotal > 0 && (
              <button
                onClick={() => clearReadMutation.mutate()}
                disabled={clearReadMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-50 border border-red-500/20"
              >
                {clearReadMutation.isPending
                  ? <RefreshCw size={12} className="animate-spin" />
                  : <Trash2 size={13} />
                }
                Clear read
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tabs + Search + Filter row ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="glass-card space-y-4"
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const count = t.id === 'unread' ? unreadTotal : t.id === 'read' ? readTotal : allNotifications.length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {t.label}
                {!isLoading && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + type filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search notifications…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500 flex-shrink-0" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="input max-w-[200px]"
            >
              <option value="">All Types</option>
              {TYPE_GROUPS.map(group => {
                const groupTypes = Object.entries(TYPE_META).filter(([, m]) => m.group === group);
                if (!groupTypes.length) return null;
                return (
                  <optgroup key={group} label={group}>
                    {groupTypes.map(([type, m]) => (
                      <option key={type} value={type}>{m.label}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all whitespace-nowrap"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Stats Strip ─────────────────────────────────────────────────── */}
      {!isLoading && allNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Total',  value: allNotifications.length, color: 'text-white',       bg: 'bg-white/5'          },
            { label: 'Unread', value: unreadTotal,             color: 'text-indigo-400',  bg: 'bg-indigo-500/10'    },
            { label: 'Read',   value: readTotal,               color: 'text-gray-400',    bg: 'bg-gray-700/30'      },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex flex-col items-center py-3 rounded-2xl border border-white/8 ${bg}`}>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Notification List ────────────────────────────────────────────── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-gray-300 font-semibold">Failed to load notifications</p>
          <p className="text-gray-500 text-sm">{getApiError(error)}</p>
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <NotifSkeleton key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState tab={tab} hasFilters={hasFilters} onReset={resetFilters} />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visible.map(notif => (
              <NotifCard
                key={notif._id}
                notif={notif}
                onMarkRead={id => markReadMutation.mutate(id)}
                onDelete={id => deleteMutation.mutate(id)}
                markingId={markingId}
                deletingId={deletingId}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Real-time indicator (live) ───────────────────────────────────── */}
      {socketAlive && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 py-3 text-xs text-gray-600"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Listening for live updates
        </motion.div>
      )}
    </div>
  );
}
