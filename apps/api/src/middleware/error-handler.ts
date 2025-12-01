/**
 * Global error handler middleware for Fastify
 */

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  validation?: Record<string, string[]>;
  timestamp: string;
  requestId?: string;
}

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    async (error: FastifyError | Error | AppError, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const validation: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!validation[path]) {
            validation[path] = [];
          }
          validation[path].push(err.message);
        });

        logger.warn('Validation error', {
          requestId,
          path: request.url,
          method: request.method,
          validation,
        });

        const response: ErrorResponse = {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          validation,
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(400).send(response);
      }

      // Handle custom AppError
      if (error instanceof AppError) {
        logger.warn(error.message, {
          requestId,
          statusCode: error.statusCode,
          code: error.code,
          path: request.url,
          method: request.method,
        });

        const response: ErrorResponse = {
          statusCode: error.statusCode,
          error: getErrorName(error.statusCode),
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(error.statusCode).send(response);
      }

      // Handle Fastify errors
      if ('statusCode' in error && error.statusCode) {
        logger.warn(error.message, {
          requestId,
          statusCode: error.statusCode,
          path: request.url,
          method: request.method,
        });

        const response: ErrorResponse = {
          statusCode: error.statusCode,
          error: getErrorName(error.statusCode),
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(error.statusCode).send(response);
      }

      // Handle unexpected errors
      logger.error('Unhandled error', error, {
        requestId,
        path: request.url,
        method: request.method,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const response: ErrorResponse = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : errorMessage,
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        requestId,
      };

      return reply.status(500).send(response);
    }
  );
}

function getErrorName(statusCode: number): string {
  const names: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
  };
  return names[statusCode] || 'Error';
}
