/**
 * Akrobud Verification Handler - Request/Response handling
 *
 * Obsługuje endpointy dla list weryfikacyjnych dostaw Akrobud
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AkrobudVerificationService } from '../services/akrobud-verification/index.js';
import {
  createVerificationListSchema,
  updateVerificationListSchema,
  addItemsSchema,
  parseTextareaSchema,
  verifyListSchema,
  applyChangesSchema,
  verificationListParamsSchema,
  verificationItemParamsSchema,
  verificationListQuerySchema,
} from '../validators/akrobud-verification.js';

export class AkrobudVerificationHandler {
  constructor(private service: AkrobudVerificationService) {}

  // ===================
  // List CRUD
  // ===================

  /**
   * GET /api/akrobud-verification
   * Pobiera wszystkie listy weryfikacyjne z opcjonalnymi filtrami
   */
  async getAll(
    request: FastifyRequest<{
      Querystring: { deliveryDate?: string; status?: string };
    }>,
    reply: FastifyReply
  ) {
    const validated = verificationListQuerySchema.parse(request.query);

    const filters: { deliveryDate?: Date; status?: string } = {};
    if (validated.deliveryDate) {
      filters.deliveryDate = new Date(validated.deliveryDate);
    }
    if (validated.status) {
      filters.status = validated.status;
    }

    const lists = await this.service.getAllLists(filters);
    return reply.send(lists);
  }

  /**
   * GET /api/akrobud-verification/:id
   * Pobiera pojedynczą listę z elementami
   */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    const list = await this.service.getList(parseInt(id));
    return reply.send(list);
  }

  /**
   * POST /api/akrobud-verification
   * Tworzy nową listę weryfikacyjną
   */
  async create(
    request: FastifyRequest<{
      Body: { deliveryDate: string; title?: string; notes?: string };
    }>,
    reply: FastifyReply
  ) {
    const validated = createVerificationListSchema.parse(request.body);
    const list = await this.service.createList(
      new Date(validated.deliveryDate),
      validated.title,
      validated.notes
    );
    return reply.status(201).send(list);
  }

  /**
   * PUT /api/akrobud-verification/:id
   * Aktualizuje listę
   */
  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { deliveryDate?: string; title?: string | null; notes?: string | null };
    }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    const validated = updateVerificationListSchema.parse(request.body);

    const updateData: {
      deliveryDate?: Date;
      title?: string | null;
      notes?: string | null;
    } = {};

    if (validated.deliveryDate) {
      updateData.deliveryDate = new Date(validated.deliveryDate);
    }
    if (validated.title !== undefined) {
      updateData.title = validated.title;
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes;
    }

    const list = await this.service.updateList(parseInt(id), updateData);
    return reply.send(list);
  }

  /**
   * DELETE /api/akrobud-verification/:id
   * Soft delete listy
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    await this.service.deleteList(parseInt(id));
    return reply.status(204).send();
  }

  // ===================
  // Items Management
  // ===================

  /**
   * POST /api/akrobud-verification/:id/items
   * Dodaje elementy do listy
   */
  async addItems(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        items: Array<{ orderNumber: string }>;
        inputMode: 'textarea' | 'single';
      };
    }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    const validated = addItemsSchema.parse(request.body);

    const result = await this.service.addItems(
      parseInt(id),
      validated.items,
      validated.inputMode
    );

    return reply.status(201).send(result);
  }

  /**
   * POST /api/akrobud-verification/:id/items/parse
   * Parsuje tekst z textarea na listę numerów zleceń
   * (Preview bez zapisywania)
   */
  async parseTextarea(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { text: string };
    }>,
    reply: FastifyReply
  ) {
    const validated = parseTextareaSchema.parse(request.body);
    const orderNumbers = this.service.parseTextareaInput(validated.text);

    return reply.send({
      orderNumbers,
      count: orderNumbers.length,
    });
  }

  /**
   * DELETE /api/akrobud-verification/:id/items/:itemId
   * Usuwa pojedynczy element z listy
   */
  async deleteItem(
    request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
    reply: FastifyReply
  ) {
    const { id, itemId } = verificationItemParamsSchema.parse(request.params);
    await this.service.deleteItem(parseInt(id), parseInt(itemId));
    return reply.status(204).send();
  }

  /**
   * DELETE /api/akrobud-verification/:id/items
   * Czyści wszystkie elementy z listy
   */
  async clearItems(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    await this.service.clearItems(parseInt(id));
    return reply.status(204).send();
  }

  // ===================
  // Verification
  // ===================

  /**
   * POST /api/akrobud-verification/:id/verify
   * Uruchamia weryfikację listy - porównuje z dostawą
   */
  async verify(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { createDeliveryIfMissing?: boolean };
    }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    const validated = verifyListSchema.parse(request.body ?? {});

    const result = await this.service.verify(
      parseInt(id),
      validated.createDeliveryIfMissing
    );

    return reply.send(result);
  }

  /**
   * POST /api/akrobud-verification/:id/apply
   * Aplikuje zmiany - dodaje/usuwa zlecenia z dostawy
   */
  async applyChanges(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { addMissing?: number[]; removeExcess?: number[] };
    }>,
    reply: FastifyReply
  ) {
    const { id } = verificationListParamsSchema.parse(request.params);
    const validated = applyChangesSchema.parse(request.body);

    const result = await this.service.applyChanges(
      parseInt(id),
      validated.addMissing,
      validated.removeExcess
    );

    return reply.send(result);
  }
}
