import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WarehouseOrderService } from '../services/warehouse/WarehouseOrderService.js';
import {
  warehouseOrderQuerySchema,
  warehouseOrderIdParamsSchema,
  createWarehouseOrderSchema,
  updateWarehouseOrderSchema,
} from '../validators/warehouse-orders.js';

export function createWarehouseOrderHandler(service: WarehouseOrderService) {
  return {
    /**
     * GET /warehouse-orders - Lista zamówień z filtrowaniem
     */
    async getAll(
      request: FastifyRequest<{ Querystring: Record<string, string | undefined> }>,
      reply: FastifyReply
    ) {
      const query = warehouseOrderQuerySchema.parse(request.query);
      const orders = await service.findAll(query);
      return orders;
    },

    /**
     * GET /warehouse-orders/:id - Pojedyncze zamówienie
     */
    async getById(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const { id } = warehouseOrderIdParamsSchema.parse(request.params);
      const order = await service.findById(id);
      return order;
    },

    /**
     * POST /warehouse-orders - Tworzenie zamówienia
     */
    async create(
      request: FastifyRequest<{ Body: Record<string, unknown> }>,
      reply: FastifyReply
    ) {
      const data = createWarehouseOrderSchema.parse(request.body);
      const order = await service.create(data);
      return reply.status(201).send(order);
    },

    /**
     * PUT /warehouse-orders/:id - Aktualizacja zamówienia
     */
    async update(
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) {
      const { id } = warehouseOrderIdParamsSchema.parse(request.params);
      const data = updateWarehouseOrderSchema.parse(request.body);
      const order = await service.update(id, data);
      return order;
    },

    /**
     * DELETE /warehouse-orders/:id - Usunięcie zamówienia
     */
    async delete(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const { id } = warehouseOrderIdParamsSchema.parse(request.params);
      await service.delete(id);
      return reply.status(204).send();
    },
  };
}
