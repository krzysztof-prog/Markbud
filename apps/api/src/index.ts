import Fastify from 'fastify';
import './types/fastify.js';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { config as dotenvConfig } from 'dotenv';
import { Prisma } from '@prisma/client';
import { prisma } from './utils/prisma.js';

// Routes
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { colorRoutes } from './routes/colors.js';
import { orderRoutes } from './routes/orders.js';
import { warehouseRoutes } from './routes/warehouse.js';
import { warehouseOrderRoutes } from './routes/warehouse-orders.js';
import { deliveryRoutes } from './routes/deliveries.js';
import { settingsRoutes } from './routes/settings.js';
import { importRoutes } from './routes/imports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { workingDaysRoutes } from './routes/working-days.js';
import schucoRoutes from './routes/schuco.js';
import { palletRoutes } from './routes/pallets.js';
import { currencyConfigRoutes } from './routes/currency-config.js';
import { monthlyReportsRoutes } from './routes/monthly-reports.js';
import { profileDepthRoutes } from './routes/profileDepths.js';
import { glassOrderRoutes } from './routes/glass-orders.js';
import { glassDeliveryRoutes } from './routes/glass-deliveries.js';
import { glassValidationRoutes } from './routes/glass-validations.js';
import { pendingOrderPriceCleanupRoutes } from './routes/pending-order-price-cleanup.js';
import { okucRoutes } from './routes/okuc.js';

// Services
import { FileWatcherService } from './services/file-watcher/index.js';
import { startSchucoScheduler, stopSchucoScheduler } from './services/schuco/schucoScheduler.js';
import { startPendingPriceCleanupScheduler, stopPendingPriceCleanupScheduler } from './services/pendingOrderPriceCleanupScheduler.js';
import { startImportLockCleanupScheduler, stopImportLockCleanupScheduler } from './services/importLockCleanupScheduler.js';
import { setupWebSocket } from './plugins/websocket.js';
import { setupSwagger } from './plugins/swagger.js';

// Utils and middleware
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { setupErrorHandler } from './middleware/error-handler.js';
import { setupRequestLogging } from './middleware/request-logger.js';

// Załaduj zmienne środowiskowe
dotenvConfig();

// Re-export prisma from utils for backwards compatibility
export { prisma } from "./utils/prisma.js";

// FileWatcher - eksportowany do restartu z API
export let fileWatcher: FileWatcherService | null = null;

// Inicjalizacja Fastify
const fastify = Fastify({
  logger: config.isDev,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  disableRequestLogging: false,
  trustProxy: true,
  requestTimeout: 240000, // 4 minutes for requests (including file uploads)
  bodyLimit: 10 * 1024 * 1024, // 10MB body limit (matches multipart fileSize)
  keepAliveTimeout: 65000, // Keep connection alive for 65 seconds
  connectionTimeout: 0, // Disable connection timeout (use requestTimeout instead)
});

// CORS
await fastify.register(cors, {
  origin: config.cors.allowedOrigins,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Multipart (file uploads)
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1, // Max 1 file per request
    fields: 10, // Max 10 fields (metadata)
    fieldNameSize: 100, // Max 100 bytes for field names
    fieldSize: 1000000, // Max 1MB for field values
    headerPairs: 2000, // Max 2000 header pairs
  },
  attachFieldsToBody: false, // Don't attach fields to body automatically
  throwFileSizeLimit: true, // Throw error if file too large
});

// Compression (gzip/deflate) - reduces payload size by ~70%
await fastify.register(compress, {
  global: true,
  threshold: 1024, // Only compress responses > 1KB
  encodings: ['gzip', 'deflate'],
  // Don't compress already compressed formats
  customTypes: /^text\/|application\/json|application\/javascript|application\/xml/,
});

