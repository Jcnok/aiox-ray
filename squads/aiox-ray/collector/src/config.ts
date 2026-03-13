import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface Config {
  port: number;
  databaseUrl: string;
  collectorToken: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Load and validate environment variables
 * Throws error if required variables are missing
 */
export function loadConfig(): Config {
  const config: Config = {
    port: parseInt(process.env.PORT || '3001', 10),
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/aiox_ray',
    collectorToken: process.env.COLLECTOR_TOKEN || '',
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  };

  // Validate required variables
  if (!config.collectorToken) {
    logger.error('COLLECTOR_TOKEN environment variable is required');
    throw new Error('COLLECTOR_TOKEN is required');
  }

  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    logger.error(`Invalid PORT: ${process.env.PORT}`);
    throw new Error('PORT must be a valid port number (1-65535)');
  }

  // Log config (without sensitive values)
  logger.info(
    {
      port: config.port,
      databaseUrl: config.databaseUrl.replace(/:[^:]*@/, ':***@'),
      logLevel: config.logLevel,
      nodeEnv: config.nodeEnv,
    },
    'Configuration loaded'
  );

  return config;
}

// Singleton instance
let configInstance: Config | null = null;

/**
 * Get config singleton
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset config (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
