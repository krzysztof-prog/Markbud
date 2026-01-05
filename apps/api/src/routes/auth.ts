/**
 * Authentication routes
 */

import { FastifyInstance } from 'fastify';
import { encodeToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /demo-token
   *
   * Generate a demo JWT token for development purposes
   *
   * IMPORTANT: This endpoint should be DISABLED in production!
   * It exists only to facilitate development and testing.
   */
  fastify.post('/demo-token', {
    config: {
      rateLimit: {
        max: 1000, // Very high limit for development
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    // Security check: only allow in development
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Attempt to access demo token endpoint in production', {
        ip: request.ip,
      });
      return reply.status(403).send({
        error: 'Demo token endpoint is disabled in production',
      });
    }

    try {
      // Generate a demo token valid for 24 hours
      const token = encodeToken({
        userId: 'demo-user',
        email: 'demo@akrobud.pl',
      });

      logger.info('Demo token generated', {
        ip: request.ip,
      });

      return reply.status(200).send({
        token,
        message: 'Demo token generated successfully',
        expiresIn: '24h',
      });
    } catch (error) {
      logger.error('Failed to generate demo token', { error });
      return reply.status(500).send({
        error: 'Failed to generate demo token',
      });
    }
  });
}
