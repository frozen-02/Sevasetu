import { AppError } from '../utils/appError.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This action requires: ${roles.join(' or ')} role.`,
          403
        )
      );
    }
    next();
  };
};

export const requireVerified = (req, res, next) => {
  // In development, skip verification gate so the app works without email setup
  if (process.env.NODE_ENV !== 'production') return next();

  if (!req.user.isVerified) {
    return next(
      new AppError(
        'Please verify your email address before performing this action.',
        403
      )
    );
  }
  next();
};

export const isSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    const targetId = req.params[paramName];
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user._id.toString() === targetId;

    if (!isAdmin && !isSelf) {
      return next(new AppError('Access denied. You can only access your own resources.', 403));
    }
    next();
  };
};
