import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import eventsRoutes from '../../src/routes/events';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';
import { query } from '../../src/db/client';

// Mock database for testing
let app: express.Express;

describe('Events API - Integration Tests', () => {
  beforeAll(() => {
    // Set up test environment
    process.env.COLLECTOR_TOKEN = 'test-token-123';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/aiox_ray_test';
    process.env.NODE_ENV = 'test';

    // Create Express app for testing
    app = express();

    const logger = pino({ level: 'silent' });

    app.use(helmet());
    app.use(pinoHttp({ logger }));
    app.use(cors());
    app.use(express.json({ limit: '10kb' }));

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 10000,
    });
    app.use(limiter);

    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    app.use('/events', eventsRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('POST /events', () => {
    it('should reject request without Authorization header (401)', async () => {
      const response = await request(app)
        .post('/events')
        .set('Content-Type', 'application/json')
        .send({
          event_type: 'agent.started',
          agent_id: 'dev',
          timestamp: new Date().toISOString(),
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_AUTH');
    });

    it('should reject request with invalid token (403)', async () => {
      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer invalid-token')
        .set('Content-Type', 'application/json')
        .send({
          event_type: 'agent.started',
          agent_id: 'dev',
          timestamp: new Date().toISOString(),
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should accept valid event with Bearer token (201)', async () => {
      const validEvent = {
        event_type: 'agent.started',
        agent_id: 'dev',
        timestamp: '2026-03-13T10:00:00Z',
        execution_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(validEvent);

      expect(response.status).toBe(201);
      expect(response.body.event_id).toBeDefined();
      expect(response.body.status).toBe('accepted');
    });

    it('should reject event with missing required field (400)', async () => {
      const invalidEvent = {
        event_type: 'agent.started',
        // Missing agent_id
        timestamp: '2026-03-13T10:00:00Z',
        execution_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid event_type (400)', async () => {
      const invalidEvent = {
        event_type: 'invalid.event.type',
        agent_id: 'dev',
        timestamp: '2026-03-13T10:00:00Z',
        execution_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject event with invalid timestamp format (400)', async () => {
      const invalidEvent = {
        event_type: 'agent.started',
        agent_id: 'dev',
        timestamp: 'not-a-timestamp',
        execution_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject event with invalid UUID (400)', async () => {
      const invalidEvent = {
        event_type: 'agent.started',
        agent_id: 'dev',
        timestamp: '2026-03-13T10:00:00Z',
        execution_id: 'not-a-uuid',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept event with optional fields', async () => {
      const eventWithOptionals = {
        event_type: 'agent.finished',
        agent_id: 'qa',
        timestamp: '2026-03-13T10:05:00Z',
        execution_id: '550e8400-e29b-41d4-a716-446655440001',
        duration_ms: 5000,
        payload: { result: 'success', details: 'Test passed' },
        version: '1.0.0',
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer test-token-123')
        .set('Content-Type', 'application/json')
        .send(eventWithOptionals);

      expect(response.status).toBe(201);
      expect(response.body.event_id).toBeDefined();
    });
  });

  describe('GET /events', () => {
    it('should reject request without Authorization header (401)', async () => {
      const response = await request(app).get('/events');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_AUTH');
    });

    it('should return paginated events (200)', async () => {
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.events).toBeDefined();
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
    });

    it('should filter events by agent_id', async () => {
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ agent_id: 'dev' });

      expect(response.status).toBe(200);
      if (response.body.events.length > 0) {
        response.body.events.forEach((event: any) => {
          expect(event.agent_id).toBe('dev');
        });
      }
    });

    it('should filter events by event_type', async () => {
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ event_type: 'agent.started' });

      expect(response.status).toBe(200);
      if (response.body.events.length > 0) {
        response.body.events.forEach((event: any) => {
          expect(event.event_type).toBe('agent.started');
        });
      }
    });

    it('should filter events by execution_id', async () => {
      const executionId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ execution_id: executionId });

      expect(response.status).toBe(200);
      if (response.body.events.length > 0) {
        response.body.events.forEach((event: any) => {
          expect(event.execution_id).toBe(executionId);
        });
      }
    });

    it('should validate pagination limit (400)', async () => {
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ limit: 2000 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should validate pagination offset (400)', async () => {
      const response = await request(app)
        .get('/events')
        .set('Authorization', 'Bearer test-token-123')
        .query({ offset: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PAGINATION');
    });
  });

  describe('GET /health', () => {
    it('should return health status (200)', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/undefined-route')
        .set('Authorization', 'Bearer test-token-123');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
