import express from 'express';
import {
  getAllUsers, getUser, updateProfile,
  changePassword, toggleUserStatus, deleteUser,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { uploadAvatar, handleMulterError } from '../middleware/upload.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', getUser);
router.put('/:id', uploadAvatar, handleMulterError, updateProfile);
router.post('/change-password', changePassword);
router.patch('/:id/status', authorize('admin'), toggleUserStatus);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
