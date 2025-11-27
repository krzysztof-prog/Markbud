import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Routes
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

// Services
import { FileWatcherService } from './services/file-watcher.js';

// Załaduj zmienne środowiskowe
config();

// Inicjalizacja Prisma
export const prisma = new PrismaClient();

// Inicjalizacja Fastify
const fastify = Fastify({
  logger: true,
});

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(origin => origin.trim());
await fastify.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});

// Multipart (file uploads)
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Dekoratory - dodaj Prisma do kontekstu
fastify.decorate('prisma', prisma);

// Rejestracja routów
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

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start serwera
const start = async () => {
  try {
    const port = parseInt(process.env.API_PORT || '3001', 10);
    const host = process.env.API_HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 Serwer API uruchomiony na http://${host}:${port}`);

    // Uruchom File Watcher
    const fileWatcher = new FileWatcherService(prisma);
    await fileWatcher.start();

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
