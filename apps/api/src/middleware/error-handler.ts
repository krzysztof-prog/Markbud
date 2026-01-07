/**
 * Global error handler middleware for Fastify
 */

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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

      // Log ALL errors for debugging
      console.error('🚨 [ErrorHandler] Error caught:', {
        name: error.name,
        message: error.message,
        statusCode: (error as FastifyError).statusCode,
        url: request.url,
        method: request.method,
        headers: request.headers
      });

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

        logger.warn('Błąd walidacji', {
          requestId,
          path: request.url,
          method: request.method,
          validation,
        });

        const response: ErrorResponse = {
          statusCode: 400,
          error: 'Nieprawidłowe dane',
          message: 'Walidacja nie powiodła się',
          code: 'VALIDATION_ERROR',
          validation,
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(400).send(response);
      }

      // Handle Prisma known errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaKnownError(error);

        logger.warn('Błąd Prisma', {
          requestId,
          prismaCode: error.code,
          statusCode: prismaError.statusCode,
          path: request.url,
          method: request.method,
        });

        const response: ErrorResponse = {
          statusCode: prismaError.statusCode,
          error: getErrorName(prismaError.statusCode),
          message: prismaError.message,
          code: prismaError.code,
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(prismaError.statusCode).send(response);
      }

      // Handle Prisma validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        logger.warn('Błąd walidacji schematu Prisma', {
          requestId,
          path: request.url,
          method: request.method,
          error: error.message,
        });

        const response: ErrorResponse = {
          statusCode: 400,
          error: 'Nieprawidłowe dane',
          message: 'Błąd walidacji danych dla bazy',
          code: 'PRISMA_VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(400).send(response);
      }

      // Handle Prisma initialization errors
      if (error instanceof Prisma.PrismaClientInitializationError) {
        logger.error('Błąd inicjalizacji Prisma', {
          requestId,
          path: request.url,
          method: request.method,
          errorCode: error.errorCode,
        });

        const response: ErrorResponse = {
          statusCode: 503,
          error: 'Usługa niedostępna',
          message: 'Nie można połączyć z bazą danych',
          code: 'DATABASE_CONNECTION_ERROR',
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(503).send(response);
      }

      // Handle Prisma unknown errors
      if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        logger.error('Nieznany błąd Prisma', {
          requestId,
          path: request.url,
          method: request.method,
          error: error.message,
        });

        const response: ErrorResponse = {
          statusCode: 500,
          error: 'Błąd serwera',
          message: 'Wystąpił nieoczekiwany błąd bazy danych',
          code: 'DATABASE_UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(500).send(response);
      }

      // Handle Prisma Rust panic errors
      if (error instanceof Prisma.PrismaClientRustPanicError) {
        logger.error('Krytyczny błąd Prisma (Rust panic)', {
          requestId,
          path: request.url,
          method: request.method,
          error: error.message,
        });

        const response: ErrorResponse = {
          statusCode: 500,
          error: 'Błąd serwera',
          message: 'Krytyczny błąd bazy danych',
          code: 'DATABASE_CRITICAL_ERROR',
          timestamp: new Date().toISOString(),
          requestId,
        };

        return reply.status(500).send(response);
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
      logger.error('Nieobsłużony błąd', error, {
        requestId,
        path: request.url,
        method: request.method,
      });

      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      const response: ErrorResponse = {
        statusCode: 500,
        error: 'Błąd serwera',
        message: process.env.NODE_ENV === 'production' ? 'Wystąpił nieoczekiwany błąd' : errorMessage,
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
    400: 'Nieprawidłowe dane',
    401: 'Brak autoryzacji',
    403: 'Brak uprawnień',
    404: 'Nie znaleziono',
    409: 'Konflikt',
    500: 'Błąd serwera',
    503: 'Usługa niedostępna',
  };
  return names[statusCode] || 'Błąd';
}

/**
 * Obsługa znanych błędów Prisma
 */
function handlePrismaKnownError(error: Prisma.PrismaClientKnownRequestError): {
  message: string;
  code: string;
  statusCode: number;
} {
  switch (error.code) {
    case 'P2002': {
      // Naruszenie ograniczenia unikalności
      const target = error.meta?.target as string[] | undefined;
      const field = target ? target[0] : 'pole';
      return {
        message: `Rekord z wartością ${field} już istnieje`,
        code: 'CONFLICT',
        statusCode: 409,
      };
    }

    case 'P2025':
      // Rekord nie znaleziony
      return {
        message: 'Rekord nie został znaleziony',
        code: 'NOT_FOUND',
        statusCode: 404,
      };

    case 'P2003': {
      // Naruszenie klucza obcego
      const field = error.meta?.field_name as string | undefined;
      return {
        message: `Nieprawidłowe odniesienie: ${field || 'powiązany rekord'} nie istnieje`,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      };
    }

    case 'P2014':
      // Naruszenie wymaganej relacji
      return {
        message: 'Nie można usunąć rekordu posiadającego powiązane rekordy',
        code: 'CONFLICT',
        statusCode: 409,
      };

    case 'P2016':
      // Query interpretation error
      return {
        message: 'Błąd interpretacji zapytania do bazy danych',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };

    case 'P2021':
      // Table does not exist
      return {
        message: 'Tabela nie istnieje w bazie danych',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };

    case 'P2022':
      // Column does not exist
      return {
        message: 'Kolumna nie istnieje w bazie danych',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };

    default:
      // Nieznany błąd Prisma
      logger.error('Nieobsłużony kod błędu Prisma:', { code: error.code, meta: error.meta });
      return {
        message: 'Operacja bazodanowa nie powiodła się',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
  }
}
