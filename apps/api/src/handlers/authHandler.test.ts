/**
 * AuthHandler Unit Tests
 * Testy dla HTTP handlers uwierzytelniania
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const mockLogin = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockLoggerInfo = vi.hoisted(() => vi.fn());

// Mock authService
vi.mock('../services/authService.js', () => ({
  login: mockLogin,
  getCurrentUser: mockGetCurrentUser,
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { loginHandler, logoutHandler, meHandler } from './authHandler.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// Helper do tworzenia mock request/reply
function createMockRequest(body?: unknown, user?: { userId: number }): FastifyRequest {
  return {
    body,
    user,
  } as unknown as FastifyRequest;
}

function createAuthenticatedRequest(user?: { userId: number }): AuthenticatedRequest {
  return {
    user,
  } as unknown as AuthenticatedRequest;
}

function createMockReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply;
}

describe('AuthHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginHandler', () => {
    it('should return token and user data on successful login', async () => {
      const loginResult = {
        token: 'jwt-token',
        user: { id: 1, email: 'user@test.com', name: 'Test User', role: 'operator' },
      };
      mockLogin.mockResolvedValue(loginResult);

      const request = createMockRequest({ email: 'user@test.com', password: 'password123' });
      const reply = createMockReply();

      await loginHandler(request, reply);

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(loginResult);
    });

    it('should throw UnauthorizedError when login fails', async () => {
      mockLogin.mockResolvedValue(null);

      const request = createMockRequest({ email: 'user@test.com', password: 'wrongPassword' });
      const reply = createMockReply();

      await expect(loginHandler(request, reply)).rejects.toThrow(UnauthorizedError);
      await expect(loginHandler(request, reply)).rejects.toThrow('Nieprawidłowy email lub hasło');
    });

    it('should throw ZodError on invalid input (missing email)', async () => {
      const request = createMockRequest({ password: 'password123' });
      const reply = createMockReply();

      // ZodError is thrown by loginSchema.parse
      await expect(loginHandler(request, reply)).rejects.toThrow();
    });

    it('should throw ZodError on invalid input (invalid email format)', async () => {
      const request = createMockRequest({ email: 'not-an-email', password: 'password123' });
      const reply = createMockReply();

      await expect(loginHandler(request, reply)).rejects.toThrow();
    });

    it('should throw ZodError on empty body', async () => {
      const request = createMockRequest({});
      const reply = createMockReply();

      await expect(loginHandler(request, reply)).rejects.toThrow();
    });
  });

  describe('logoutHandler', () => {
    it('should return success message and log logout', async () => {
      const request = createMockRequest(undefined, { userId: 1 });
      const reply = createMockReply();

      await logoutHandler(request, reply);

      expect(mockLoggerInfo).toHaveBeenCalledWith('User logged out', { userId: 1 });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Wylogowano pomyślnie' });
    });

    it('should handle logout without user in request', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await logoutHandler(request, reply);

      expect(mockLoggerInfo).toHaveBeenCalledWith('User logged out', { userId: undefined });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Wylogowano pomyślnie' });
    });
  });

  describe('meHandler', () => {
    it('should return user data for authenticated user', async () => {
      const userData = { id: 1, email: 'user@test.com', name: 'Test User', role: 'operator' };
      mockGetCurrentUser.mockResolvedValue(userData);

      const request = createAuthenticatedRequest({ userId: 1 });
      const reply = createMockReply();

      await meHandler(request, reply);

      expect(mockGetCurrentUser).toHaveBeenCalledWith(1);
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(userData);
    });

    it('should throw UnauthorizedError when userId is missing', async () => {
      const request = createAuthenticatedRequest();
      const reply = createMockReply();

      await expect(meHandler(request, reply)).rejects.toThrow(UnauthorizedError);
      await expect(meHandler(request, reply)).rejects.toThrow('Nie jesteś zalogowany');
    });

    it('should throw UnauthorizedError when userId is not a number', async () => {
      const request = createAuthenticatedRequest({ userId: 'not-a-number' as unknown as number });
      const reply = createMockReply();

      await expect(meHandler(request, reply)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = createAuthenticatedRequest({ userId: 999 });
      const reply = createMockReply();

      await expect(meHandler(request, reply)).rejects.toThrow(NotFoundError);
    });

    it('should propagate database errors', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Database error'));

      const request = createAuthenticatedRequest({ userId: 1 });
      const reply = createMockReply();

      await expect(meHandler(request, reply)).rejects.toThrow('Database error');
    });
  });
});
