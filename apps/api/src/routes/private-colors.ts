import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';

// Walidacja dla update
const updatePrivateColorSchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * Endpointy dla kolorów prywatnych (zewnętrznych)
 * Kolory prywatne są automatycznie tworzone podczas importu uzyte_bele_prywatne
 * gdy kolor nie istnieje w tabeli Color (paleta Akrobud)
 */
export const privateColorRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/private-colors
   * Pobiera listę wszystkich kolorów prywatnych
   */
  fastify.get('/', {
    preHandler: verifyAuth,
  }, async (_request, reply) => {
    const colors = await prisma.privateColor.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orderRequirements: true,
          },
        },
      },
    });

    // Transformuj _count na usageCount
    const result = colors.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      usageCount: c._count.orderRequirements,
    }));

    return reply.send(result);
  });

  /**
   * PUT /api/private-colors/:id
   * Aktualizuje nazwę koloru prywatnego
   */
  fastify.put<{ Params: { id: string }; Body: { name: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    const validation = updatePrivateColorSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Nieprawidłowe dane',
        details: validation.error.errors,
      });
    }

    const { name } = validation.data;

    try {
      const updated = await prisma.privateColor.update({
        where: { id },
        data: { name },
      });

      return reply.send(updated);
    } catch {
      return reply.status(404).send({ error: 'Kolor nie znaleziony' });
    }
  });

  /**
   * DELETE /api/private-colors/:id
   * Usuwa kolor prywatny (tylko jeśli nie jest używany)
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    // Sprawdź czy kolor jest używany
    const usageCount = await prisma.orderRequirement.count({
      where: { privateColorId: id },
    });

    if (usageCount > 0) {
      return reply.status(400).send({
        error: `Nie można usunąć koloru - jest używany w ${usageCount} zleceniach`,
      });
    }

    try {
      await prisma.privateColor.delete({
        where: { id },
      });

      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Kolor nie znaleziony' });
    }
  });
};
