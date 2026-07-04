import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, PlusCircle, BarChart2, MessageSquare,
  Bell, User, ChevronRight, Users, Clock, CheckCircle, Search,
  Inbox, Star, ClipboardList, Shield, FileText, Settings,
  HandHeart, Repeat, LogOut, X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore.js';
import { cn } from '../../utils/index.js';

const NAV_ITEMS = {
  donor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/donor/dashboard' },
    { label: 'My Donations', icon: Package, path: '/donor/donations' },
    { label: 'Add Donation', icon: PlusCircle, path: '/donor/donations/new', highlight: true },
    { label: 'Analytics', icon: BarChart2, path: '/donor/analytics' },
    { label: 'Feedback', icon: Star, path: '/donor/feedback' },
    { label: 'Notifications', icon: Bell, path: '/donor/notifications' },
    { label: 'Profile', icon: User, path: '/donor/profile' },
  ],
  receiver: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/receiver/dashboard' },
    { label: 'Browse Donations', icon: Search, path: '/receiver/browse' },
    { label: 'My Requests', icon: ClipboardList, path: '/receiver/requests' },
    { label: 'Received Items', icon: Inbox, path: '/receiver/received' },
    { label: 'Feedback', icon: MessageSquare, path: '/receiver/feedback' },
    { label: 'Notifications', icon: Bell, path: '/receiver/notifications' },
    { label: 'Profile', icon: User, path: '/receiver/profile' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Pending Donations', icon: Clock, path: '/admin/donations/pending' },
    { label: 'Pending Requests', icon: ClipboardList, path: '/admin/requests/pending' },
    { label: 'Smart Matching', icon: Repeat, path: '/admin/matching' },
    { label: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
    { label: 'Audit Logs', icon: Shield, path: '/admin/audit-logs' },
    { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  ],
};

const roleColors = {
  donor: 'from-primary-600 to-accent-600',
  receiver: 'from-teal-600 to-primary-600',
  admin: 'from-accent-600 to-rose-600',
};

const roleLabels = {
  donor: { label: 'Donor', icon: '💝' },
  receiver: { label: 'Receiver', icon: '🏠' },
  admin: { label: 'Admin', icon: '⚙️' },
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navItems = NAV_ITEMS[role] || [];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800/60">
        <Link to="/" className="flex items-center gap-3 group">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
            `bg-gradient-to-br ${roleColors[role]}`
          )}>
            🤝
          </div>
          <div>
            <div className="font-black text-lg font-display tracking-tight">
              SEVA<span className="gradient-text">SETU</span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {roleLabels[role].icon} {roleLabels[role].label} Portal
            </div>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-b border-gray-800/60">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50">
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
              `bg-gradient-to-br ${roleColors[role]}`
            )}>
              {user.avatar?.url
                ? <img src={user.avatar.url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                : user.name?.[0]?.toUpperCase()
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                isActive ? 'sidebar-item-active' : 'sidebar-item',
                item.highlight && !isActive && 'text-primary-400 hover:text-primary-300'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-primary-400" />}
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800/60">
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30 bg-gray-900/95 border-r border-gray-800/60 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 border-r border-gray-800 lg:hidden"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
