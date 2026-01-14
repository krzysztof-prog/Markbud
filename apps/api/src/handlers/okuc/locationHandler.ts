/**
 * OkucLocation Handler - HTTP request handling for warehouse location management
 * Zrefaktoryzowany: logika biznesowa przeniesiona do OkucLocationService
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { OkucLocationService } from '../../services/okuc/OkucLocationService.js';
import {
  createOkucLocationSchema,
  updateOkucLocationSchema,
  reorderOkucLocationsSchema,
  okucLocationParamsSchema,
  type CreateOkucLocationInput,
  type UpdateOkucLocationInput,
} from '../../validators/okuc-location.js';

const service = new OkucLocationService();

export const okucLocationHandler = {
  /**
   * GET /api/okuc/locations
   * Lista wszystkich aktywnych lokalizacji (bez deletedAt)
   * Posortowane po sortOrder, potem po nazwie
   * Zawiera liczbe artykulow przypisanych do kazdej lokalizacji
   */
  async list(_request: FastifyRequest, reply: FastifyReply) {
    const locations = await service.getAllLocations();
    return reply.status(200).send(locations);
  },

  /**
   * POST /api/okuc/locations
   * Tworzenie nowej lokalizacji
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const validated = createOkucLocationSchema.parse(request.body);
    const location = await service.createLocation(validated as CreateOkucLocationInput);
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

    const location = await service.updateLocation(parseInt(id, 10), validated as UpdateOkucLocationInput);
    return reply.status(200).send(location);
  },

  /**
   * DELETE /api/okuc/locations/:id
   * Soft delete - ustawia deletedAt zamiast usuwac rekord
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = okucLocationParamsSchema.parse(request.params);
    await service.deleteLocation(parseInt(id, 10));
    return reply.status(204).send();
  },

  /**
   * POST /api/okuc/locations/reorder
   * Zmiana kolejnosci lokalizacji
   * Przyjmuje tablice IDs w nowej kolejnosci
   */
  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = reorderOkucLocationsSchema.parse(request.body);
    const locations = await service.reorderLocations(ids);
    return reply.status(200).send(locations);
  },
};
