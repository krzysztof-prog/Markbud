import type { FastifyRequest, FastifyReply } from 'fastify';
import { OperatorDashboardService } from '../services/operatorDashboardService.js';
import { operatorDashboardQuerySchema } from '../validators/operator-dashboard.js';
import { prisma } from '../index.js';

/**
 * OperatorDashboardHandler - HTTP handlers for operator dashboard
 *
 * Responsibilities:
 * - Handle HTTP request/response
 * - Validate query params
 * - Call service layer
 * - Check permissions (USER can only see own data)
 */

// Lazy singleton service instance
let service: OperatorDashboardService | null = null;

function getService(): OperatorDashboardService {
  if (!service) {
    service = new OperatorDashboardService(prisma);
  }
  return service;
}

/**
 * GET /api/dashboard/operator
 *
 * Pobiera dane dashboard operatora z prawdziwymi statystykami kompletnosci.
 *
 * Query params:
 * - filterByUser: 'true' | 'false' (domyslnie 'true')
 *   - true = tylko zlecenia zalogowanego uzytkownika
 *   - false = wszystkie zlecenia (tylko dla KIEROWNIK+)
 *
 * Permissions:
 * - USER moze widziec tylko swoje dane (filterByUser='true' wymuszony)
 * - KIEROWNIK/ADMIN/OWNER moga przelaczac miedzy swoimi a wszystkimi
 */
export async function getOperatorDashboard(
  request: FastifyRequest<{
    Querystring: { filterByUser?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  // Pobierz userId z tokenu JWT (zalogowany uzytkownik)
  const authUser = (request as any).user;

  if (!authUser?.id) {
    return reply.status(401).send({ error: 'Brak autoryzacji' });
  }

  // Walidacja query params
  const query = operatorDashboardQuerySchema.parse({
    filterByUser: request.query.filterByUser || 'true',
  });

  // Czy uzytkownik jest operatorem (USER)?
  const isOperator = authUser.role === 'user';

  // USER nie moze widziec wszystkich zlecen - wymuszamy filterByUser=true
  const filterByUser = isOperator ? true : query.filterByUser === 'true';

  // Pobierz dane z serwisu
  const data = await getService().getDashboardData(authUser.id, filterByUser);

  reply.send(data);
}
