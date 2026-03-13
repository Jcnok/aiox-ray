import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        authenticated: boolean;
        token?: string;
      };
    }
  }
}

/**
 * Authentication Middleware
 * Validates Bearer token from Authorization header
 * Against COLLECTOR_TOKEN environment variable
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader) {
    logger.warn({ path: req.path, method: req.method }, 'Missing Authorization header');
    return res.status(401).json({
      error: {
        code: 'MISSING_AUTH',
        message: 'Authorization header is required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Extract Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn({ authHeader }, 'Invalid Authorization header format');
    return res.status(401).json({
      error: {
        code: 'INVALID_AUTH_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const token = parts[1];
  const validToken = process.env.COLLECTOR_TOKEN;

  // Validate token against environment variable
  if (!validToken) {
    logger.error('COLLECTOR_TOKEN environment variable not set');
    return res.status(500).json({
      error: {
        code: 'CONFIG_ERROR',
        message: 'Server configuration error',
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (token !== validToken) {
    logger.warn({ tokenLength: token.length }, 'Invalid authentication token');
    return res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Token is valid, attach user context and proceed
  req.user = {
    authenticated: true,
    token: token,
  };

  logger.debug({ authenticated: true }, 'Authentication successful');
  next();
}

/**
 * Unit testable token validation function
 * Separates validation logic for easier testing
 */
export function validateToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  return token === expectedToken;
}
