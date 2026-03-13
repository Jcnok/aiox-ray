import { Pool, PoolClient } from 'pg';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/aiox_ray',
  min: 5, // Minimum connections
  max: 20, // Maximum connections
  idleTimeoutMillis: 10 * 1000, // 10 seconds idle timeout
  connectionTimeoutMillis: 3 * 1000, // 3 seconds connection timeout
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New connection established to database');
});

pool.on('error', (err) => {
  logger.error({ error: err.message }, 'Unexpected error on idle client in pool');
});

/**
 * Get a client from the pool
 */
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    logger.debug('Client acquired from pool');
    return client;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to acquire client from pool');
    throw new Error('Failed to connect to database');
  }
}

/**
 * Execute a query using pool
 */
export async function query(sql: string, params: any[] = []) {
  const client = await getClient();
  try {
    const result = await client.query(sql, params);
    logger.debug({ rowCount: result.rowCount }, 'Query executed successfully');
    return result;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), sql },
      'Query execution failed'
    );
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    logger.debug('Transaction committed');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Transaction rolled back');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown: drain pool on SIGTERM
 */
export async function shutdown(): Promise<void> {
  logger.info('Shutting down database pool...');
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error closing database pool');
    throw error;
  }
}

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections');
  await shutdown();
  process.exit(0);
});

export default pool;
