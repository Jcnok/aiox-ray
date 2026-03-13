import { Router, Request, Response } from 'express';
import { createEvent, listEvents } from '../controllers/eventsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// POST /events - Create new event
router.post('/', createEvent);

// GET /events - Query events with filters and pagination
router.get('/', listEvents);

export default router;
