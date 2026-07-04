import express from 'express';
import {
  getDashboardOverview,
  approveDonation, rejectDonation,
  approveRequest, rejectRequest,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import Donation from '../models/Donation.js';
import Request from '../models/Request.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardOverview);

// Donation management
router.get('/donations/pending', catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [donations, total] = await Promise.all([
    Donation.find({ status: 'pending' })
      .populate('donor', 'name email avatar phone address')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Donation.countDocuments({ status: 'pending' }),
  ]);
  res.json({ success: true, donations, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) });
}));

router.patch('/donations/:id/approve', approveDonation);
router.patch('/donations/:id/reject', rejectDonation);

// Request management
router.get('/requests/pending', catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [requests, total] = await Promise.all([
    Request.find({ status: 'pending' })
      .populate('receiver', 'name email avatar')
      .populate({ path: 'donation', select: 'title category images condition', populate: { path: 'donor', select: 'name' } })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Request.countDocuments({ status: 'pending' }),
  ]);
  res.json({ success: true, requests, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) });
}));

router.patch('/requests/:id/approve', approveRequest);
router.patch('/requests/:id/reject', rejectRequest);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
