import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore.js';
import useNotificationStore from '../../store/notificationStore.js';
import { notificationService } from '../../services/index.js';
import { cn, formatRelativeTime, getInitials } from '../../utils/index.js';

const roleLabels = {
  donor: { label: 'Donor Portal', gradient: 'from-primary-600 to-accent-600' },
  receiver: { label: 'Receiver Portal', gradient: 'from-teal-600 to-primary-600' },
  admin: { label: 'Admin Panel', gradient: 'from-accent-600 to-rose-600' },
};

const notificationTypeIcons = {
  new_donation: '📦',
  donation_approved: '✅',
  donation_rejected: '❌',
  request_submitted: '📋',
  request_approved: '✅',
  request_rejected: '❌',
  match_found: '🎯',
  match_accepted: '🤝',
  item_delivered: '🎉',
  feedback_received: '⭐',
  system_alert: '🔔',
  account_update: '👤',
};

const DashboardHeader = ({ role, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const { gradient } = roleLabels[role] || roleLabels.donor;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      markAllAsRead();
    } catch {}
  };

  return (
    <header className="sticky top-0 z-20 navbar-glass px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <h1 className={cn(
            'text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r',
            gradient
          )}>
            {roleLabels[role]?.label}
          </h1>
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
            className="relative p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-primary-600 rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 sm:w-96 glass border border-white/10 rounded-2xl overflow-hidden z-50 shadow-card"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        Mark all read
                      </button>
                    )}
                    <Link
                      to={`/${role}/notifications`}
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      View all
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          markAsRead(notif._id);
                          notificationService.markAsRead(notif._id).catch(() => {});
                          setNotifOpen(false);
                        }}
                        className={cn(
                          'flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-800/40 last:border-0',
                          notif.isRead ? 'hover:bg-white/3' : 'bg-primary-600/5 hover:bg-primary-600/10'
                        )}
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5">
                          {notificationTypeIcons[notif.type] || '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            notif.isRead ? 'text-gray-300' : 'text-white'
                          )}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-gray-600 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                        </div>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
              `bg-gradient-to-br ${gradient}`
            )}>
              {user?.avatar?.url
                ? <img src={user.avatar.url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                : getInitials(user?.name)
              }
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-300 max-w-[100px] truncate">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-52 glass border border-white/10 rounded-2xl overflow-hidden z-50 shadow-card py-1"
              >
                <div className="px-4 py-3 border-b border-gray-800/60">
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <Link
                  to={`/${role}/profile`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <User size={16} />
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
