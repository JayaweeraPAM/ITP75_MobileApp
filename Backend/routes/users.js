import { Router } from 'express';
import { getMe, updateMe, getUserProfile } from '../controllers/usersController.js';
import { authMiddleware } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.get('/me', authMiddleware, getMe);
usersRouter.patch('/me', authMiddleware, updateMe);
usersRouter.get('/:id/profile', authMiddleware, getUserProfile);
