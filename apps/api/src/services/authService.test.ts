/**
 * AuthService Unit Tests
 * Testy dla logiki uwierzytelniania: JWT, hashing, validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

// Hoisted mock - musi być hoisted aby być dostępny przed importami
const mockUserFindUnique = vi.hoisted(() => vi.fn());

// Mock prisma before imports - Vitest 4 requires class-based mocks
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      user = {
        findUnique: mockUserFindUnique,
      };
    },
  };
});

// Mock jwt utility
vi.mock('../utils/jwt.js', () => ({
  encodeToken: vi.fn().mockReturnValue('mocked-jwt-token'),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { login, getCurrentUser, hashPassword } from './authService.js';
import { encodeToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should return null when user does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await login({ email: 'nonexistent@test.com', password: 'password123' });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Login attempt with non-existent email',
        expect.objectContaining({ email: 'nonexistent@test.com' })
      );
    });

    it('should return null when password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      mockUserFindUnique.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        passwordHash: hashedPassword,
        name: 'Test User',
        role: 'operator',
      });

      const result = await login({ email: 'user@test.com', password: 'wrongPassword' });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Login attempt with invalid password',
        expect.objectContaining({ email: 'user@test.com' })
      );
    });

    it('should return token and user data on successful login', async () => {
      const password = 'correctPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        passwordHash: hashedPassword,
        name: 'Test User',
        role: 'operator',
      };
      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await login({ email: 'user@test.com', password });

      expect(result).not.toBeNull();
      expect(result?.token).toBe('mocked-jwt-token');
      expect(result?.user).toEqual({
        id: 1,
        email: 'user@test.com',
        name: 'Test User',
        role: 'operator',
      });
      expect(encodeToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'user@test.com',
      });
      expect(logger.info).toHaveBeenCalledWith(
        'User logged in successfully',
        expect.objectContaining({ userId: 1, email: 'user@test.com' })
      );
    });

    it('should throw error on database failure', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('Database connection error'));

      await expect(login({ email: 'user@test.com', password: 'password' })).rejects.toThrow(
        'Database connection error'
      );
      expect(logger.error).toHaveBeenCalledWith('Login error', expect.anything());
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data when user exists', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        name: 'Test User',
        role: 'operator',
      };
      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await getCurrentUser(1);

      expect(result).toEqual(mockUser);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    });

    it('should return null when user does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await getCurrentUser(999);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('User not found', { userId: 999 });
    });

    it('should throw error on database failure', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('Database error'));

      await expect(getCurrentUser(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching current user',
        expect.objectContaining({ userId: 1 })
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';

      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should produce different hash for same password (salted)', async () => {
      const password = 'testPassword123';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    });

    it('should produce verifiable hash', async () => {
      const password = 'testPassword123';

      const hash = await hashPassword(password);
      const isValid = await bcrypt.compare(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject wrong password against hash', async () => {
      const password = 'testPassword123';

      const hash = await hashPassword(password);
      const isValid = await bcrypt.compare('wrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });
});
