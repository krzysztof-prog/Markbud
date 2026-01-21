/**
 * Akrobud Verification Routes
 *
 * Endpointy API dla weryfikacji list dostaw Akrobud
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { AkrobudVerificationService } from '../services/akrobud-verification/index.js';
import { AkrobudVerificationHandler } from '../handlers/akrobudVerificationHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const akrobudVerificationRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja warstw
  const service = new AkrobudVerificationService(prisma);
  const handler = new AkrobudVerificationHandler(service);

  // ===================
  // List CRUD
  // ===================

  // GET /api/akrobud-verification - Pobierz wszystkie listy
  fastify.get<{
    Querystring: { deliveryDate?: string; status?: string };
  }>(
    '/',
    { preHandler: verifyAuth },
    handler.getAll.bind(handler)
  );

  // ===================
  // Project-based Operations (NEW)
  // ===================
  // UWAGA: Te route'y MUSZĄ być przed /:id aby Fastify je poprawnie rozpoznał

  // POST /api/akrobud-verification/parse-mail - Parsuj treść maila (preview)
  fastify.post<{
    Body: { rawInput: string };
  }>(
    '/parse-mail',
    { preHandler: verifyAuth },
    handler.parseMailContent.bind(handler)
  );

  // POST /api/akrobud-verification/preview-projects - Preview projektów
  fastify.post<{
    Body: { projects: string[] };
  }>(
    '/preview-projects',
    { preHandler: verifyAuth },
    handler.previewProjects.bind(handler)
  );

  // POST /api/akrobud-verification/versions - Utwórz nową wersję listy
  fastify.post<{
    Body: {
      deliveryDate: string;
      rawInput: string;
      projects: string[];
      parentId?: number;
    };
  }>(
    '/versions',
    { preHandler: verifyAuth },
    handler.createListVersion.bind(handler)
  );

  // GET /api/akrobud-verification/versions - Pobierz wersje dla daty
  fastify.get<{
    Querystring: { deliveryDate: string };
  }>(
    '/versions',
    { preHandler: verifyAuth },
    handler.getListVersions.bind(handler)
  );

  // POST /api/akrobud-verification/compare-versions - Porównaj wersje
  fastify.post<{
    Body: { listId1: number; listId2: number };
  }>(
    '/compare-versions',
    { preHandler: verifyAuth },
    handler.compareVersions.bind(handler)
  );

  // ===================
  // Single List by ID
  // ===================

  // GET /api/akrobud-verification/:id - Pobierz listę po ID
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    { preHandler: verifyAuth },
    handler.getById.bind(handler)
  );

  // GET /api/akrobud-verification/:id/versions - Historia wersji listy
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/versions',
    { preHandler: verifyAuth },
    handler.getListVersionHistory.bind(handler)
  );

  // POST /api/akrobud-verification/:id/verify-projects - Weryfikuj listę projektów
  fastify.post<{
    Params: { id: string };
    Body: { createDeliveryIfMissing?: boolean };
  }>(
    '/:id/verify-projects',
    { preHandler: verifyAuth },
    handler.verifyProjectList.bind(handler)
  );

  // POST /api/akrobud-verification - Utwórz listę
  fastify.post<{
    Body: { deliveryDate: string; title?: string; notes?: string };
  }>(
    '/',
    { preHandler: verifyAuth },
    handler.create.bind(handler)
  );

  // PUT /api/akrobud-verification/:id - Aktualizuj listę
  fastify.put<{
    Params: { id: string };
    Body: { deliveryDate?: string; title?: string | null; notes?: string | null };
  }>(
    '/:id',
    { preHandler: verifyAuth },
    handler.update.bind(handler)
  );

  // DELETE /api/akrobud-verification/:id - Usuń listę (soft delete)
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    { preHandler: verifyAuth },
    handler.delete.bind(handler)
  );

  // ===================
  // Items Management
  // ===================

  // POST /api/akrobud-verification/:id/items - Dodaj elementy do listy
  fastify.post<{
    Params: { id: string };
    Body: {
      items: Array<{ orderNumber: string }>;
      inputMode: 'textarea' | 'single';
    };
  }>(
    '/:id/items',
    { preHandler: verifyAuth },
    handler.addItems.bind(handler)
  );

  // POST /api/akrobud-verification/:id/items/parse - Parsuj tekst (preview)
  fastify.post<{
    Params: { id: string };
    Body: { text: string };
  }>(
    '/:id/items/parse',
    { preHandler: verifyAuth },
    handler.parseTextarea.bind(handler)
  );

  // DELETE /api/akrobud-verification/:id/items/:itemId - Usuń element
  fastify.delete<{
    Params: { id: string; itemId: string };
  }>(
    '/:id/items/:itemId',
    { preHandler: verifyAuth },
    handler.deleteItem.bind(handler)
  );

  // DELETE /api/akrobud-verification/:id/items - Wyczyść wszystkie elementy
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id/items',
    { preHandler: verifyAuth },
    handler.clearItems.bind(handler)
  );

  // ===================
  // Verification & Apply
  // ===================

  // POST /api/akrobud-verification/:id/verify - Weryfikuj listę
  fastify.post<{
    Params: { id: string };
    Body: { createDeliveryIfMissing?: boolean };
  }>(
    '/:id/verify',
    { preHandler: verifyAuth },
    handler.verify.bind(handler)
  );

  // POST /api/akrobud-verification/:id/apply - Zastosuj zmiany
  fastify.post<{
    Params: { id: string };
    Body: { addMissing?: number[]; removeExcess?: number[] };
  }>(
    '/:id/apply',
    { preHandler: verifyAuth },
    handler.applyChanges.bind(handler)
  );
};
