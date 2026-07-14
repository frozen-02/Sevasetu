import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

import connectDB from './src/config/db.js';
import './src/config/cloudinary.js';
import { initSocket } from './src/services/socket.service.js';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import donationRoutes from './src/routes/donation.routes.js';
import requestRoutes from './src/routes/request.routes.js';
import matchRoutes from './src/routes/match.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

import errorMiddleware from './src/middleware/error.middleware.js';
import { AppError } from './src/utils/appError.js';

const app = express();
const httpServer = createServer(app);

// ─── CORS Origin Helper ───────────────────────────────────────────────
// In development allow any localhost port (Vite can bind to 5173/5174/5175…)
// In production only allow the explicit CLIENT_URL env variable.
const corsOrigin = (origin, callback) => {
  if (process.env.NODE_ENV !== 'production') {
    // Allow requests with no origin (curl, Postman) and any localhost port
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
  }
  const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
  if (origin === allowed) return callback(null, true);
  callback(new Error(`CORS: origin ${origin} not allowed`));
};

// ─── Socket.IO Setup ─────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocket(io);

// ─── Security Middleware ─────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});
app.use('/api', limiter);

// Auth-specific stricter rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: { success: false, message: 'Too many authentication attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server.`, 404));
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5005;

const start = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`
🚀 SEVASETU API Server Running
================================
🌍 Environment : ${process.env.NODE_ENV}
📡 Port        : ${PORT}
🔗 Base URL    : http://localhost:${PORT}
🩺 Health      : http://localhost:${PORT}/health
🔌 Socket.IO   : Enabled
================================
    `);
  });
};

start();

// ─── Graceful Shutdown ───────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err.message);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  process.exit(1);
});

export { io };
