import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Request logger middleware
 * Logs incoming requests and outgoing responses with timing
 * Attaches request ID for tracing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Attach request ID
  const requestId = uuidv4();
  (req as any).id = requestId;

  const startTime = Date.now();

  // Log incoming request
  logger.info(
    {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Incoming request'
  );

  // Hook into response finish
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;

    logger.info(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentType: res.get('content-type'),
      },
      'Request completed'
    );

    return originalSend.call(this, data);
  };

  next();
}
