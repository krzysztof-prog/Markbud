/**
 * Pallet Routes - API endpoints for pallet optimization
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { PalletOptimizerRepository } from '../repositories/PalletOptimizerRepository.js';
import { PalletOptimizerService } from '../services/pallet-optimizer/PalletOptimizerService.js';
import { PalletHandler } from '../handlers/palletHandler.js';

export const palletRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja zależności
  const repository = new PalletOptimizerRepository(prisma);
  const service = new PalletOptimizerService(repository);
  const handler = new PalletHandler(service);

  // ==================== OPTYMALIZACJA ====================

  /**
   * POST /api/pallets/optimize/:deliveryId
   * Uruchom optymalizację pakowania dla dostawy
   */
  fastify.post<{
    Params: { deliveryId: string };
  }>('/optimize/:deliveryId', async (request, reply) => {
    return handler.optimizeDelivery(request, reply);
  });

  /**
   * GET /api/pallets/optimization/:deliveryId
   * Pobierz zapisaną optymalizację
   */
  fastify.get<{
    Params: { deliveryId: string };
  }>('/optimization/:deliveryId', async (request, reply) => {
    return handler.getOptimization(request, reply);
  });

  /**
   * DELETE /api/pallets/optimization/:deliveryId
   * Usuń optymalizację
   */
  fastify.delete<{
    Params: { deliveryId: string };
  }>('/optimization/:deliveryId', async (request, reply) => {
    return handler.deleteOptimization(request, reply);
  });

  /**
   * GET /api/pallets/export/:deliveryId
   * Eksportuj optymalizację do PDF
   */
  fastify.get<{
    Params: { deliveryId: string };
  }>('/export/:deliveryId', async (request, reply) => {
    return handler.exportToPdf(request, reply);
  });

  // ==================== TYPY PALET ====================
  // (Opcjonalne - dla panelu administracyjnego)

  /**
   * GET /api/pallets/types
   * Pobierz wszystkie typy palet
   */
  fastify.get('/types', async (request, reply) => {
    return handler.getPalletTypes(request, reply);
  });

  /**
   * POST /api/pallets/types
   * Utwórz nowy typ palety
   */
  fastify.post<{
    Body: unknown;
  }>('/types', async (request, reply) => {
    return handler.createPalletType(request, reply);
  });

  /**
   * PATCH /api/pallets/types/:id
   * Zaktualizuj typ palety
   */
  fastify.patch<{
    Params: { id: string };
    Body: unknown;
  }>('/types/:id', async (request, reply) => {
    return handler.updatePalletType(request, reply);
  });

  /**
   * DELETE /api/pallets/types/:id
   * Usuń typ palety
   */
  fastify.delete<{
    Params: { id: string };
  }>('/types/:id', async (request, reply) => {
    return handler.deletePalletType(request, reply);
  });

  // ==================== REGUŁY PAKOWANIA ====================
  // (Opcjonalne - może być zaimplementowane później)

  /**
   * GET /api/pallets/rules
   * Pobierz reguły pakowania
   */
  fastify.get('/rules', async (request, reply) => {
    return handler.getPackingRules(request, reply);
  });

  /**
   * POST /api/pallets/rules
   * Utwórz nową regułę pakowania
   */
  fastify.post<{
    Body: unknown;
  }>('/rules', async (request, reply) => {
    return handler.createPackingRule(request, reply);
  });

  /**
   * PATCH /api/pallets/rules/:id
   * Zaktualizuj regułę pakowania
   */
  fastify.patch<{
    Params: { id: string };
    Body: unknown;
  }>('/rules/:id', async (request, reply) => {
    return handler.updatePackingRule(request, reply);
  });

  /**
   * DELETE /api/pallets/rules/:id
   * Usuń regułę pakowania
   */
  fastify.delete<{
    Params: { id: string };
  }>('/rules/:id', async (request, reply) => {
    return handler.deletePackingRule(request, reply);
  });
};
