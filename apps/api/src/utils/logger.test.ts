/**
 * Logger Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, pinoLogger, LogLevel } from './logger.js';

// Mock pino module
vi.mock('pino', () => {
  const mockPino = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => mockPino),
  };
  return {
    default: vi.fn(() => mockPino),
  };
});

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('debug', () => {
    it('should call pino debug with message only', () => {
      logger.debug('test message');
      expect(pinoLogger.debug).toHaveBeenCalledWith('test message');
    });

    it('should call pino debug with message and meta', () => {
      logger.debug('test message', { userId: 123 });
      expect(pinoLogger.debug).toHaveBeenCalledWith({ userId: 123 }, 'test message');
    });
  });

  describe('info', () => {
    it('should call pino info with message only', () => {
      logger.info('info message');
      expect(pinoLogger.info).toHaveBeenCalledWith('info message');
    });

    it('should call pino info with message and meta', () => {
      logger.info('info message', { action: 'create' });
      expect(pinoLogger.info).toHaveBeenCalledWith({ action: 'create' }, 'info message');
    });
  });

  describe('warn', () => {
    it('should call pino warn with message only', () => {
      logger.warn('warning message');
      expect(pinoLogger.warn).toHaveBeenCalledWith('warning message');
    });

    it('should call pino warn with message and meta', () => {
      logger.warn('warning message', { retryCount: 3 });
      expect(pinoLogger.warn).toHaveBeenCalledWith({ retryCount: 3 }, 'warning message');
    });
  });

  describe('error', () => {
    it('should call pino error with message only', () => {
      logger.error('error message');
      expect(pinoLogger.error).toHaveBeenCalledWith('error message');
    });

    it('should call pino error with message and Error object', () => {
      const error = new Error('Something went wrong');
      logger.error('error message', error);
      expect(pinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            message: 'Something went wrong',
            name: 'Error',
          }),
        }),
        'error message'
      );
    });

    it('should call pino error with message, error, and meta', () => {
      const error = new Error('Database error');
      logger.error('error message', error, { query: 'SELECT *' });
      expect(pinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'SELECT *',
          err: expect.objectContaining({
            message: 'Database error',
          }),
        }),
        'error message'
      );
    });

    it('should handle non-Error objects as error parameter', () => {
      logger.error('error message', 'string error');
      expect(pinoLogger.error).toHaveBeenCalledWith('error message');
    });
  });

  describe('log', () => {
    it('should route to debug for debug level', () => {
      logger.log('debug', 'debug via log');
      expect(pinoLogger.debug).toHaveBeenCalledWith('debug via log');
    });

    it('should route to info for info level', () => {
      logger.log('info', 'info via log');
      expect(pinoLogger.info).toHaveBeenCalledWith('info via log');
    });

    it('should route to warn for warn level', () => {
      logger.log('warn', 'warn via log');
      expect(pinoLogger.warn).toHaveBeenCalledWith('warn via log');
    });

    it('should route to error for error level', () => {
      logger.log('error', 'error via log');
      expect(pinoLogger.error).toHaveBeenCalledWith('error via log');
    });

    it('should pass meta through log method', () => {
      logger.log('info', 'info via log', { key: 'value' });
      expect(pinoLogger.info).toHaveBeenCalledWith({ key: 'value' }, 'info via log');
    });
  });

  describe('child', () => {
    it('should create child logger with bindings', () => {
      const bindings = { requestId: 'abc123' };
      logger.child(bindings);
      expect(pinoLogger.child).toHaveBeenCalledWith(bindings);
    });
  });

  describe('pinoInstance', () => {
    it('should return the underlying pino instance', () => {
      expect(logger.pinoInstance).toBe(pinoLogger);
    });
  });

  describe('LogLevel type', () => {
    it('should accept valid log levels', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      expect(levels).toHaveLength(4);
    });
  });
});
