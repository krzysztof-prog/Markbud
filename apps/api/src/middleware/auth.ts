/**
 * JWT authentication middleware
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string | number;
    email?: string;
  };
}

/**
 * Middleware to verify JWT token
 * Attaches user to request.user if token is valid
 *
 * NOTE: Temporarily disabled for single-user setup
 */
export async function verifyAuth(request: AuthenticatedRequest, _reply: FastifyReply) {
  // TEMPORARY: Skip auth for single-user system
  // Set a default system user
  request.user = {
    userId: 1,
    email: 'system@akrobud.local',
  };
  return;

  /* Original auth logic - commented out for single-user setup
  const token = extractToken(request.headers.authorization);

  if (!token) {
    throw new UnauthorizedError('Missing or invalid authorization token');
  }

  const payload = decodeToken(token);

  if (!payload) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Attach user to request
  request.user = {
    userId: payload.userId,
    email: payload.email,
  };
  */
}

/**
 * Hook: Verify token and attach user to request (optional)
 * Use this for routes that require authentication
 */
export async function withAuth(request: AuthenticatedRequest, reply: FastifyReply) {
  await verifyAuth(request, reply);
}
