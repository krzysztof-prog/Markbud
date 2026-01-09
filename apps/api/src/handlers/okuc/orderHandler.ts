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
  type CreateOkucOrderInput,
  type UpdateOkucOrderInput,
  type ReceiveOrderInput,
} from '../../validators/okuc.js';

const repository = new OkucOrderRepository(prisma);

export const okucOrderHandler = {
  /**
   * GET /api/okuc/orders
   * List all orders with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
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
    } catch (error) {
      logger.error('Failed to list orders', { error });
      return reply.status(500).send({ error: 'Failed to list orders' });
    }
  },

  /**
   * GET /api/okuc/orders/:id
   * Get order by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid order ID' });
      }

      const order = await repository.findById(id);

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      return reply.status(200).send(order);
    } catch (error) {
      logger.error('Failed to get order', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get order' });
    }
  },

  /**
   * GET /api/okuc/orders/stats
   * Get order statistics
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await repository.getStats();
      return reply.status(200).send(stats);
    } catch (error) {
      logger.error('Failed to get order stats', { error });
      return reply.status(500).send({ error: 'Failed to get order stats' });
    }
  },

  /**
   * POST /api/okuc/orders
   * Create a new order
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createOkucOrderSchema.parse(request.body) as CreateOkucOrderInput;

      // TODO: Get userId from auth middleware when implemented
      const userId = 1; // Placeholder

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
    } catch (error) {
      logger.error('Failed to create order', { error });
      return reply.status(400).send({ error: 'Failed to create order' });
    }
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
    try {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid order ID' });
      }

      const data = updateOkucOrderSchema.parse(request.body) as UpdateOkucOrderInput;

      // TODO: Get userId from auth middleware when implemented
      const userId = 1; // Placeholder

      const order = await repository.update(id, {
        ...data,
        lastEditById: userId,
      });

      logger.info('Updated order', { id });
      return reply.status(200).send(order);
    } catch (error) {
      logger.error('Failed to update order', { error, id: request.params.id });
      return reply.status(400).send({ error: 'Failed to update order' });
    }
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
    try {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid order ID' });
      }

      const data = receiveOrderSchema.parse(request.body) as ReceiveOrderInput;

      // TODO: Get userId from auth middleware when implemented
      const userId = 1; // Placeholder

      const order = await repository.receiveOrder(id, {
        ...data,
        actualDeliveryDate: new Date(),
        lastEditById: userId,
      });

      logger.info('Received order', { id });
      return reply.status(200).send(order);
    } catch (error) {
      logger.error('Failed to receive order', { error, id: request.params.id });
      return reply.status(400).send({ error: 'Failed to receive order' });
    }
  },

  /**
   * DELETE /api/okuc/orders/:id
   * Delete order (only if draft)
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
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
    } catch (error) {
      logger.error('Failed to delete order', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to delete order' });
    }
  },
};
