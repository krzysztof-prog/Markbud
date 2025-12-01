/**
 * Swagger/OpenAPI Configuration
 */

import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../utils/config.js';

export async function setupSwagger(fastify: FastifyInstance) {
  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'AKROBUD API',
        description: 'API documentation for AKROBUD warehouse management system',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${config.api.host}:${config.api.port}`,
          description: config.environment === 'production' ? 'Production server' : 'Development server',
        },
      ],
      tags: [
        { name: 'profiles', description: 'Profile management endpoints' },
        { name: 'colors', description: 'Color management endpoints' },
        { name: 'orders', description: 'Order management endpoints' },
        { name: 'deliveries', description: 'Delivery management endpoints' },
        { name: 'warehouse', description: 'Warehouse stock endpoints' },
        { name: 'settings', description: 'Application settings endpoints' },
        { name: 'dashboard', description: 'Dashboard data endpoints' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
}
