/**
 * Routes dla DeliveryEmailAlert - ręczne wyzwalanie raportu emailowego o dostawach
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role-check.js';
import { DeliveryEmailAlertScheduler } from '../services/email/DeliveryEmailAlertScheduler.js';
import { EmailService } from '../services/email/EmailService.js';
import { prisma } from '../utils/prisma.js';

export const deliveryEmailAlertRoutes: FastifyPluginAsync = async (fastify) => {
  // Autoryzacja na wszystkie endpointy
  fastify.addHook('preHandler', verifyAuth);

  /**
   * POST /api/delivery-email-alerts/send
   * Ręcznie wyślij raport emailowy
   */
  fastify.post(
    '/send',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['delivery-email-alerts'],
        summary: 'Wyślij raport emailowy ręcznie',
        description: 'Ręcznie wygeneruj i wyślij raport o problemach w dostawach',
      },
    },
    async (_request, reply) => {
      const result = await DeliveryEmailAlertScheduler.manualTrigger();
      return reply.send(result);
    }
  );

  /**
   * GET /api/delivery-email-alerts/preview
   * Podgląd raportu HTML bez wysyłania
   */
  fastify.get(
    '/preview',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['delivery-email-alerts'],
        summary: 'Podgląd raportu emailowego',
        description: 'Wygeneruj podgląd raportu bez wysyłania',
      },
    },
    async (_request, reply) => {
      const result = await DeliveryEmailAlertScheduler.previewReport();
      return reply.send(result);
    }
  );

  /**
   * GET /api/delivery-email-alerts/status
   * Status schedulera
   */
  fastify.get(
    '/status',
    {
      schema: {
        tags: ['delivery-email-alerts'],
        summary: 'Status schedulera email alertów',
      },
    },
    async (_request, reply) => {
      return reply.send({
        isRunning: DeliveryEmailAlertScheduler.isStarted(),
        schedule: '8:00 i 14:00 (Europe/Warsaw)',
      });
    }
  );

  /**
   * POST /api/delivery-email-alerts/test-smtp
   * Test połączenia SMTP
   */
  fastify.post(
    '/test-smtp',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['delivery-email-alerts'],
        summary: 'Test połączenia SMTP',
      },
    },
    async (_request, reply) => {
      const emailService = new EmailService(prisma);
      const result = await emailService.testConnection();
      return reply.send(result);
    }
  );
};
