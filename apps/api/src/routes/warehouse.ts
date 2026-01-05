/**
 * Warehouse Routes - Clean delegation to handlers
 * Refactored from 708 lines to ~70 lines following layered architecture
 */

import type { FastifyPluginAsync } from 'fastify';

import * as handlers from '../handlers/warehouse-handler.js';

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/warehouse/shortages - All material shortages
  fastify.get('/shortages', async (req, reply) => handlers.getShortages(req, reply));

  // GET /api/warehouse/history - All warehouse history
  fastify.get('/history', async (req, reply) => handlers.getAllHistory(req, reply));

  // GET /api/warehouse/:colorId - Warehouse table for color
  fastify.get('/:colorId', async (req, reply) => handlers.getColorData(req, reply));

  // GET /api/warehouse/:colorId/average - Monthly average usage
  fastify.get('/:colorId/average', async (req, reply) => handlers.getMonthlyAverage(req, reply));

  // GET /api/warehouse/history/:colorId - History for specific color
  fastify.get('/history/:colorId', async (req, reply) => handlers.getHistoryByColor(req, reply));

  // PUT /api/warehouse/:colorId/:profileId - Update stock
  fastify.put('/:colorId/:profileId', async (req, reply) => handlers.updateStock(req, reply));

  // POST /api/warehouse/monthly-update - Monthly inventory update
  fastify.post('/monthly-update', async (req, reply) => handlers.monthlyUpdate(req, reply));

  // POST /api/warehouse/rollback-inventory - Rollback last inventory
  fastify.post('/rollback-inventory', async (req, reply) => handlers.rollbackInventory(req, reply));

  // POST /api/warehouse/finalize-month - Finalize month (archive orders)
  fastify.post('/finalize-month', async (req, reply) => handlers.finalizeMonth(req, reply));
};
