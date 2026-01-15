/**
 * Health Check Routes - Rozszerzony health check dla monitoringu
 */

import { FastifyInstance } from 'fastify';
import { withAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role-check.js';
import { checkAllSystems } from '../utils/healthChecks.js';
import { logger } from '../utils/logger.js';

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health/detailed
   * Szczegółowy health check - wszystkie systemy (tylko ADMIN)
   */
  fastify.get(
    '/detailed',
    {
      preHandler: [withAuth, requireAdmin],
      schema: {
        description: 'Szczegółowy health check wszystkich systemów (tylko ADMIN)',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              timestamp: { type: 'string' },
              environment: { type: 'string' },
              checks: { type: 'object' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const health = await checkAllSystems(fastify.prisma);
        return reply.code(200).send(health);
      } catch (error) {
        logger.error('Health check failed', error);
        return reply.code(500).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
