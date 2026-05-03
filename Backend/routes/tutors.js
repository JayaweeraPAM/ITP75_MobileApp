import { Router } from 'express';
import { addReview, getReviews, getTutorProfile } from '../controllers/tutorsController.js';

export const tutorsRouter = Router();

tutorsRouter.post('/:tutorId/reviews', addReview);
tutorsRouter.get('/:tutorId/reviews', getReviews);
tutorsRouter.get('/:tutorId', getTutorProfile);
