/**
 * Moja Praca Routes - API endpoints for worker's personal workspace
 * Moduł "Moja Praca" - konflikty importu, zlecenia, dostawy, szyby
 */

import type { FastifyPluginAsync } from 'fastify';
import { mojaPracaHandler } from '../handlers/mojaPracaHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const mojaPracaRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // CONFLICTS ROUTES - Konflikty importu
  // ============================================

  // GET /moja-praca/conflicts - Lista konfliktów użytkownika
  fastify.get<{ Querystring: { status?: string } }>('/conflicts', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getConflicts);

  // GET /moja-praca/conflicts/count - Liczba konfliktów (dla badge w sidebar)
  fastify.get('/conflicts/count', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getConflictsCount);

  // GET /moja-praca/conflicts/:id - Szczegóły konfliktu z danymi bazowego zlecenia
  fastify.get<{ Params: { id: string } }>('/conflicts/:id', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getConflictDetail);

  // POST /moja-praca/conflicts/:id/resolve - Rozwiąż konflikt
  fastify.post<{
    Params: { id: string };
    Body: { action: string; targetOrderNumber?: string; notes?: string };
  }>('/conflicts/:id/resolve', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.resolveConflict);

  // POST /moja-praca/conflicts/bulk-resolve - Rozwiąż wiele konfliktów naraz
  fastify.post<{
    Body: { ids: number[]; action: string };
  }>('/conflicts/bulk-resolve', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.bulkResolveConflicts);

  // ============================================
  // ORDERS ROUTES - Zlecenia użytkownika
  // ============================================

  // GET /moja-praca/orders - Zlecenia użytkownika na dany dzień
  fastify.get<{ Querystring: { date?: string } }>('/orders', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getOrders);

  // ============================================
  // DELIVERIES ROUTES - Dostawy z kalendarz dostaw
  // ============================================

  // GET /moja-praca/deliveries - Dostawy zawierające zlecenia użytkownika
  fastify.get<{ Querystring: { date?: string } }>('/deliveries', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getDeliveries);

  // ============================================
  // GLASS ORDERS ROUTES - Zamówienia szyb
  // ============================================

  // GET /moja-praca/glass-orders - Zamówienia szyb dla zleceń użytkownika
  fastify.get<{ Querystring: { date?: string } }>('/glass-orders', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getGlassOrders);

  // ============================================
  // SUMMARY - Podsumowanie dnia
  // ============================================

  // GET /moja-praca/summary - Podsumowanie dnia dla użytkownika
  fastify.get<{ Querystring: { date?: string } }>('/summary', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getDaySummary);

  // ============================================
  // ALERTS - Alerty dla użytkownika
  // ============================================

  // GET /moja-praca/alerts - Wszystkie alerty (zlecenia bez cen + problemy z etykietami)
  fastify.get('/alerts', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getAlerts);

  // GET /moja-praca/alerts/orders-without-price - Zlecenia Akrobud w produkcji bez cen
  fastify.get('/alerts/orders-without-price', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getOrdersWithoutPrice);

  // GET /moja-praca/alerts/label-issues - Dostawy z problemami etykiet
  fastify.get('/alerts/label-issues', {
    preHandler: verifyAuth,
  }, mojaPracaHandler.getLabelIssues);
};
