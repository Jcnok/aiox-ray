import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Error handler middleware
 * Catches validation errors, DB errors, auth errors
 * Returns consistent error format without leaking DB details
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  // Log error with request context
  logger.error(
    {
      requestId,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
      timestamp,
    },
    'Request error'
  );

  // Return consistent error format
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      requestId,
      timestamp,
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const timestamp = new Date().toISOString();

  logger.warn(
    {
      path: req.path,
      method: req.method,
      timestamp,
    },
    'Route not found'
  );

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      timestamp,
    },
  });
}
