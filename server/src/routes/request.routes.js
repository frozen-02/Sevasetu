import express from 'express';
import {
  getRequests, getRequest, createRequest,
  cancelRequest, confirmDelivery,
} from '../controllers/request.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize, requireVerified } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getRequests);
router.get('/:id', getRequest);
router.post('/', authorize('receiver'), requireVerified, createRequest);
router.patch('/:id/cancel', authorize('receiver'), cancelRequest);
router.patch('/:id/confirm-delivery', authorize('donor', 'receiver'), confirmDelivery);

export default router;
