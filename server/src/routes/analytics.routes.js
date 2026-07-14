import express from 'express';
import {
  getOverview, getDonationTrends, getCategoryDistribution,
  getStateDistribution, getImpactMetrics, getDonorAnalytics,
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/overview', authorize('admin'), getOverview);
router.get('/trends', authorize('admin'), getDonationTrends);
router.get('/categories', authorize('admin'), getCategoryDistribution);
router.get('/states', authorize('admin'), getStateDistribution);
router.get('/impact', authorize('admin', 'donor'), getImpactMetrics); // donors use this too
router.get('/donor', authorize('donor'), getDonorAnalytics);

export default router;
