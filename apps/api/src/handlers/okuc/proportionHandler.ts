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
  type CreateProportionInput,
  type UpdateProportionInput,
} from '../../validators/okuc.js';

const repository = new OkucProportionRepository(prisma);

export const okucProportionHandler = {
  /**
   * GET /api/okuc/proportions
   * List all proportions with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { isActive } = request.query as {
        isActive?: string;
      };

      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const proportions = await repository.findAll(filters);

      return reply.status(200).send(proportions);
    } catch (error) {
      logger.error('Failed to list proportions', { error });
      return reply.status(500).send({ error: 'Failed to list proportions' });
    }
  },

  /**
   * GET /api/okuc/proportions/:id
   * Get proportion by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid proportion ID' });
      }

      const proportion = await repository.findById(id);

      if (!proportion) {
        return reply.status(404).send({ error: 'Proportion not found' });
      }

      return reply.status(200).send(proportion);
    } catch (error) {
      logger.error('Failed to get proportion', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get proportion' });
    }
  },

  /**
   * GET /api/okuc/proportions/article/:articleId
   * Get proportions for an article (both source and target)
   */
  async getByArticle(
    request: FastifyRequest<{ Params: { articleId: string } }>,
    reply: FastifyReply
  ) {
    try {
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
    } catch (error) {
      logger.error('Failed to get proportions by article', {
        error,
        articleId: request.params.articleId,
      });
      return reply.status(500).send({ error: 'Failed to get proportions by article' });
    }
  },

  /**
   * GET /api/okuc/proportions/chains/:sourceArticleId
   * Get proportion chains starting from a source article
   */
  async getChains(
    request: FastifyRequest<{ Params: { sourceArticleId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const sourceArticleId = parseInt(request.params.sourceArticleId, 10);

      if (isNaN(sourceArticleId)) {
        return reply.status(400).send({ error: 'Invalid source article ID' });
      }

      const chains = await repository.getProportionChains(sourceArticleId);

      return reply.status(200).send(chains);
    } catch (error) {
      logger.error('Failed to get proportion chains', {
        error,
        sourceArticleId: request.params.sourceArticleId,
      });
      return reply.status(500).send({ error: 'Failed to get proportion chains' });
    }
  },

  /**
   * POST /api/okuc/proportions
   * Create a new proportion
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createProportionSchema.parse(request.body) as CreateProportionInput;

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
    } catch (error) {
      logger.error('Failed to create proportion', { error });

      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(400).send({ error: 'Failed to create proportion' });
    }
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
    try {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid proportion ID' });
      }

      const data = updateProportionSchema.parse(request.body) as UpdateProportionInput;

      // Check if proportion exists
      const existing = await repository.findById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Proportion not found' });
      }

      const proportion = await repository.update(id, data);

      logger.info('Updated proportion', { id });
      return reply.status(200).send(proportion);
    } catch (error) {
      logger.error('Failed to update proportion', { error, id: request.params.id });
      return reply.status(400).send({ error: 'Failed to update proportion' });
    }
  },

  /**
   * DELETE /api/okuc/proportions/:id
   * Delete proportion (hard delete)
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
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
    } catch (error) {
      logger.error('Failed to delete proportion', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to delete proportion' });
    }
  },

  /**
   * POST /api/okuc/proportions/:id/deactivate
   * Deactivate proportion (soft delete)
   */
  async deactivate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
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
    } catch (error) {
      logger.error('Failed to deactivate proportion', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to deactivate proportion' });
    }
  },

  /**
   * POST /api/okuc/proportions/:id/activate
   * Activate proportion
   */
  async activate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
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
    } catch (error) {
      logger.error('Failed to activate proportion', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to activate proportion' });
    }
  },
};
