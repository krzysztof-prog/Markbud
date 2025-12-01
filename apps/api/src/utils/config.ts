/**
 * Centralized configuration management with validation
 */

export interface AppConfig {
  api: {
    port: number;
    host: string;
  };
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: {
    url: string;
  };
  environment: string;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
}

/**
 * Validates required environment variables
 */
function validateRequiredEnvVars() {
  const required: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    required.push('JWT_SECRET', 'DATABASE_URL');
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

function getConfig(): AppConfig {
  // Validate environment first
  validateRequiredEnvVars();

  const env = process.env.NODE_ENV || 'development';
  const isDev = env === 'development';
  const isProd = env === 'production';
  const isTest = env === 'test';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && isProd) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  // Validate port number
  const port = parseInt(process.env.API_PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid API_PORT: ${process.env.API_PORT}. Must be between 1 and 65535.`);
  }

  return {
    api: {
      port,
      host: process.env.API_HOST || 'localhost',
    },
    cors: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    },
    jwt: {
      secret: jwtSecret || 'dev-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    database: {
      url: process.env.DATABASE_URL || 'file:./dev.db',
    },
    environment: env,
    isDev,
    isProd,
    isTest,
  };
}

export const config = getConfig();
