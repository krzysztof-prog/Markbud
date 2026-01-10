/**
 * OkucLocation Handler - HTTP request handling for warehouse location management
 * Zarządzanie lokalizacjami magazynowymi dla okuć
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import {
  createOkucLocationSchema,
  updateOkucLocationSchema,
  reorderOkucLocationsSchema,
  okucLocationParamsSchema,
  type CreateOkucLocationInput,
  type UpdateOkucLocationInput,
} from '../../validators/okuc-location.js';

export const okucLocationHandler = {
  /**
   * GET /api/okuc/locations
   * Lista wszystkich aktywnych lokalizacji (bez deletedAt)
   * Posortowane po sortOrder, potem po nazwie
   * Zawiera liczbe artykulow przypisanych do kazdej lokalizacji
   */
  async list(_request: FastifyRequest, reply: FastifyReply) {
    const locations = await prisma.okucLocation.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    // Mapuj wyniki aby zwrocic articlesCount zamiast _count
    const result = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      sortOrder: loc.sortOrder,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
      articlesCount: loc._count.articles,
    }));

    return reply.status(200).send(result);
  },

  /**
   * POST /api/okuc/locations
   * Tworzenie nowej lokalizacji
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const validated = createOkucLocationSchema.parse(request.body);

    const location = await prisma.okucLocation.create({
      data: validated as CreateOkucLocationInput,
    });

    return reply.status(201).send(location);
  },

  /**
   * PATCH /api/okuc/locations/:id
   * Aktualizacja lokalizacji
   */
  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = okucLocationParamsSchema.parse(request.params);
    const validated = updateOkucLocationSchema.parse(request.body);

    // Sprawdź czy lokalizacja istnieje i nie jest usunięta
    const existing = await prisma.okucLocation.findFirst({
      where: {
        id: parseInt(id, 10),
        deletedAt: null,
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Lokalizacja nie została znaleziona' });
    }

    const location = await prisma.okucLocation.update({
      where: { id: parseInt(id, 10) },
      data: validated as UpdateOkucLocationInput,
    });

    return reply.status(200).send(location);
  },

  /**
   * DELETE /api/okuc/locations/:id
   * Soft delete - ustawia deletedAt zamiast usuwać rekord
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = okucLocationParamsSchema.parse(request.params);

    // Sprawdź czy lokalizacja istnieje i nie jest już usunięta
    const existing = await prisma.okucLocation.findFirst({
      where: {
        id: parseInt(id, 10),
        deletedAt: null,
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Lokalizacja nie została znaleziona' });
    }

    await prisma.okucLocation.update({
      where: { id: parseInt(id, 10) },
      data: { deletedAt: new Date() },
    });

    return reply.status(204).send();
  },

  /**
   * POST /api/okuc/locations/reorder
   * Zmiana kolejności lokalizacji
   * Przyjmuje tablicę IDs w nowej kolejności
   */
  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = reorderOkucLocationsSchema.parse(request.body);

    // Aktualizuj sortOrder dla każdej lokalizacji zgodnie z kolejnością w tablicy
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.okucLocation.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    // Zwróć zaktualizowaną listę
    const locations = await prisma.okucLocation.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return reply.status(200).send(locations);
  },
};
