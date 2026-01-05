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
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'profiles', description: 'Aluminum profile management' },
        { name: 'colors', description: 'Color management and profile visibility' },
        { name: 'orders', description: 'Production order management' },
        { name: 'deliveries', description: 'Delivery planning and pallet optimization' },
        { name: 'warehouse', description: 'Warehouse stock management' },
        { name: 'warehouse-orders', description: 'Warehouse order tracking' },
        { name: 'pallets', description: 'Pallet management' },
        { name: 'imports', description: 'File import and processing' },
        { name: 'settings', description: 'Application settings' },
        { name: 'dashboard', description: 'Dashboard statistics and analytics' },
        { name: 'working-days', description: 'Working days calendar management' },
        { name: 'schuco', description: 'Schuco Connect integration' },
        { name: 'currency-config', description: 'Currency exchange rate configuration' },
        { name: 'monthly-reports', description: 'Monthly reporting' },
        { name: 'profile-depths', description: 'Profile depth management' },
        { name: 'glass-orders', description: 'Glass order tracking' },
        { name: 'glass-deliveries', description: 'Glass delivery management' },
        { name: 'glass-validations', description: 'Glass validation rules' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              statusCode: { type: 'number' },
            },
            required: ['error'],
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              orderNumber: { type: 'string' },
              status: { type: 'string' },
              deliveryDate: { type: 'string', format: 'date-time', nullable: true },
              valuePln: { type: 'number', nullable: true },
              valueEur: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Delivery: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              deliveryDate: { type: 'string', format: 'date-time' },
              deliveryNumber: { type: 'string', nullable: true },
              status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
              notes: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Profile: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              number: { type: 'string' },
              name: { type: 'string', nullable: true },
              articleNumber: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Color: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              code: { type: 'string' },
              name: { type: 'string', nullable: true },
              hexColor: { type: 'string', nullable: true },
              type: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
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
      persistAuthorization: true,
      filter: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Log swagger availability
  fastify.log.info('Swagger documentation available at /api/docs');
}
