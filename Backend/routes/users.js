import { Router } from 'express';
import { getMe, updateMe, getUserProfile } from '../controllers/usersController.js';
import { authMiddleware } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.get('/me', authMiddleware, getMe);
usersRouter.patch('/me', authMiddleware, updateMe);
usersRouter.get('/:id/profile', authMiddleware, getUserProfile);

usersRouter.delete('/me', authMiddleware, async (req, res) => {
  try {
    const { store } = await import('../data/store-mongo.js');
    const { organizeUsersByRole } = await import('../data/organize-by-role.js');
    const userId = req.user.id;
    let users = await store.users.get();
    users = users.filter((u) => u.id !== userId);
    await store.users.set(users);
    await organizeUsersByRole(users).catch((err) => console.error('Failed to organize users:', err.message));

    let tutors = await store.tutors.get();
    tutors = tutors.filter((t) => t.id !== userId && t.userId !== userId);
    await store.tutors.set(tutors);

    let institutes = await store.institutes.get().catch(() => []);
    institutes = institutes.filter((i) => i.managerId !== userId && i.id !== userId);
    await store.institutes.set(institutes);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
