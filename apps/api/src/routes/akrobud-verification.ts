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

  // GET /api/akrobud-verification/:id - Pobierz listę po ID
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    { preHandler: verifyAuth },
    handler.getById.bind(handler)
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
