/**
 * Currency Configuration Routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { CurrencyConfigService } from '../services/currencyConfigService.js';
import { updateCurrencyRateSchema } from '../validators/currencyConfig.js';

export const currencyConfigRoutes: FastifyPluginAsync = async (fastify) => {
  const currencyConfigService = new CurrencyConfigService(fastify.prisma);
  // GET /api/currency-config/current - Get current exchange rate
  fastify.get('/current', {
    schema: {
      description: 'Get current EUR to PLN exchange rate',
      tags: ['currency'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            eurToPlnRate: { type: 'number' },
            effectiveDate: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const config = await currencyConfigService.getCurrentRate();

    if (!config) {
      return reply.status(404).send({ error: 'No currency configuration found' });
    }

    return config;
  });

  // GET /api/currency-config/history - Get exchange rate history
  fastify.get<{
    Querystring: {
      limit?: string;
    };
  }>('/history', {
    schema: {
      description: 'Get exchange rate history',
      tags: ['currency'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Number of records to return (default: 10)' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              eurToPlnRate: { type: 'number' },
              effectiveDate: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
    const configs = await currencyConfigService.getRateHistory(limit);

    return configs;
  });

  // POST /api/currency-config - Update exchange rate
  fastify.post<{
    Body: {
      eurToPlnRate: number;
      effectiveDate?: string;
    };
  }>('/', {
    schema: {
      description: 'Update EUR to PLN exchange rate',
      tags: ['currency'],
      body: {
        type: 'object',
        required: ['eurToPlnRate'],
        properties: {
          eurToPlnRate: {
            type: 'number',
            description: 'Exchange rate from EUR to PLN',
            minimum: 0.01,
            maximum: 100,
          },
          effectiveDate: {
            type: 'string',
            format: 'date-time',
            description: 'Effective date of the rate (default: now)',
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            eurToPlnRate: { type: 'number' },
            effectiveDate: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const validated = updateCurrencyRateSchema.parse(request.body);

      const config = await currencyConfigService.updateRate(
        validated.eurToPlnRate,
        validated.effectiveDate ? new Date(validated.effectiveDate) : undefined
      );

      return reply.status(201).send(config);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update currency rate';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/currency-config/convert/eur-to-pln - Convert EUR to PLN
  fastify.post<{
    Body: {
      amount: number;
    };
  }>('/convert/eur-to-pln', {
    schema: {
      description: 'Convert EUR amount to PLN using current rate',
      tags: ['currency'],
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', description: 'Amount in EUR' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            eur: { type: 'number' },
            pln: { type: 'number' },
            rate: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { amount } = request.body;
      const config = await currencyConfigService.getCurrentRate();

      if (!config) {
        return reply.status(404).send({ error: 'No currency configuration found' });
      }

      const pln = await currencyConfigService.convertEurToPln(amount);

      return {
        eur: amount,
        pln: parseFloat(pln.toFixed(2)),
        rate: config.eurToPlnRate,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to convert EUR to PLN';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/currency-config/convert/pln-to-eur - Convert PLN to EUR
  fastify.post<{
    Body: {
      amount: number;
    };
  }>('/convert/pln-to-eur', {
    schema: {
      description: 'Convert PLN amount to EUR using current rate',
      tags: ['currency'],
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', description: 'Amount in PLN' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            pln: { type: 'number' },
            eur: { type: 'number' },
            rate: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { amount } = request.body;
      const config = await currencyConfigService.getCurrentRate();

      if (!config) {
        return reply.status(404).send({ error: 'No currency configuration found' });
      }

      const eur = await currencyConfigService.convertPlnToEur(amount);

      return {
        pln: amount,
        eur: parseFloat(eur.toFixed(2)),
        rate: config.eurToPlnRate,
      };
    } catch (error: unknown) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
};
