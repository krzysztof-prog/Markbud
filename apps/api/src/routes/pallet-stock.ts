/**
 * Pallet Stock Routes - API endpoints for pallet stock management
 * Modul paletwek produkcyjnych - endpointy REST API
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { PalletStockService } from '../services/palletStockService.js';
import { PalletStockHandler } from '../handlers/palletStockHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const palletStockRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize service and handler
  const service = new PalletStockService(prisma);
  const handler = new PalletStockHandler(service);

  // ============================================
  // DAY ROUTES
  // ============================================

  // GET /pallet-stock/day/:date - Pobierz dane dnia paletowego
  fastify.get<{ Params: { date: string } }>('/day/:date', {
    preHandler: verifyAuth,
  }, handler.getDay.bind(handler));

  // PUT /pallet-stock/day/:date - Aktualizuj wpisy dnia paletowego
  fastify.put<{ Params: { date: string }; Body: unknown }>('/day/:date', {
    preHandler: verifyAuth,
  }, handler.updateDay.bind(handler));

  // POST /pallet-stock/day/:date/close - Zamknij dzien paletowy
  fastify.post<{ Params: { date: string } }>('/day/:date/close', {
    preHandler: verifyAuth,
  }, handler.closeDay.bind(handler));

  // POST /pallet-stock/day/:date/entries/:type/correct - Koryguj stan poczatkowy
  fastify.post<{
    Params: { date: string; type: string };
    Body: unknown;
  }>('/day/:date/entries/:type/correct', {
    preHandler: verifyAuth,
  }, handler.correctMorningStock.bind(handler));

  // ============================================
  // MONTH ROUTES
  // ============================================

  // GET /pallet-stock/month/:year/:month - Pobierz podsumowanie miesiaca
  fastify.get<{ Params: { year: string; month: string } }>('/month/:year/:month', {
    preHandler: verifyAuth,
  }, handler.getMonthSummary.bind(handler));

  // ============================================
  // ALERT CONFIG ROUTES
  // ============================================

  // GET /pallet-stock/alerts/config - Pobierz konfiguracje alertow
  fastify.get('/alerts/config', {
    preHandler: verifyAuth,
  }, handler.getAlertConfig.bind(handler));

  // PUT /pallet-stock/alerts/config - Aktualizuj konfiguracje alertow
  fastify.put<{ Body: unknown }>('/alerts/config', {
    preHandler: verifyAuth,
  }, handler.updateAlertConfig.bind(handler));
};
