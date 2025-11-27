import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/profiles - lista wszystkich profili
  fastify.get('/', async () => {
    const profiles = await prisma.profile.findMany({
      orderBy: { number: 'asc' },
    });
    return profiles;
  });

  // GET /api/profiles/:id - szczegóły profilu
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const profile = await prisma.profile.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        number: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        profileColors: {
          select: {
            profileId: true,
            colorId: true,
            isVisible: true,
            color: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                hexColor: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profil nie znaleziony' });
    }

    return profile;
  });

  // POST /api/profiles - utwórz nowy profil
  fastify.post<{
    Body: { number: string; name: string; description?: string };
  }>('/', async (request, reply) => {
    const { number, name, description } = request.body;

    const existing = await prisma.profile.findUnique({
      where: { number },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Profil o tym numerze już istnieje' });
    }

    const profile = await prisma.profile.create({
      data: { number, name, description },
    });

    return reply.status(201).send(profile);
  });

  // PUT /api/profiles/:id - aktualizuj profil
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; description?: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, description } = request.body;

    const profile = await prisma.profile.update({
      where: { id: parseInt(id) },
      data: { name, description },
    });

    return profile;
  });

  // DELETE /api/profiles/:id - usuń profil
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.profile.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });
};
