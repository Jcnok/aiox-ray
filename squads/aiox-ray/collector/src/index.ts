import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import eventsRoutes from './routes/events';
import sseRoutes from './routes/sse';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { getConfig } from './config';
import { runMigrations } from './db/migrate';

// Initialize config
const config = getConfig();

// Run migrations on startup
runMigrations().catch((err) => {
  console.error('Failed to run migrations:', err);
  process.exit(1);
});

const app: Express = express();
const port = config.port;

// Initialize Pino logger
const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

// Middleware: Security headers
app.use(helmet());

// Middleware: Request logging
app.use(requestLogger);

// Middleware: HTTP logging
app.use(pinoHttp({ logger }));

// Middleware: CORS (allow localhost for dev)
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

// Middleware: Body parser (10KB limit to prevent abuse)
app.use(express.json({ limit: '10kb' }));

// Middleware: Rate limiting (1000 requests per minute)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Mount events routes
app.use('/events', eventsRoutes);

// Mount SSE routes
app.use('/events', sseRoutes);

// Serve React SPA static files
app.use(express.static('public'));

// SPA 404 fallback to index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile('public/index.html', { root: '.' });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`🚀 Collector service listening on port ${port}`);
});

export default app;
