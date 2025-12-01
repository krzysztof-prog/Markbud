/**
 * Warehouse Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { WarehouseService } from '../services/warehouseService.js';
import { warehouseStatsQuerySchema } from '../validators/warehouse.js';

export class WarehouseHandler {
  constructor(private service: WarehouseService) {}

  async getStock(
    request: FastifyRequest<{ Querystring: { profileId?: string; colorId?: string } }>,
    reply: FastifyReply
  ) {
    const validated = warehouseStatsQuerySchema.parse(request.query);
    const profileId = validated.profileId ? parseInt(validated.profileId) : undefined;
    const colorId = validated.colorId ? parseInt(validated.colorId) : undefined;

    const stock = await this.service.getStock(profileId, colorId);
    return reply.send(stock);
  }

  async updateStock(
    request: FastifyRequest<{ Params: { id: string }; Body: { currentStockBeams: number } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const { currentStockBeams } = request.body;

    const stock = await this.service.updateStock(id, currentStockBeams);
    return reply.send(stock);
  }
}
