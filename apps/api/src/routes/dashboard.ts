import type { FastifyPluginAsync } from 'fastify';
import {
  getDashboardData,
  getAlerts,
  getWeeklyStats,
  getMonthlyStats,
} from '../handlers/dashboard-handler.js';
import { getOperatorDashboard } from '../handlers/operatorDashboardHandler.js';
import { verifyAuth } from '../middleware/auth.js';
import type { MonthlyStatsQuery } from '../validators/dashboard.js';
import type { OperatorDashboardQuery } from '../validators/operator-dashboard.js';

/**
 * Dashboard Routes
 *
 * Clean route definitions that delegate to handlers.
 * All business logic has been extracted to:
 * - handlers/dashboard-handler.ts (HTTP handling)
 * - handlers/operatorDashboardHandler.ts (operator dashboard)
 * - services/dashboard-service.ts (business logic)
 * - services/operatorDashboardService.ts (operator dashboard logic)
 * - repositories/DashboardRepository.ts (data access)
 * - repositories/OperatorDashboardRepository.ts (operator data access)
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

  // GET /api/dashboard/operator - Operator dashboard with completeness stats
  // Requires authentication - filters data by logged-in user
  fastify.get<{ Querystring: OperatorDashboardQuery }>(
    '/operator',
    {
      preHandler: verifyAuth,
      schema: {
        description: 'Get operator dashboard with completeness statistics',
        tags: ['dashboard'],
        querystring: {
          type: 'object',
          properties: {
            filterByUser: {
              type: 'string',
              enum: ['true', 'false'],
              default: 'true',
              description: 'Filter orders by logged-in user (false = all orders, KIEROWNIK+ only)',
            },
          },
        },
      },
    },
    getOperatorDashboard
  );
};
