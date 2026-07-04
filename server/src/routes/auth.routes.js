import express from 'express';
import {
  register, login, logout, refreshToken,
  forgotPassword, resetPassword, verifyEmail,
  getMe, resendVerification,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
router.post('/resend-verification', protect, resendVerification);

export default router;
