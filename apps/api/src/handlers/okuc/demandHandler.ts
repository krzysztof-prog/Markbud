/**
 * OkucDemand Handler - HTTP request handling for demand management (zapotrzebowanie)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucDemandRepository } from '../../repositories/okuc/OkucDemandRepository.js';
import {
  createDemandSchema,
  updateDemandSchema,
} from '../../validators/okuc.js';

const repository = new OkucDemandRepository(prisma);

export const okucDemandHandler = {
  /**
   * GET /api/okuc/demand
   * List all demands with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { articleId, orderId, status, source, expectedWeek, fromWeek, toWeek, isManualEdit } = request.query as {
      articleId?: string;
      orderId?: string;
      status?: string;
      source?: string;
      expectedWeek?: string;
      fromWeek?: string;
      toWeek?: string;
      isManualEdit?: string;
    };

    const filters = {
      articleId: articleId ? parseInt(articleId, 10) : undefined,
      orderId: orderId ? parseInt(orderId, 10) : undefined,
      status,
      source,
      expectedWeek,
      fromWeek,
      toWeek,
      isManualEdit: isManualEdit !== undefined ? isManualEdit === 'true' : undefined,
    };

    const demands = await repository.findAll(filters);

    return reply.status(200).send(demands);
  },

  /**
   * GET /api/okuc/demand/:id
   * Get demand by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid demand ID' });
    }

    const demand = await repository.findById(id);

    if (!demand) {
      return reply.status(404).send({ error: 'Demand not found' });
    }

    return reply.status(200).send(demand);
  },

  /**
   * GET /api/okuc/demand/summary
   * Get demand summary grouped by week
   */
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const { fromWeek, toWeek } = request.query as {
      fromWeek?: string;
      toWeek?: string;
    };

    const summary = await repository.getSummaryByWeek({
      fromWeek,
      toWeek,
    });

    return reply.status(200).send(summary);
  },

  /**
   * POST /api/okuc/demand
   * Create a new demand
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createDemandSchema.parse(request.body);

    const demand = await repository.create(data);

    logger.info('Created demand', { demandId: demand.id });
    return reply.status(201).send(demand);
  },

  /**
   * PUT /api/okuc/demand/:id
   * Update existing demand
   */
  async update(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid demand ID' });
    }

    const data = updateDemandSchema.parse(request.body);

    // TODO: Get userId from auth middleware when implemented
    const userId = 1; // Placeholder

    const demand = await repository.update(id, {
      ...data,
      lastEditById: userId,
    });

    logger.info('Updated demand', { id });
    return reply.status(200).send(demand);
  },

  /**
   * DELETE /api/okuc/demand/:id
   * Delete demand
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid demand ID' });
    }

    await repository.delete(id);

    logger.info('Deleted demand', { id });
    return reply.status(204).send();
  },
};
