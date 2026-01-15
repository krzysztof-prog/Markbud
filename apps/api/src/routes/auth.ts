/**
 * Authentication routes
 */

import { FastifyInstance } from 'fastify';
import { loginHandler, logoutHandler, meHandler } from '../handlers/authHandler.js';
import { withAuth } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /login
   * Logowanie użytkownika
   */
  fastify.post('/login', loginHandler);

  /**
   * POST /logout
   * Wylogowanie użytkownika (wymaga autoryzacji)
   */
  fastify.post('/logout', { preHandler: withAuth }, logoutHandler);

  /**
   * GET /me
   * Pobierz dane aktualnie zalogowanego użytkownika
   */
  fastify.get('/me', { preHandler: withAuth }, meHandler);
}
