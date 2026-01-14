/**
 * User Routes - Zarządzanie użytkownikami (admin only)
 *
 * Endpointy:
 * - GET    /api/users       - Lista użytkowników
 * - GET    /api/users/:id   - Pobierz użytkownika
 * - POST   /api/users       - Stwórz użytkownika
 * - PUT    /api/users/:id   - Zaktualizuj użytkownika
 * - DELETE /api/users/:id   - Usuń użytkownika
 */

import type { FastifyInstance } from 'fastify';
import * as userHandler from '../handlers/userHandler';
import { withAuth } from '../middleware/auth';
import { requireUserManagement } from '../middleware/role-check';

export default async function userRoutes(fastify: FastifyInstance) {
  // Wszystkie endpointy wymagają autoryzacji + uprawnienia do zarządzania użytkownikami
  const preHandler = [withAuth, requireUserManagement];

  // GET /api/users - Lista użytkowników
  fastify.get('/', { preHandler }, userHandler.listUsersHandler);

  // GET /api/users/:id - Pobierz użytkownika
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler }, userHandler.getUserHandler);

  // POST /api/users - Stwórz użytkownika
  fastify.post('/', { preHandler }, userHandler.createUserHandler);

  // PUT /api/users/:id - Zaktualizuj użytkownika
  fastify.put<{ Params: { id: string } }>('/:id', { preHandler }, userHandler.updateUserHandler);

  // DELETE /api/users/:id - Usuń użytkownika
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler }, userHandler.deleteUserHandler);
}
