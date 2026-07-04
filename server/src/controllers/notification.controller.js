import Notification from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

// ─── GET MY NOTIFICATIONS ────────────────────────────────────────────

export const getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const pageNum = parseInt(page);
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    unreadCount,
    notifications,
  });
});

// ─── MARK AS READ ────────────────────────────────────────────────────

export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return next(new AppError('Notification not found.', 404));
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied.', 403));
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.status(200).json({ success: true, message: 'Notification marked as read.' });
});

// ─── MARK ALL AS READ ────────────────────────────────────────────────

export const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

// ─── DELETE NOTIFICATION ─────────────────────────────────────────────

export const deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return next(new AppError('Notification not found.', 404));
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied.', 403));
  }
  await notification.deleteOne();
  res.status(200).json({ success: true, message: 'Notification deleted.' });
});

// ─── DELETE ALL READ NOTIFICATIONS ──────────────────────────────────

export const clearReadNotifications = catchAsync(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id, isRead: true });
  res.status(200).json({ success: true, message: 'Read notifications cleared.' });
});
