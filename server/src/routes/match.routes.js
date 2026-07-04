import express from 'express';
import {
  getMatches, createMatch, getSuggestedMatches, updateMatchStatus,
} from '../controllers/match.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getMatches);
router.post('/', authorize('admin'), createMatch);
router.get('/suggestions/:donationId', authorize('admin'), getSuggestedMatches);
router.patch('/:id/status', authorize('admin'), updateMatchStatus);

export default router;
