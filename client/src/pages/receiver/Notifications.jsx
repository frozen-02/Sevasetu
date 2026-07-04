import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Clock } from 'lucide-react';
import { notificationService } from '../../services/index.js';
import useNotificationStore from '../../store/notificationStore.js';
import { formatRelativeTime } from '../../utils/index.js';
import toast from 'react-hot-toast';

const notificationTypeIcons = {
  new_donation: '📦', donation_approved: '✅', donation_rejected: '❌',
  request_submitted: '📋', request_approved: '✅', request_rejected: '❌',
  match_found: '🎯', match_accepted: '🤝', item_delivered: '🎉',
  feedback_received: '⭐', system_alert: '🔔', account_update: '👤',
};

const ReceiverNotifications = () => {
  const queryClient = useQueryClient();
  const { markAllAsRead: storeMarkAll } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll({ limit: 50 }),
    select: (res) => res.data,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      storeMarkAll();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} className="btn-secondary text-sm py-2">
            <CheckCheck size={16} />Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state"><Bell size={48} className="text-gray-700" /><p className="text-xl font-semibold">No notifications yet</p></div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors group ${notif.isRead ? 'border-gray-800/50 bg-gray-900/30' : 'border-teal-500/20 bg-teal-600/5'}`}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{notificationTypeIcons[notif.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm ${notif.isRead ? 'text-gray-300' : 'text-white'}`}>{notif.title}</p>
                  <button onClick={() => deleteMutation.mutate(notif._id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-600 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-gray-500 text-sm mt-0.5">{notif.message}</p>
                <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1"><Clock size={11} />{formatRelativeTime(notif.createdAt)}</p>
              </div>
              {!notif.isRead && <div className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0 mt-2" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiverNotifications;
