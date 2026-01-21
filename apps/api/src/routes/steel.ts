/**
 * Routes dla modułu Steel (wzmocnienia stalowe)
 */
import type { FastifyInstance } from 'fastify';
import { SteelHandler } from '../handlers/steelHandler.js';
import { SteelService } from '../services/steelService.js';
import { SteelRepository } from '../repositories/SteelRepository.js';
import { prisma } from '../utils/prisma.js';

export async function steelRoutes(fastify: FastifyInstance) {
  // Dependency injection
  const repository = new SteelRepository(prisma);
  const service = new SteelService(repository);
  const handler = new SteelHandler(service);

  // GET /api/steel - lista wszystkich stali
  fastify.get('/', handler.getAll);

  // GET /api/steel/with-stock - lista stali ze stanem magazynowym
  fastify.get('/with-stock', handler.getAllWithStock);

  // GET /api/steel/:id - pojedyncza stal
  fastify.get('/:id', handler.getById);

  // POST /api/steel - dodaj nową stal
  fastify.post('/', handler.create);

  // PUT /api/steel/:id - aktualizuj stal
  fastify.put('/:id', handler.update);

  // DELETE /api/steel/:id - usuń stal
  fastify.delete('/:id', handler.delete);

  // PATCH /api/steel/update-orders - zmień kolejność stali
  fastify.patch('/update-orders', handler.updateOrders);

  // GET /api/steel/history - historia zmian stanu magazynowego
  fastify.get('/history', handler.getHistory);

  // GET /api/steel/:id/stock - pobierz stan magazynowy
  fastify.get('/:id/stock', handler.getStock);

  // PATCH /api/steel/:id/stock - aktualizuj stan magazynowy
  fastify.patch('/:id/stock', handler.updateStock);
}
