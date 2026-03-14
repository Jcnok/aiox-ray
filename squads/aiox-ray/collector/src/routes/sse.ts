import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db/pool';
import pino from 'pino';

const logger = pino();
const router = Router();

// Track active SSE connections
const sseConnections = new Set<Response>();
const maxConnections = 100;

/**
 * GET /events/stream
 * Server-Sent Events endpoint for real-time event streaming
 */
router.get('/stream', (req: Request, res: Response, next: NextFunction) => {
  // Check connection limit
  if (sseConnections.size >= maxConnections) {
    logger.warn(`SSE: Connection limit (${maxConnections}) reached`);
    return res.status(429).json({ error: 'Too many connections' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for SSE

  // Add to connections set
  sseConnections.add(res);
  logger.info(`[SSE] Client connected (${sseConnections.size}/${maxConnections})`);

  // Handle client disconnect
  req.on('close', () => {
    sseConnections.delete(res);
    logger.info(`[SSE] Client disconnected (${sseConnections.size}/${maxConnections})`);
    res.end();
  });

  // Send welcome message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream connected' })}\n\n`);

  // Start polling for new events
  startPollingForEvents(res);
});

let lastEventId: string | null = null;

/**
 * Poll database for new events and stream them to clients
 */
function startPollingForEvents(res: Response): void {
  const pollInterval = setInterval(async () => {
    try {
      if (!res.writable) {
        clearInterval(pollInterval);
        return;
      }

      const pool = getPool();
      const query = `
        SELECT
          event_id,
          event_type,
          agent_id,
          execution_id,
          timestamp,
          duration_ms,
          payload
        FROM events
        WHERE event_id > $1
        ORDER BY timestamp ASC
        LIMIT 50
      `;

      const result = await pool.query(query, [lastEventId || '0']);

      // Stream events to client
      result.rows.forEach((row: any) => {
        const event: any = {
          event_id: row.event_id,
          event_type: row.event_type,
          agent_id: row.agent_id,
          execution_id: row.execution_id,
          timestamp: row.timestamp,
          duration_ms: row.duration_ms,
          payload: row.payload,
        };

        res.write(`data: ${JSON.stringify(event)}\n\n`);
        lastEventId = row.event_id;
      });
    } catch (error) {
      logger.error(`[SSE] Polling error: ${(error as Error).message}`);
      res.write(`: Error polling events\n\n`);
    }
  }, 500); // Poll every 500ms

  // Cleanup on response end
  res.on('end', () => {
    clearInterval(pollInterval);
  });

  res.on('error', () => {
    clearInterval(pollInterval);
  });
}

/**
 * Health check for SSE endpoint
 */
router.get('/stream-health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    activeConnections: sseConnections.size,
    maxConnections,
  });
});

export default router;
