/**
 * Bug Reports Routes - Zgłoszenia błędów od użytkowników
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { withAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role-check.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżka do pliku z logami zgłoszeń
// __dirname = apps/api/src/routes/ -> idziemy 2 poziomy w górę do apps/api/logs/
const BUG_REPORTS_LOG = path.join(__dirname, '../../logs/bug-reports.log');

// Walidacja zgłoszenia
const bugReportSchema = z.object({
  url: z.string().min(1, 'URL jest wymagany'),
  userAgent: z.string().min(1, 'UserAgent jest wymagany'),
  timestamp: z.string().min(1, 'Timestamp jest wymagany'),
  description: z.string().min(10, 'Opis musi mieć minimum 10 znaków').max(5000, 'Opis może mieć maksymalnie 5000 znaków'),
  screenshot: z.string().optional(), // Base64 encoded screenshot (opcjonalnie)
});

type BugReportInput = z.infer<typeof bugReportSchema>;

/**
 * Upewnij się że folder logs/ istnieje
 */
async function ensureLogsDirectory() {
  const logsDir = path.dirname(BUG_REPORTS_LOG);
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
    logger.info(`Created logs directory: ${logsDir}`);
  }
}

/**
 * Zapisz zgłoszenie do pliku log
 */
async function saveBugReport(data: BugReportInput, userEmail: string | undefined) {
  await ensureLogsDirectory();

  const entry = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐛 ZGŁOSZENIE BŁĘDU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data: ${data.timestamp}
Użytkownik: ${userEmail || 'Nieznany'}
URL: ${data.url}
UserAgent: ${data.userAgent}

Opis:
${data.description}

Screenshot: ${data.screenshot ? 'TAK (załączony)' : 'NIE'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  await fs.appendFile(BUG_REPORTS_LOG, entry, 'utf-8');
  logger.info('Bug report saved', { userEmail, url: data.url });
}

export async function bugReportRoutes(fastify: FastifyInstance) {
  /**
   * POST /bug-reports
   * Zgłoś problem/błąd w aplikacji
   */
  fastify.post(
    '/',
    {
      preHandler: withAuth,
      schema: {
        description: 'Zgłoś problem lub błąd w aplikacji',
        tags: ['bug-reports'],
        body: {
          type: 'object',
          required: ['url', 'userAgent', 'timestamp', 'description'],
          properties: {
            url: { type: 'string', description: 'URL strony gdzie wystąpił problem' },
            userAgent: { type: 'string', description: 'User agent przeglądarki' },
            timestamp: { type: 'string', description: 'Timestamp zgłoszenia (ISO 8601)' },
            description: {
              type: 'string',
              description: 'Opis problemu (min. 10, max 5000 znaków)',
              minLength: 10,
              maxLength: 5000,
            },
            screenshot: {
              type: 'string',
              description: 'Screenshot (base64) - opcjonalnie',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        // Walidacja
        const data = bugReportSchema.parse(request.body);

        // Zapisz zgłoszenie
        await saveBugReport(data, request.user?.email);

        return reply.code(200).send({
          success: true,
          message: 'Zgłoszenie zostało zapisane. Dziękujemy!',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Invalid bug report data', { errors: error.errors });
          return reply.code(400).send({
            error: 'Nieprawidłowe dane zgłoszenia',
            details: error.errors,
          });
        }

        logger.error('Failed to save bug report', error);
        return reply.code(500).send({
          error: 'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.',
        });
      }
    }
  );

  /**
   * GET /bug-reports
   * Pobierz ostatnie zgłoszenia (tylko ADMIN)
   */
  fastify.get(
    '/',
    {
      preHandler: [withAuth, requireAdmin],
      schema: {
        description: 'Pobierz ostatnie zgłoszenia błędów (tylko ADMIN)',
        tags: ['bug-reports'],
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Liczba ostatnich zgłoszeń do pobrania',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              content: { type: 'string', description: 'Zawartość pliku bug-reports.log' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Sprawdź czy plik istnieje
        try {
          await fs.access(BUG_REPORTS_LOG);
        } catch {
          return reply.code(200).send({
            success: true,
            content: 'Brak zgłoszeń.',
          });
        }

        // Odczytaj zawartość pliku
        const content = await fs.readFile(BUG_REPORTS_LOG, 'utf-8');

        return reply.code(200).send({
          success: true,
          content,
        });
      } catch (error) {
        logger.error('Failed to read bug reports', error);
        return reply.code(500).send({
          error: 'Nie udało się odczytać zgłoszeń',
        });
      }
    }
  );
}