// Rate Limiting - protect from abuse
await fastify.register(rateLimit, {
  global: true,
  max: 100, // Max 100 requests per window
  timeWindow: '15 minutes', // 15-minute window
  cache: 10000, // Cache 10k IPs
  allowList: ['127.0.0.1'], // Whitelist localhost (for dev)
  redis: undefined, // Can be replaced with Redis for distributed systems
  skipOnError: true, // Don't fail if rate limiter fails
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
});

// Dekoratory - dodaj Prisma do kontekstu
fastify.decorate('prisma', prisma);

// Setup Swagger documentation
// TEMP DISABLED: await setupSwagger(fastify);

// Setup request logging (for production monitoring)
if (!config.isDev) {
  setupRequestLogging(fastify);
}

// Setup error handler (BEFORE routes)
setupErrorHandler(fastify);

// Hook: ustaw Content-Type z charset dla JSON responses
fastify.addHook('onSend', async (request, reply) => {
  if (!reply.getHeader('content-type')) {
    reply.header('Content-Type', 'application/json; charset=utf-8');
  }
});

// Setup WebSocket
await setupWebSocket(fastify);

// Rejestracja routów
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(profileRoutes, { prefix: '/api/profiles' });
await fastify.register(colorRoutes, { prefix: '/api/colors' });
await fastify.register(orderRoutes, { prefix: '/api/orders' });
await fastify.register(warehouseRoutes, { prefix: '/api/warehouse' });
await fastify.register(warehouseOrderRoutes, { prefix: '/api/warehouse-orders' });
await fastify.register(deliveryRoutes, { prefix: '/api/deliveries' });
await fastify.register(settingsRoutes, { prefix: '/api/settings' });
await fastify.register(importRoutes, { prefix: '/api/imports' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
await fastify.register(workingDaysRoutes, { prefix: '/api/working-days' });
await fastify.register(schucoRoutes, { prefix: '/api/schuco' });
await fastify.register(palletRoutes, { prefix: '/api/pallets' });
await fastify.register(currencyConfigRoutes, { prefix: '/api/currency-config' });
await fastify.register(monthlyReportsRoutes, { prefix: '/api/monthly-reports' });
await fastify.register(profileDepthRoutes, { prefix: '/api/profile-depths' });

// Glass Tracking Routes
await fastify.register(glassOrderRoutes, { prefix: '/api/glass-orders' });
await fastify.register(glassDeliveryRoutes, { prefix: '/api/glass-deliveries' });
await fastify.register(glassValidationRoutes, { prefix: '/api/glass-validations' });

// Cleanup Routes
await fastify.register(pendingOrderPriceCleanupRoutes, { prefix: '/api/cleanup/pending-prices' });

// DualStock (Okuc) Routes
await fastify.register(okucRoutes, { prefix: '/api/okuc' });

// Health checks
fastify.get('/api/health', {
  schema: {
    description: 'Basic health check endpoint',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
        },
      },
    },
  },
}, async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment,
  };
});

// Readiness check (includes database connectivity)
fastify.get('/api/ready', {
  schema: {
    description: 'Readiness check including database connectivity',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          database: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
      503: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          database: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'not ready',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  stopSchucoScheduler();
  stopPendingPriceCleanupScheduler();
  stopImportLockCleanupScheduler();
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start serwera
const start = async () => {
  try {
    await fastify.listen({ port: config.api.port, host: '127.0.0.1' });

    logger.info(`Server started`, {
      url: `http://${config.api.host}:${config.api.port}`,
      environment: config.environment,
    });

    // Uruchom File Watcher
    fileWatcher = new FileWatcherService(prisma);
    await fileWatcher.start();

    // Uruchom Schuco Scheduler (pobieranie 3x dziennie: 8:00, 12:00, 15:00)
    startSchucoScheduler(prisma);

    // Uruchom Pending Price Cleanup Scheduler (czyszczenie codziennie o 2:00)
    startPendingPriceCleanupScheduler(prisma);

    // Uruchom Import Lock Cleanup Scheduler (czyszczenie co godzinę)
    startImportLockCleanupScheduler(prisma);

  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  start();
}
