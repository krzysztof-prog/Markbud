import type { FastifyPluginAsync } from 'fastify';
import {
  getDashboardData,
  getAlerts,
  getWeeklyStats,
  getMonthlyStats,
} from '../handlers/dashboard-handler.js';
import type { MonthlyStatsQuery } from '../validators/dashboard.js';

/**
 * Dashboard Routes
 *
 * Clean route definitions that delegate to handlers.
 * All business logic has been extracted to:
 * - handlers/dashboard-handler.ts (HTTP handling)
 * - services/dashboard-service.ts (business logic)
 * - repositories/DashboardRepository.ts (data access)
 *
 * NOTE: No authentication required - single-user system
 */
export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard - Main dashboard data
  fastify.get('/', getDashboardData);

  // GET /api/dashboard/alerts - Dashboard alerts
  fastify.get('/alerts', getAlerts);

  // GET /api/dashboard/stats/weekly - Weekly statistics (8 weeks)
  fastify.get('/stats/weekly', getWeeklyStats);

  // GET /api/dashboard/stats/monthly - Monthly statistics
  fastify.get<{ Querystring: MonthlyStatsQuery }>(
    '/stats/monthly',
    getMonthlyStats
  );
};
