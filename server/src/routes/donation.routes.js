import express from 'express';
import {
  getDonations, getDonation, getMyDonations,
  createDonation, updateDonation, deleteDonation,
} from '../controllers/donation.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { authorize, requireVerified } from '../middleware/role.middleware.js';
import { uploadDonationImages, handleMulterError } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, getDonations);
router.get('/my', protect, authorize('donor', 'admin'), getMyDonations);
router.get('/:id', optionalAuth, getDonation);

router.use(protect);

router.post(
  '/',
  authorize('donor'),
  requireVerified,
  uploadDonationImages,
  handleMulterError,
  createDonation
);

router.put(
  '/:id',
  authorize('donor', 'admin'),
  uploadDonationImages,
  handleMulterError,
  updateDonation
);

router.delete('/:id', authorize('donor', 'admin'), deleteDonation);

export default router;
