import Notification from '../models/Notification.js';

let io;
const onlineUsers = new Map(); // userId -> socketId[]

export const initSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate and join personal room
    socket.on('join', (userId) => {
      if (!userId) return;

      socket.join(`user:${userId}`);

      // Track online users
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, []);
      }
      onlineUsers.get(userId).push(socket.id);

      console.log(`👤 User ${userId} joined room. Online users: ${onlineUsers.size}`);
    });

    socket.on('leave', (userId) => {
      if (!userId) return;
      socket.leave(`user:${userId}`);
      removeOnlineUser(userId, socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      // Remove from all online user tracking
      for (const [userId, sockets] of onlineUsers.entries()) {
        const idx = sockets.indexOf(socket.id);
        if (idx !== -1) {
          sockets.splice(idx, 1);
          if (sockets.length === 0) onlineUsers.delete(userId);
          break;
        }
      }
    });

    // Mark notification as read
    socket.on('markNotificationRead', async (notificationId) => {
      try {
        await Notification.findByIdAndUpdate(notificationId, {
          isRead: true,
          readAt: new Date(),
        });
      } catch (err) {
        console.error('Error marking notification read:', err.message);
      }
    });
  });
};

const removeOnlineUser = (userId, socketId) => {
  if (onlineUsers.has(userId)) {
    const sockets = onlineUsers.get(userId);
    const idx = sockets.indexOf(socketId);
    if (idx !== -1) sockets.splice(idx, 1);
    if (sockets.length === 0) onlineUsers.delete(userId);
  }
};

/**
 * Send a notification to a user (save to DB + emit via socket)
 */
export const sendNotification = async ({
  recipientId,
  type,
  title,
  message,
  data = {},
  actionUrl = '',
  priority = 'normal',
}) => {
  try {
    // Save to database
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data,
      actionUrl,
      priority,
    });

    // Emit via socket if user is online
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', {
        _id: notification._id,
        type,
        title,
        message,
        data,
        actionUrl,
        priority,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error(`❌ Failed to send notification: ${error.message}`);
  }
};

/**
 * Emit a real-time event to a specific user (no DB save)
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Broadcast to all connected clients
 */
export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

export const getOnlineUserCount = () => onlineUsers.size;

export default {
  initSocket,
  sendNotification,
  emitToUser,
  broadcast,
  isUserOnline,
  getOnlineUserCount,
};
