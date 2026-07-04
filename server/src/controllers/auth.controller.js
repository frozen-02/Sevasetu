import crypto from 'crypto';
import User from '../models/User.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import AuditLog from '../models/AuditLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  sendTokenResponse,
} from '../utils/jwt.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../services/email.service.js';

const logAudit = async ({ actor, actorEmail, action, req, status = 'success', details = {} }) => {
  try {
    await AuditLog.create({
      actor,
      actorEmail,
      action,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      status,
      details,
    });
  } catch { /* audit failures should not block operations */ }
};

// ─── REGISTER ───────────────────────────────────────────────────────

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role = 'donor', phone, organization } = req.body;

  // Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Validate role
  if (!['donor', 'receiver'].includes(role)) {
    return next(new AppError('Invalid role. Must be donor or receiver.', 400));
  }

  // Create user
  const user = await User.create({ name, email, password, role, phone });

  // Create role profile
  if (role === 'donor') {
    await DonorProfile.create({ user: user._id });
  } else if (role === 'receiver') {
    await ReceiverProfile.create({
      user: user._id,
      organization: organization || '',
    });
  }

  // Generate email verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await sendVerificationEmail(user, verificationToken);
  } catch (err) {
    // Reset token if email fails
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send verification email. Please try again.', 500));
  }

  await logAudit({
    actor: user._id,
    actorEmail: user.email,
    action: 'user_registered',
    req,
    details: { role },
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please check your email to verify your account.',
    userId: user._id,
  });
});

// ─── VERIFY EMAIL ───────────────────────────────────────────────────

export const verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return next(new AppError('Invalid or expired verification link. Please request a new one.', 400));
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Send welcome email
  try {
    await sendWelcomeEmail(user);
  } catch { /* non-critical */ }

  await logAudit({ actor: user._id, actorEmail: user.email, action: 'email_verified', req });

  sendTokenResponse(user, 200, res);
});

// ─── LOGIN ───────────────────────────────────────────────────────────

export const login = catchAsync(async (req, res, next) => {
  const { email, password, rememberMe = false } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required.', 400));
  }

  const user = await User.findOne({ email }).select('+password +refreshTokens +loginAttempts +lockUntil');

  if (!user || !(await user.comparePassword(password))) {
    if (user) await user.incrementLoginAttempts();
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 401));
  }

  if (user.isLocked) {
    return next(new AppError('Account locked due to multiple failed attempts. Try again in 2 hours.', 401));
  }

  // Reset login attempts on success
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  // Update last login
  user.lastLogin = new Date();
  const refreshToken = generateRefreshToken(user._id, user.role);

  // Store refresh token (max 5 active sessions)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  await user.save({ validateBeforeSave: false });

  await logAudit({ actor: user._id, actorEmail: user.email, action: 'user_login', req, details: { rememberMe } });

  sendTokenResponse(user, 200, res, rememberMe);
});

// ─── LOGOUT ─────────────────────────────────────────────────────────

export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (req.user && refreshToken) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: refreshToken },
    });
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ─── REFRESH TOKEN ───────────────────────────────────────────────────

export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    return next(new AppError('Refresh token required.', 401));
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens?.includes(token)) {
    return next(new AppError('Refresh token not recognized. Please login again.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account deactivated.', 401));
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken(user._id, user.role);
  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  user.refreshTokens.push(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id, user.role);

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken: newRefreshToken,
  });
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Security: don't reveal if email exists
    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send reset email. Please try again later.', 500));
  }

  res.status(200).json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  });
});

// ─── RESET PASSWORD ──────────────────────────────────────────────────

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

  if (!user) {
    return next(new AppError('Invalid or expired password reset link.', 400));
  }

  const { password, confirmPassword } = req.body;

  if (!password || password.length < 8) {
    return next(new AppError('Password must be at least 8 characters.', 400));
  }

  if (password !== confirmPassword) {
    return next(new AppError('Passwords do not match.', 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all sessions on password reset
  await user.save();

  await logAudit({ actor: user._id, actorEmail: user.email, action: 'password_reset', req });

  sendTokenResponse(user, 200, res);
});

// ─── GET ME ──────────────────────────────────────────────────────────

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  let profile = null;
  if (user.role === 'donor') {
    profile = await DonorProfile.findOne({ user: user._id });
  } else if (user.role === 'receiver') {
    profile = await ReceiverProfile.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    user,
    profile,
  });
});

// ─── RESEND VERIFICATION ──────────────────────────────────────────────

export const resendVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpires');

  if (user.isVerified) {
    return next(new AppError('Email is already verified.', 400));
  }

  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user, verificationToken);
  } catch {
    return next(new AppError('Failed to send verification email.', 500));
  }

  res.status(200).json({
    success: true,
    message: 'Verification email sent. Please check your inbox.',
  });
});
