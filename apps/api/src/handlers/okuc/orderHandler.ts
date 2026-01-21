/**
 * OkucOrder Handler - HTTP request handling for order management (zamówienia do dostawców)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucOrderRepository } from '../../repositories/okuc/OkucOrderRepository.js';
import {
  createOkucOrderSchema,
  updateOkucOrderSchema,
  receiveOrderSchema,
  confirmOrderImportSchema,
} from '../../validators/okuc.js';
import { OkucOrderImportService } from '../../services/okuc/OkucOrderImportService.js';
import type { MultipartFile as _MultipartFile } from '@fastify/multipart';

const repository = new OkucOrderRepository(prisma);
const importService = new OkucOrderImportService(prisma);

export const okucOrderHandler = {
  /**
   * GET /api/okuc/orders
   * List all orders with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { status, basketType, fromDate, toDate } = request.query as {
      status?: string;
      basketType?: string;
      fromDate?: string;
      toDate?: string;
    };

    const filters = {
      status,
      basketType,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    const orders = await repository.findAll(filters);

    return reply.status(200).send(orders);
  },

  /**
   * GET /api/okuc/orders/:id
   * Get order by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid order ID' });
    }

    const order = await repository.findById(id);

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    return reply.status(200).send(order);
  },

  /**
   * GET /api/okuc/orders/stats
   * Get order statistics
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await repository.getStats();
    return reply.status(200).send(stats);
  },

  /**
   * POST /api/okuc/orders
   * Create a new order
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createOkucOrderSchema.parse(request.body);

    // Get userId from authenticated user or fallback to system user
    const rawUserId = request.user?.userId || 1;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    // Generate order number (format: OKUC-YYYY-NNNN)
    const now = new Date();
    const year = now.getFullYear();
    const count = await repository.countByYear(year);
    const orderNumber = `OKUC-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await repository.create({
      ...data,
      orderNumber,
      createdById: userId,
    });

    logger.info('Created order', { orderId: order.id });
    return reply.status(201).send(order);
  },

  /**
   * PUT /api/okuc/orders/:id
   * Update existing order
   */
  async update(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid order ID' });
    }

    const data = updateOkucOrderSchema.parse(request.body);

    // Get userId from authenticated user or fallback to system user
    const rawUserId = request.user?.userId || 1;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const order = await repository.update(id, {
      ...data,
      lastEditById: userId,
    });

    logger.info('Updated order', { id });
    return reply.status(200).send(order);
  },

  /**
   * POST /api/okuc/orders/:id/receive
   * Mark order as received and update received quantities
   */
  async receive(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid order ID' });
    }

    const data = receiveOrderSchema.parse(request.body);

    // Get userId from authenticated user or fallback to system user
    const rawUserId = request.user?.userId || 1;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const order = await repository.receiveOrder(id, {
      ...data,
      actualDeliveryDate: new Date(),
      lastEditById: userId,
    });

    logger.info('Received order', { id });
    return reply.status(200).send(order);
  },

  /**
   * DELETE /api/okuc/orders/:id
   * Delete order (only if draft)
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid order ID' });
    }

    // Check if order is draft
    const order = await repository.findById(id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    if (order.status !== 'draft') {
      return reply.status(400).send({ error: 'Can only delete draft orders' });
    }

    await repository.delete(id);

    logger.info('Deleted order', { id });
    return reply.status(204).send();
  },

  /**
   * POST /api/okuc/orders/import/parse
   * Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia
   */
  async parseImport(request: FastifyRequest, reply: FastifyReply) {
    // Pobierz plik XLSX z multipart
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Brak pliku XLSX' });
    }

    // Sprawdź typ pliku
    const filename = data.filename.toLowerCase();
    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      return reply.status(400).send({
        error: 'Nieprawidłowy typ pliku. Wymagany format: XLSX lub XLS',
      });
    }

    // Wczytaj zawartość pliku do bufora
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parsuj plik XLSX
    const result = await importService.parseXlsx(buffer);

    logger.info('Parsed OKUC order import', {
      itemsCount: result.items.length,
      missingArticlesCount: result.missingArticles.length,
    });

    return reply.status(200).send(result);
  },

  /**
   * POST /api/okuc/orders/import/confirm
   * Zatwierdza import i tworzy zamówienie
   */
  async confirmImport(request: FastifyRequest, reply: FastifyReply) {
    const data = confirmOrderImportSchema.parse(request.body);

    // Get userId from authenticated user or fallback to system user
    const rawUserId = request.user?.userId || 1;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const result = await importService.confirmImport(data, userId);

    logger.info('Confirmed OKUC order import', {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      articlesCreated: result.articlesCreated,
      pricesUpdated: result.pricesUpdated,
    });

    return reply.status(201).send(result);
  },
};
