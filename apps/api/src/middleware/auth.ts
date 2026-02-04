/**
 * JWT authentication middleware
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { extractToken, decodeToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string | number;
    email?: string;
    role?: string;
  };
}

/**
 * Middleware to verify JWT token
 * Attaches user to request.user if token is valid
 */
export async function verifyAuth(request: AuthenticatedRequest, _reply: FastifyReply) {
  const token = extractToken(request.headers.authorization);

  if (!token) {
    throw new UnauthorizedError('Brak tokenu autoryzacji');
  }

  const payload = decodeToken(token);

  if (!payload) {
    throw new UnauthorizedError('Nieprawidłowy lub wygasły token');
  }

  // Attach user to request (includes role for authorization)
  request.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * Hook: Verify token and attach user to request (optional)
 * Use this for routes that require authentication
 */
export async function withAuth(request: AuthenticatedRequest, reply: FastifyReply) {
  await verifyAuth(request, reply);
}
