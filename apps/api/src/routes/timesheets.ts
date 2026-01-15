/**
 * Timesheets Routes - API endpoints for production timesheets
 * Moduł godzinówek produkcyjnych
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { TimesheetsService } from '../services/timesheetsService.js';
import { TimesheetsHandler } from '../handlers/timesheetsHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const timesheetsRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize service and handler
  const service = new TimesheetsService(prisma);
  const handler = new TimesheetsHandler(service);

  // ============================================
  // WORKERS ROUTES
  // ============================================

  // GET /timesheets/workers - Lista pracowników
  fastify.get<{ Querystring: { isActive?: string } }>('/workers', {
    preHandler: verifyAuth,
  }, handler.getAllWorkers.bind(handler));

  // GET /timesheets/workers/:id - Szczegóły pracownika
  fastify.get<{ Params: { id: string } }>('/workers/:id', {
    preHandler: verifyAuth,
  }, handler.getWorkerById.bind(handler));

  // POST /timesheets/workers - Dodaj pracownika
  fastify.post<{ Body: Record<string, unknown> }>('/workers', {
    preHandler: verifyAuth,
  }, handler.createWorker.bind(handler));

  // PUT /timesheets/workers/:id - Aktualizuj pracownika
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/workers/:id', {
    preHandler: verifyAuth,
  }, handler.updateWorker.bind(handler));

  // DELETE /timesheets/workers/:id - Dezaktywuj pracownika (soft delete)
  fastify.delete<{ Params: { id: string } }>('/workers/:id', {
    preHandler: verifyAuth,
  }, handler.deactivateWorker.bind(handler));

  // ============================================
  // POSITIONS ROUTES
  // ============================================

  // GET /timesheets/positions - Lista stanowisk
  fastify.get<{ Querystring: { isActive?: string } }>('/positions', {
    preHandler: verifyAuth,
  }, handler.getAllPositions.bind(handler));

  // GET /timesheets/positions/:id - Szczegóły stanowiska
  fastify.get<{ Params: { id: string } }>('/positions/:id', {
    preHandler: verifyAuth,
  }, handler.getPositionById.bind(handler));

  // POST /timesheets/positions - Dodaj stanowisko
  fastify.post<{ Body: Record<string, unknown> }>('/positions', {
    preHandler: verifyAuth,
  }, handler.createPosition.bind(handler));

  // PUT /timesheets/positions/:id - Aktualizuj stanowisko
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/positions/:id', {
    preHandler: verifyAuth,
  }, handler.updatePosition.bind(handler));

  // ============================================
  // NON-PRODUCTIVE TASK TYPES ROUTES
  // ============================================

  // GET /timesheets/task-types - Lista typów zadań nieprodukcyjnych
  fastify.get<{ Querystring: { isActive?: string } }>('/task-types', {
    preHandler: verifyAuth,
  }, handler.getAllNonProductiveTaskTypes.bind(handler));

  // GET /timesheets/task-types/:id - Szczegóły typu zadania
  fastify.get<{ Params: { id: string } }>('/task-types/:id', {
    preHandler: verifyAuth,
  }, handler.getNonProductiveTaskTypeById.bind(handler));

  // POST /timesheets/task-types - Dodaj typ zadania
  fastify.post<{ Body: Record<string, unknown> }>('/task-types', {
    preHandler: verifyAuth,
  }, handler.createNonProductiveTaskType.bind(handler));

  // PUT /timesheets/task-types/:id - Aktualizuj typ zadania
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/task-types/:id', {
    preHandler: verifyAuth,
  }, handler.updateNonProductiveTaskType.bind(handler));

  // ============================================
  // SPECIAL WORK TYPES ROUTES (Nietypówki)
  // ============================================

  // GET /timesheets/special-work-types - Lista typów nietypówek
  fastify.get<{ Querystring: { isActive?: string } }>('/special-work-types', {
    preHandler: verifyAuth,
  }, handler.getAllSpecialWorkTypes.bind(handler));

  // GET /timesheets/special-work-types/:id - Szczegóły typu nietypówki
  fastify.get<{ Params: { id: string } }>('/special-work-types/:id', {
    preHandler: verifyAuth,
  }, handler.getSpecialWorkTypeById.bind(handler));

  // POST /timesheets/special-work-types - Dodaj typ nietypówki
  fastify.post<{ Body: Record<string, unknown> }>('/special-work-types', {
    preHandler: verifyAuth,
  }, handler.createSpecialWorkType.bind(handler));

  // PUT /timesheets/special-work-types/:id - Aktualizuj typ nietypówki
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/special-work-types/:id', {
    preHandler: verifyAuth,
  }, handler.updateSpecialWorkType.bind(handler));

  // PATCH /timesheets/special-work-types/:id/toggle - Przełącz aktywność typu nietypówki
  fastify.patch<{ Params: { id: string } }>('/special-work-types/:id/toggle', {
    preHandler: verifyAuth,
  }, handler.toggleSpecialWorkType.bind(handler));

  // ============================================
  // TIME ENTRIES ROUTES
  // ============================================

  // GET /timesheets/entries - Lista wpisów (z filtrowaniem po dacie/pracowniku)
  fastify.get<{
    Querystring: { date?: string; from?: string; to?: string; workerId?: string }
  }>('/entries', {
    preHandler: verifyAuth,
  }, handler.getTimeEntries.bind(handler));

  // GET /timesheets/entries/:id - Szczegóły wpisu
  fastify.get<{ Params: { id: string } }>('/entries/:id', {
    preHandler: verifyAuth,
  }, handler.getTimeEntryById.bind(handler));

  // POST /timesheets/entries - Dodaj wpis
  fastify.post<{ Body: Record<string, unknown> }>('/entries', {
    preHandler: verifyAuth,
  }, handler.createTimeEntry.bind(handler));

  // PUT /timesheets/entries/:id - Aktualizuj wpis
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/entries/:id', {
    preHandler: verifyAuth,
  }, handler.updateTimeEntry.bind(handler));

  // DELETE /timesheets/entries/:id - Usuń wpis
  fastify.delete<{ Params: { id: string } }>('/entries/:id', {
    preHandler: verifyAuth,
  }, handler.deleteTimeEntry.bind(handler));

  // ============================================
  // BULK OPERATIONS
  // ============================================

  // POST /timesheets/set-standard-day - Ustaw standardowy dzień dla wielu pracowników
  fastify.post<{ Body: Record<string, unknown> }>('/set-standard-day', {
    preHandler: verifyAuth,
  }, handler.setStandardDay.bind(handler));

  // POST /timesheets/set-absence-range - Ustaw nieobecność na zakres dat
  fastify.post<{ Body: Record<string, unknown> }>('/set-absence-range', {
    preHandler: verifyAuth,
  }, handler.setAbsenceRange.bind(handler));

  // ============================================
  // CALENDAR & SUMMARY
  // ============================================

  // GET /timesheets/calendar - Podsumowanie kalendarza na miesiąc
  fastify.get<{ Querystring: { year: string; month: string } }>('/calendar', {
    preHandler: verifyAuth,
  }, handler.getCalendarSummary.bind(handler));

  // GET /timesheets/day-summary - Podsumowanie dnia
  fastify.get<{ Querystring: { date: string } }>('/day-summary', {
    preHandler: verifyAuth,
  }, handler.getDaySummary.bind(handler));
};
