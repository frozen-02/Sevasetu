import express from 'express';
import {
  getFeedback, getMyFeedback, createFeedback, hideFeedback, updateFeedback,
} from '../controllers/feedback.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getFeedback);
router.get('/my', getMyFeedback);          // must be before /:id
router.post('/', createFeedback);
router.patch('/:id', updateFeedback);      // edit own feedback
router.patch('/:id/hide', authorize('admin'), hideFeedback);

export default router;

