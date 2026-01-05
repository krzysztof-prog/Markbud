/**
 * Okuc Proportion Routes
 * Routes for managing article proportions (relationships between articles)
 */

import type { FastifyPluginAsync } from 'fastify';
import { okucProportionHandler } from '../../handlers/okuc/proportionHandler.js';
import { verifyAuth } from '../../middleware/auth.js';

export const okucProportionRoutes: FastifyPluginAsync = async (fastify) => {
  // List all proportions with optional filters
  fastify.get<{
    Querystring: { isActive?: string };
  }>('/', {
    preHandler: verifyAuth,
  }, okucProportionHandler.list);

  // Get proportion chains starting from source article
  fastify.get<{
    Params: { sourceArticleId: string };
  }>('/chains/:sourceArticleId', {
    preHandler: verifyAuth,
  }, okucProportionHandler.getChains);

  // Get proportions by article (both as source and target)
  fastify.get<{
    Params: { articleId: string };
  }>('/article/:articleId', {
    preHandler: verifyAuth,
  }, okucProportionHandler.getByArticle);

  // Get proportion by ID
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    preHandler: verifyAuth,
  }, okucProportionHandler.getById);

  // Create new proportion
  fastify.post<{
    Body: {
      sourceArticleId: number;
      targetArticleId: number;
      proportionType: 'multiplier' | 'split';
      ratio?: number;
      splitPercent?: number;
      tolerance?: number;
      isActive?: boolean;
    };
  }>('/', {
    preHandler: verifyAuth,
  }, okucProportionHandler.create);

  // Update proportion
  fastify.put<{
    Params: { id: string };
    Body: {
      proportionType?: 'multiplier' | 'split';
      ratio?: number;
      splitPercent?: number;
      tolerance?: number;
      isActive?: boolean;
    };
  }>('/:id', {
    preHandler: verifyAuth,
  }, okucProportionHandler.update);

  // Deactivate proportion (soft delete)
  fastify.post<{
    Params: { id: string };
  }>('/:id/deactivate', {
    preHandler: verifyAuth,
  }, okucProportionHandler.deactivate);

  // Activate proportion
  fastify.post<{
    Params: { id: string };
  }>('/:id/activate', {
    preHandler: verifyAuth,
  }, okucProportionHandler.activate);

  // Delete proportion (hard delete)
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    preHandler: verifyAuth,
  }, okucProportionHandler.delete);
};
