/**
 * Error Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  parseIntParam,
} from './errors.js';

describe('Error Utilities', () => {
  describe('NotFoundError', () => {
    it('should create NotFoundError with resource name', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User nie znaleziono');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create NotFoundError with different resource', () => {
      const error = new NotFoundError('Order');
      expect(error.message).toBe('Order nie znaleziono');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with message', () => {
      const error = new ValidationError('Validation failed');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with message and errors', () => {
      const errors = { email: ['Invalid email'], name: ['Required'] };
      const error = new ValidationError('Invalid fields', errors);
      expect(error.message).toBe('Invalid fields');
      expect(error.errors).toEqual(errors);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with message', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('should create ConflictError with custom message', () => {
      const error = new ConflictError('Email already taken');
      expect(error.message).toBe('Email already taken');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create ForbiddenError with custom message', () => {
      const error = new ForbiddenError('No access to this resource');
      expect(error.message).toBe('No access to this resource');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('InternalServerError', () => {
    it('should create InternalServerError with default message', () => {
      const error = new InternalServerError();
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('InternalServerError');
    });

    it('should create InternalServerError with custom message', () => {
      const error = new InternalServerError('Database connection failed');
      expect(error.message).toBe('Database connection failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('parseIntParam', () => {
    it('should parse valid integer string', () => {
      expect(parseIntParam('42', 'id')).toBe(42);
      expect(parseIntParam('0', 'count')).toBe(0);
      expect(parseIntParam('-10', 'offset')).toBe(-10);
    });

    it('should throw ValidationError for invalid integer', () => {
      expect(() => parseIntParam('abc', 'id')).toThrow(ValidationError);
      expect(() => parseIntParam('', 'value')).toThrow(ValidationError);
      expect(() => parseIntParam('not a number', 'count')).toThrow(ValidationError);
    });

    it('should include parameter name in error message', () => {
      try {
        parseIntParam('invalid', 'userId');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('userId');
      }
    });
  });
});
