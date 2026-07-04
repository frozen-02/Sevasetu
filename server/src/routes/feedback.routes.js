import express from 'express';
import {
  getFeedback, getMyFeedback, createFeedback, hideFeedback,
} from '../controllers/feedback.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getFeedback);
router.get('/my', getMyFeedback);
router.post('/', createFeedback);
router.patch('/:id/hide', authorize('admin'), hideFeedback);

export default router;
