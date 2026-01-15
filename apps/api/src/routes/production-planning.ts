/**
 * Production Planning Routes - Planowanie produkcji
 *
 * Endpointy:
 * - /efficiency-configs - Konfiguracja wydajności per typ klienta
 * - /settings - Parametry planowania
 * - /calendar - Kalendarz dni produkcyjnych
 * - /profiles/palletized - Oznaczanie profili jako paletyzowanych
 * - /colors/typical - Oznaczanie kolorów jako typowych
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { verifyAuth } from '../middleware/auth.js';
import { ProductionPlanningService } from '../services/productionPlanningService.js';
import { ProductionPlanningHandler } from '../handlers/productionPlanningHandler.js';

export const productionPlanningRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const service = new ProductionPlanningService(prisma);
  const handler = new ProductionPlanningHandler(service);

  // === Efficiency Configs ===

  fastify.get('/efficiency-configs', {
    preHandler: verifyAuth,
  }, handler.getAllEfficiencyConfigs.bind(handler));

  fastify.get<{ Params: { id: string } }>('/efficiency-configs/:id', {
    preHandler: verifyAuth,
  }, handler.getEfficiencyConfigById.bind(handler));

  fastify.post<{ Body: Record<string, unknown> }>('/efficiency-configs', {
    preHandler: verifyAuth,
  }, handler.createEfficiencyConfig.bind(handler));

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/efficiency-configs/:id', {
    preHandler: verifyAuth,
  }, handler.updateEfficiencyConfig.bind(handler));

  fastify.delete<{ Params: { id: string } }>('/efficiency-configs/:id', {
    preHandler: verifyAuth,
  }, handler.deleteEfficiencyConfig.bind(handler));

  // === Production Settings ===

  fastify.get('/settings', {
    preHandler: verifyAuth,
  }, handler.getAllSettings.bind(handler));

  fastify.get<{ Params: { key: string } }>('/settings/:key', {
    preHandler: verifyAuth,
  }, handler.getSettingByKey.bind(handler));

  fastify.post<{ Body: Record<string, unknown> }>('/settings', {
    preHandler: verifyAuth,
  }, handler.upsertSetting.bind(handler));

  fastify.put<{ Params: { key: string }; Body: Record<string, unknown> }>('/settings/:key', {
    preHandler: verifyAuth,
  }, handler.updateSetting.bind(handler));

  fastify.delete<{ Params: { key: string } }>('/settings/:key', {
    preHandler: verifyAuth,
  }, handler.deleteSetting.bind(handler));

  // === Production Calendar ===

  fastify.get<{ Querystring: { from: string; to: string } }>('/calendar', {
    preHandler: verifyAuth,
  }, handler.getCalendarDays.bind(handler));

  fastify.post<{ Body: Record<string, unknown> }>('/calendar', {
    preHandler: verifyAuth,
  }, handler.upsertCalendarDay.bind(handler));

  fastify.delete<{ Params: { date: string } }>('/calendar/:date', {
    preHandler: verifyAuth,
  }, handler.deleteCalendarDay.bind(handler));

  // === Profile isPalletized ===

  fastify.get('/profiles/palletized', {
    preHandler: verifyAuth,
  }, handler.getProfilesWithPalletized.bind(handler));

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/profiles/:id/palletized', {
    preHandler: verifyAuth,
  }, handler.updateProfilePalletized.bind(handler));

  fastify.patch<{ Body: Record<string, unknown> }>('/profiles/palletized/bulk', {
    preHandler: verifyAuth,
  }, handler.bulkUpdateProfilePalletized.bind(handler));

  // === Color isTypical ===

  fastify.get('/colors/typical', {
    preHandler: verifyAuth,
  }, handler.getColorsWithTypical.bind(handler));

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/colors/:id/typical', {
    preHandler: verifyAuth,
  }, handler.updateColorTypical.bind(handler));

  fastify.patch<{ Body: Record<string, unknown> }>('/colors/typical/bulk', {
    preHandler: verifyAuth,
  }, handler.bulkUpdateColorTypical.bind(handler));
};
