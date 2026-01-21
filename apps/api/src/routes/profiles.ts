import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { verifyAuth } from '../middleware/auth.js';
import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { ProfileService } from '../services/profileService.js';
import { ProfileHandler } from '../handlers/profileHandler.js';


export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new ProfileRepository(prisma);
  const service = new ProfileService(repository);
  const handler = new ProfileHandler(service);

  // Routes - only routing, delegate to handlers - all require authentication
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get all aluminum profiles',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              number: { type: 'string' },
              name: { type: 'string', nullable: true },
              description: { type: 'string', nullable: true },
              articleNumber: { type: 'string', nullable: true },
              isAkrobud: { type: 'boolean' },
              isLiving: { type: 'boolean' },
              isBlok: { type: 'boolean' },
              isVlak: { type: 'boolean' },
              isCt70: { type: 'boolean' },
              isFocusing: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.getAll.bind(handler));

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get profile by ID',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Profile ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            number: { type: 'string' },
            name: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            articleNumber: { type: 'string', nullable: true },
            isAkrobud: { type: 'boolean' },
            isLiving: { type: 'boolean' },
            isBlok: { type: 'boolean' },
            isVlak: { type: 'boolean' },
            isCt70: { type: 'boolean' },
            isFocusing: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.getById.bind(handler));

  fastify.post<{ Body: { number: string; name: string; description?: string | null; articleNumber?: string | null } }>('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create a new profile',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Profile number' },
          name: { type: 'string', description: 'Profile name' },
          articleNumber: { type: 'string', description: 'Article number' },
        },
        required: ['number'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            number: { type: 'string' },
            name: { type: 'string', nullable: true },
            articleNumber: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.create.bind(handler));

  fastify.put<{ Params: { id: string }; Body: { name?: string; description?: string | null; articleNumber?: string | null; isAkrobud?: boolean; isLiving?: boolean; isBlok?: boolean; isVlak?: boolean; isCt70?: boolean; isFocusing?: boolean } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update an existing profile',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Profile ID' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          number: { type: 'string' },
          name: { type: 'string' },
          articleNumber: { type: 'string' },
          description: { type: 'string', nullable: true },
          isAkrobud: { type: 'boolean' },
          isLiving: { type: 'boolean' },
          isBlok: { type: 'boolean' },
          isVlak: { type: 'boolean' },
          isCt70: { type: 'boolean' },
          isFocusing: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            number: { type: 'string' },
            name: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            articleNumber: { type: 'string', nullable: true },
            isAkrobud: { type: 'boolean' },
            isLiving: { type: 'boolean' },
            isBlok: { type: 'boolean' },
            isVlak: { type: 'boolean' },
            isCt70: { type: 'boolean' },
            isFocusing: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.update.bind(handler));

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete a profile',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Profile ID' },
        },
        required: ['id'],
      },
      response: {
        204: { type: 'null', description: 'No content' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.delete.bind(handler));

  fastify.patch<{ Body: { profileOrders: Array<{ id: number; sortOrder: number }> } }>('/update-orders', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update profile display orders',
      tags: ['profiles'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                displayOrder: { type: 'number' },
              },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
  }, handler.updateOrders.bind(handler));
};
