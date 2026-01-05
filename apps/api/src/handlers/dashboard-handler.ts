import type { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard-service.js';
import { monthlyStatsQuerySchema } from '../validators/dashboard.js';
import type { MonthlyStatsQuery } from '../validators/dashboard.js';
import { prisma } from '../index.js';

/**
 * DashboardHandler - HTTP request handlers for dashboard endpoints
 *
 * Responsibilities:
 * - Handle HTTP request/response
 * - Validate input (query params)
 * - Call service layer
 * - Handle errors and send appropriate responses
 */

// Lazy singleton service instance
let dashboardService: DashboardService | null = null;

function getService(): DashboardService {
  if (!dashboardService) {
    dashboardService = new DashboardService(prisma);
  }
  return dashboardService;
}

/**
 * GET /api/dashboard
 * Get main dashboard data (stats, deliveries, imports, shortages, orders)
 */
export async function getDashboardData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await getService().getDashboardData();
  reply.send(data);
}

/**
 * GET /api/dashboard/alerts
 * Get dashboard alerts (shortages, imports, deliveries)
 */
export async function getAlerts(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const alerts = await getService().getAlerts();
  reply.send(alerts);
}

/**
 * GET /api/dashboard/stats/weekly
 * Get weekly statistics for the next 8 weeks
 */
export async function getWeeklyStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const stats = await getService().getWeeklyStats();
  reply.send(stats);
}

/**
 * GET /api/dashboard/stats/monthly
 * Get monthly statistics (optional month/year query params)
 */
export async function getMonthlyStats(
  request: FastifyRequest<{ Querystring: MonthlyStatsQuery }>,
  reply: FastifyReply
): Promise<void> {
  // Walidacja przez .parse() - ZodError obsluzy middleware
  const query = monthlyStatsQuerySchema.parse(request.query);
  const stats = await getService().getMonthlyStats(query);
  reply.send(stats);
}
