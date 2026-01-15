/**
 * Authentication handlers
 * Obsługa HTTP requestów związanych z uwierzytelnianiem
 *
 * UWAGA: Błędy są obsługiwane przez globalny error handler middleware
 * (error-handler.ts). Nie używamy tu try-catch - błędy są propagowane
 * do middleware który je odpowiednio formatuje i zwraca.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from '../validators/auth.js';
import * as authService from '../services/authService.js';
import { logger } from '../utils/logger.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * POST /auth/login
 * Logowanie użytkownika
 */
export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Walidacja danych wejściowych (błędy ZodError propagują do error handler)
  const input = loginSchema.parse(request.body);

  // Próba logowania
  const result = await authService.login(input);

  if (!result) {
    throw new UnauthorizedError('Nieprawidłowy email lub hasło');
  }

  // Sukces - zwróć token i dane użytkownika
  return reply.status(200).send(result);
}

/**
 * POST /auth/logout
 * Wylogowanie użytkownika
 *
 * Uwaga: JWT jest stateless, więc wylogowanie odbywa się po stronie klienta
 * (usunięcie tokenu z localStorage/cookies). Ten endpoint służy głównie do logowania.
 */
export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  logger.info('User logged out', {
    userId: (request as AuthenticatedRequest).user?.userId,
  });

  return reply.status(200).send({
    message: 'Wylogowano pomyślnie',
  });
}

/**
 * GET /auth/me
 * Pobierz dane aktualnie zalogowanego użytkownika
 */
export async function meHandler(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;

  if (!userId || typeof userId !== 'number') {
    throw new UnauthorizedError('Nie jesteś zalogowany');
  }

  const user = await authService.getCurrentUser(userId);

  if (!user) {
    throw new NotFoundError('Użytkownik');
  }

  return reply.status(200).send(user);
}
