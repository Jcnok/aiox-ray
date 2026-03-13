import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { validateEvent } from '../services/validationService';
import { query } from '../db/client';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * POST /events handler
 * Accepts JSON event payload, validates, persists to database
 * Returns HTTP 201 with event_id on success, 400 on validation error, 500 on DB error
 */
export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    // Validate event schema
    const validation = validateEvent(req.body);

    if (!validation.valid) {
      logger.warn({ errors: validation.errors }, 'Event validation failed');
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const event = validation.event!;
    const eventId = uuidv4();

    // Insert event into database
    const sql = `
      INSERT INTO events (
        event_id,
        event_type,
        agent_id,
        execution_id,
        timestamp,
        duration_ms,
        payload,
        version,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING event_id
    `;

    const params = [
      eventId,
      event.event_type,
      event.agent_id,
      event.execution_id,
      event.timestamp,
      event.duration_ms || null,
      event.payload ? JSON.stringify(event.payload) : null,
      event.version || null,
    ];

    const result = await query(sql, params);

    logger.info(
      {
        eventId,
        eventType: event.event_type,
        agentId: event.agent_id,
      },
      'Event created successfully'
    );

    res.status(201).json({
      event_id: eventId,
      status: 'accepted',
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      },
      'Failed to create event'
    );

    // Do NOT leak database details in error response
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to persist event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * GET /events handler
 * Supports filters: agent_id, event_type, execution_id, start_time, end_time
 * Supports pagination: limit, offset
 * Returns paginated results with total count
 */
export async function listEvents(req: Request, res: Response): Promise<void> {
  try {
    // Parse query parameters
    const agentId = (req.query.agent_id as string) || null;
    const eventType = (req.query.event_type as string) || null;
    const executionId = (req.query.execution_id as string) || null;
    const startTime = (req.query.start_time as string) || null;
    const endTime = (req.query.end_time as string) || null;
    let limit = parseInt((req.query.limit as string) || '100', 10);
    let offset = parseInt((req.query.offset as string) || '0', 10);

    // Validate pagination parameters
    if (limit < 1 || limit > 1000) {
      res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: 'limit must be between 1 and 1000',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (offset < 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: 'offset must be non-negative',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Build WHERE clauses and parameters
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (agentId) {
      whereClauses.push(`agent_id = $${paramIndex++}`);
      params.push(agentId);
    }

    if (eventType) {
      whereClauses.push(`event_type = $${paramIndex++}`);
      params.push(eventType);
    }

    if (executionId) {
      whereClauses.push(`execution_id = $${paramIndex++}`);
      params.push(executionId);
    }

    if (startTime) {
      whereClauses.push(`timestamp >= $${paramIndex++}`);
      params.push(startTime);
    }

    if (endTime) {
      whereClauses.push(`timestamp <= $${paramIndex++}`);
      params.push(endTime);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total events matching filter
    const countSql = `SELECT COUNT(*) as count FROM events ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated events
    params.push(limit);
    params.push(offset);
    const sql = `
      SELECT
        event_id,
        event_type,
        agent_id,
        execution_id,
        timestamp,
        duration_ms,
        payload,
        version,
        created_at
      FROM events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    const result = await query(sql, params);

    logger.debug(
      {
        filters: { agentId, eventType, executionId, startTime, endTime },
        limit,
        offset,
        resultCount: result.rows.length,
        total,
      },
      'Events queried successfully'
    );

    res.status(200).json({
      events: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      },
      'Failed to query events'
    );

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to query events',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
