import fs from 'fs';
import path from 'path';
import pino from 'pino';
import pool from './client';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Run all migrations in the migrations directory
 * Migrations are SQL files named in sequence: 001-*.sql, 002-*.sql, etc.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory not found: ${migrationsDir}`);
    return;
  }

  // Get all SQL files
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('No migrations found');
    return;
  }

  logger.info(`Found ${files.length} migration(s)`);

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Execute each migration
    for (const file of files) {
      const migrationName = file;
      const migrationPath = path.join(migrationsDir, file);

      // Check if migration has already been executed
      const result = await client.query('SELECT * FROM migrations WHERE name = $1', [migrationName]);

      if (result.rows.length > 0) {
        logger.info(`⏭️  Migration already executed: ${migrationName}`);
        continue;
      }

      // Read and execute migration
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      logger.info(`⏳ Executing migration: ${migrationName}`);

      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        logger.info(`✅ Migration completed: ${migrationName}`);
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : String(error), migration: migrationName },
          'Migration failed'
        );
        throw error;
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    logger.info('✅ All migrations completed successfully');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Migration rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations finished');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Migration failed');
      process.exit(1);
    });
}

export default runMigrations;
