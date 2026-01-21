/**
 * OkucRoutes - DualStock API routes
 * Base path: /api/okuc
 */

import type { FastifyPluginAsync } from 'fastify';
import { okucArticleRoutes } from './okuc/articles.js';
import { okucStockRoutes } from './okuc/stock.js';
import { okucDemandRoutes } from './okuc/demand.js';
import { okucOrderRoutes } from './okuc/orders.js';
import { okucProportionRoutes } from './okuc/proportions.js';
import { okucLocationRoutes } from './okuc/locations.js';
import { okucReplacementRoutes } from './okuc/replacements.js';

export const okucRoutes: FastifyPluginAsync = async (fastify) => {
  // Article management
  await fastify.register(okucArticleRoutes, { prefix: '/articles' });

  // Stock/inventory management
  await fastify.register(okucStockRoutes, { prefix: '/stock' });

  // Demand management (zapotrzebowanie)
  await fastify.register(okucDemandRoutes, { prefix: '/demand' });

  // Orders to suppliers (zamówienia do dostawców)
  await fastify.register(okucOrderRoutes, { prefix: '/orders' });

  // Proportions (proporcje zużycia)
  await fastify.register(okucProportionRoutes, { prefix: '/proportions' });

  // Locations (lokalizacje magazynowe)
  await fastify.register(okucLocationRoutes, { prefix: '/locations' });

  // Article replacements (zastępstwa artykułów - wygaszanie)
  await fastify.register(okucReplacementRoutes, { prefix: '/replacements' });

  // Health check for the module
  fastify.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', module: 'dualstock' });
  });
};
