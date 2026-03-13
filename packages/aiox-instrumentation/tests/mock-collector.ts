/**
 * Mock Collector Endpoint for Performance Testing
 * Story 1.6: Provides a standalone HTTP server that accepts events
 *
 * Used during performance benchmarks to avoid network I/O variability
 * Returns 201 immediately without database persistence
 */

import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Mock Collector Statistics
 */
interface CollectorStats {
  eventsReceived: number;
  requestsReceived: number;
  lastReceivedAt: Date | null;
  averageResponseTime: number; // milliseconds
  totalResponseTime: number; // milliseconds
}

/**
 * Mock Collector Server
 */
export class MockCollector {
  private app: Express;
  private stats: CollectorStats = {
    eventsReceived: 0,
    requestsReceived: 0,
    lastReceivedAt: null,
    averageResponseTime: 0,
    totalResponseTime: 0,
  };
  private server: any = null;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = this.createApp();
  }

  /**
   * Create Express app with mock endpoints
   */
  private createApp(): Express {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });

    // Mock POST /events endpoint
    app.post('/events', (req: Request, res: Response) => {
      const startTime = Date.now();

      // Track statistics
      this.stats.requestsReceived++;
      this.stats.lastReceivedAt = new Date();

      // Count events in payload
      if (Array.isArray(req.body)) {
        this.stats.eventsReceived += req.body.length;
      } else if (req.body && typeof req.body === 'object') {
        this.stats.eventsReceived += 1;
      }

      // Return 201 Created immediately
      res.status(201).json({
        id: `event-${Date.now()}`,
        received: true,
      });

      // Track response time
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.averageResponseTime =
        this.stats.totalResponseTime / this.stats.requestsReceived;
    });

    // Stats endpoint (for testing/monitoring)
    app.get('/stats', (_req: Request, res: Response) => {
      res.status(200).json(this.stats);
    });

    // Reset stats endpoint
    app.post('/stats/reset', (_req: Request, res: Response) => {
      this.stats = {
        eventsReceived: 0,
        requestsReceived: 0,
        lastReceivedAt: null,
        averageResponseTime: 0,
        totalResponseTime: 0,
      };
      res.status(200).json({ message: 'Stats reset' });
    });

    return app;
  }

  /**
   * Start the mock collector server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🎯 Mock Collector listening on localhost:${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock collector server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err: any) => {
        if (err) {
          reject(err);
        } else {
          console.log('Mock Collector stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get current statistics
   */
  getStats(): CollectorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      eventsReceived: 0,
      requestsReceived: 0,
      lastReceivedAt: null,
      averageResponseTime: 0,
      totalResponseTime: 0,
    };
  }

  /**
   * Get port
   */
  getPort(): number {
    return this.port;
  }
}

/**
 * Global instance for test hooks
 */
let mockCollector: MockCollector | null = null;

/**
 * Start global mock collector (for beforeAll hook)
 */
export async function startMockCollector(port: number = 3001): Promise<MockCollector> {
  if (mockCollector) {
    return mockCollector;
  }

  mockCollector = new MockCollector(port);
  await mockCollector.start();
  return mockCollector;
}

/**
 * Stop global mock collector (for afterAll hook)
 */
export async function stopMockCollector(): Promise<void> {
  if (mockCollector) {
    await mockCollector.stop();
    mockCollector = null;
  }
}

/**
 * Get global mock collector instance
 */
export function getMockCollector(): MockCollector | null {
  return mockCollector;
}
