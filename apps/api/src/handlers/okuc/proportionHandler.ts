/**
 * OkucProportion Handler - HTTP request handling for proportion management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucProportionRepository } from '../../repositories/okuc/OkucProportionRepository.js';
import {
  createProportionSchema,
  updateProportionSchema,
} from '../../validators/okuc.js';

const repository = new OkucProportionRepository(prisma);

export const okucProportionHandler = {
  /**
   * GET /api/okuc/proportions
   * List all proportions with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { isActive } = request.query as {
      isActive?: string;
    };

    const filters = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const proportions = await repository.findAll(filters);

    return reply.status(200).send(proportions);
  },

  /**
   * GET /api/okuc/proportions/:id
   * Get proportion by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid proportion ID' });
    }

    const proportion = await repository.findById(id);

    if (!proportion) {
      return reply.status(404).send({ error: 'Proportion not found' });
    }

    return reply.status(200).send(proportion);
  },

  /**
   * GET /api/okuc/proportions/article/:articleId
   * Get proportions for an article (both source and target)
   */
  async getByArticle(
    request: FastifyRequest<{ Params: { articleId: string } }>,
    reply: FastifyReply
  ) {
    const articleId = parseInt(request.params.articleId, 10);

    if (isNaN(articleId)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    const [asSource, asTarget] = await Promise.all([
      repository.findBySourceArticle(articleId),
      repository.findByTargetArticle(articleId),
    ]);

    return reply.status(200).send({
      asSource,
      asTarget,
    });
  },

  /**
   * GET /api/okuc/proportions/chains/:sourceArticleId
   * Get proportion chains starting from a source article
   */
  async getChains(
    request: FastifyRequest<{ Params: { sourceArticleId: string } }>,
    reply: FastifyReply
  ) {
    const sourceArticleId = parseInt(request.params.sourceArticleId, 10);

    if (isNaN(sourceArticleId)) {
      return reply.status(400).send({ error: 'Invalid source article ID' });
    }

    const chains = await repository.getProportionChains(sourceArticleId);

    return reply.status(200).send(chains);
  },

  /**
   * POST /api/okuc/proportions
   * Create a new proportion
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createProportionSchema.parse(request.body);

    // Check if proportion already exists
    const exists = await repository.exists(data.sourceArticleId, data.targetArticleId);
    if (exists) {
      return reply.status(400).send({
        error: 'Proportion between these articles already exists',
      });
    }

    const proportion = await repository.create(data);

    logger.info('Created proportion', { proportionId: proportion.id });
    return reply.status(201).send(proportion);
  },

  /**
   * PUT /api/okuc/proportions/:id
   * Update existing proportion
   */
  async update(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid proportion ID' });
    }

    const data = updateProportionSchema.parse(request.body);

    // Check if proportion exists
    const existing = await repository.findById(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Proportion not found' });
    }

    const proportion = await repository.update(id, data);

    logger.info('Updated proportion', { id });
    return reply.status(200).send(proportion);
  },

  /**
   * DELETE /api/okuc/proportions/:id
   * Delete proportion (hard delete)
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid proportion ID' });
    }

    // Check if proportion exists
    const proportion = await repository.findById(id);
    if (!proportion) {
      return reply.status(404).send({ error: 'Proportion not found' });
    }

    await repository.delete(id);

    logger.info('Deleted proportion', { id });
    return reply.status(204).send();
  },

  /**
   * POST /api/okuc/proportions/:id/deactivate
   * Deactivate proportion (soft delete)
   */
  async deactivate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid proportion ID' });
    }

    // Check if proportion exists
    const existing = await repository.findById(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Proportion not found' });
    }

    if (!existing.isActive) {
      return reply.status(400).send({ error: 'Proportion is already inactive' });
    }

    const proportion = await repository.deactivate(id);

    logger.info('Deactivated proportion', { id });
    return reply.status(200).send(proportion);
  },

  /**
   * POST /api/okuc/proportions/:id/activate
   * Activate proportion
   */
  async activate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid proportion ID' });
    }

    // Check if proportion exists
    const existing = await repository.findById(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Proportion not found' });
    }

    if (existing.isActive) {
      return reply.status(400).send({ error: 'Proportion is already active' });
    }

    const proportion = await repository.activate(id);

    logger.info('Activated proportion', { id });
    return reply.status(200).send(proportion);
  },
};
