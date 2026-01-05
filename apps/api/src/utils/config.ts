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
  watchFolders: {
    okucRw: string;
    okucDemand: string;
  };
  environment: string;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
}

/**
 * Validates JWT_SECRET strength and requirements
 */
function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const defaultSecret = 'dev-secret-key-change-in-production';

  // PRODUCTION: Enforce strong secret
  if (isProduction) {
    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Please set a strong secret key in your .env file. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }

    if (secret === defaultSecret) {
      throw new Error(
        'Cannot use default JWT_SECRET in production! ' +
        'Please set a secure JWT_SECRET in your .env file. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }

    // Require minimum length for security
    if (secret.length < 32) {
      throw new Error(
        `JWT_SECRET must be at least 32 characters long in production. ` +
        `Current length: ${secret.length}. ` +
        'Generate a secure secret with: openssl rand -base64 32'
      );
    }
  }

  // DEVELOPMENT: Warning for default secret
  if (!isProduction && (!secret || secret === defaultSecret)) {
    console.warn(
      '\n⚠️  WARNING: Using default JWT_SECRET in development.\n' +
      '   This is acceptable for development but NEVER use this in production!\n' +
      '   Generate a secure secret with: openssl rand -base64 32\n'
    );
  }

  return secret || defaultSecret;
}

/**
 * Validates required environment variables
 */
function validateRequiredEnvVars() {
  const required: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    required.push('DATABASE_URL');
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

  // Validate and get JWT secret (will throw in production if invalid)
  const jwtSecret = validateJwtSecret();

  // Validate port number
  const port = parseInt(process.env.API_PORT || '4000', 10);
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
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    database: {
      url: process.env.DATABASE_URL || 'file:./dev.db',
    },
    watchFolders: {
      okucRw: process.env.WATCH_FOLDER_OKUC_RW || './okuc_rw',
      okucDemand: process.env.WATCH_FOLDER_OKUC_DEMAND || './okuc_zapotrzebowanie',
    },
    environment: env,
    isDev,
    isProd,
    isTest,
  };
}

export const config = getConfig();
