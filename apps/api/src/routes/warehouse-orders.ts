import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { WarehouseOrderService } from '../services/warehouse/WarehouseOrderService.js';
import { createWarehouseOrderHandler } from '../handlers/warehouseOrderHandler.js';

export const warehouseOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja service i handler
  const service = new WarehouseOrderService(prisma);
  const handler = createWarehouseOrderHandler(service);

  // GET /api/warehouse-orders - pobierz wszystkie zamówienia (z filtrowaniem)
  fastify.get('/', handler.getAll);

  // GET /api/warehouse-orders/:id - pobierz jedno zamówienie
  fastify.get('/:id', handler.getById);

  // POST /api/warehouse-orders - utwórz nowe zamówienie
  fastify.post('/', handler.create);

  // PUT /api/warehouse-orders/:id - aktualizuj zamówienie
  fastify.put('/:id', handler.update);

  // DELETE /api/warehouse-orders/:id - usuń zamówienie
  fastify.delete('/:id', handler.delete);
};
