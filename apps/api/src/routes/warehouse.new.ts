import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { WarehouseService } from '../services/warehouseService.js';
import { WarehouseHandler } from '../handlers/warehouseHandler.js';

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new WarehouseRepository(prisma);
  const service = new WarehouseService(repository);
  const handler = new WarehouseHandler(service);

  // Routes
  fastify.get('/stock', handler.getStock.bind(handler));
  fastify.put('/stock/:id', handler.updateStock.bind(handler));

  // TODO: Migrate additional warehouse endpoints
};
