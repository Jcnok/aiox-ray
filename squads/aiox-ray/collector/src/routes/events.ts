import { Router, Request, Response } from 'express';
import { createEvent, listEvents } from '../controllers/eventsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Authentication is enabled by default for ingestion/query endpoints.
// Set DISABLE_EVENTS_AUTH=true only for local debugging flows.
if (process.env.DISABLE_EVENTS_AUTH !== 'true') {
  router.use(authMiddleware);
}

// POST /events - Create new event
router.post('/', createEvent);

// GET /events - Query events with filters and pagination
router.get('/', listEvents);

export default router;
