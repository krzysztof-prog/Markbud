/**
 * Attendance Routes - API endpoints for BZ module (monthly attendance)
 * Moduł BZ - widok miesięczny obecności pracowników
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { AttendanceService } from '../services/attendanceService.js';
import { AttendanceHandler } from '../handlers/attendanceHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja service i handler
  const service = new AttendanceService(prisma);
  const handler = new AttendanceHandler(service);

  // ============================================
  // ATTENDANCE ROUTES
  // ============================================

  // GET /attendance/monthly?year=2026&month=1 - Pobierz dane miesięczne
  fastify.get<{ Querystring: { year: string; month: string } }>(
    '/monthly',
    {
      preHandler: verifyAuth,
    },
    handler.getMonthlyAttendance.bind(handler)
  );

  // PUT /attendance/day - Aktualizuj pojedynczy dzień
  fastify.put<{ Body: { workerId: number; date: string; type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear' } }>(
    '/day',
    {
      preHandler: verifyAuth,
    },
    handler.updateDay.bind(handler)
  );

  // GET /attendance/export?year=2026&month=1&format=xlsx - Eksport do Excel/PDF
  fastify.get<{ Querystring: { year: string; month: string; format: string } }>(
    '/export',
    {
      preHandler: verifyAuth,
    },
    handler.exportAttendance.bind(handler)
  );
};
