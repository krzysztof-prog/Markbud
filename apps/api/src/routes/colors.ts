import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const colorRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/colors - lista wszystkich kolorów
  fastify.get<{
    Querystring: { type?: 'typical' | 'atypical' };
  }>('/', async (request) => {
    const { type } = request.query;

    const colors = await prisma.color.findMany({
      where: type ? { type } : undefined,
      orderBy: { code: 'asc' },
    });

    return colors;
  });

  // GET /api/colors/:id - szczegóły koloru
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const color = await prisma.color.findUnique({
      where: { id: parseInt(id) },
      include: {
        profileColors: {
          include: { profile: true },
        },
      },
    });

    if (!color) {
      return reply.status(404).send({ error: 'Kolor nie znaleziony' });
    }

    return color;
  });

  // POST /api/colors - utwórz nowy kolor
  fastify.post<{
    Body: {
      code: string;
      name: string;
      type: 'typical' | 'atypical';
      hexColor?: string;
    };
  }>('/', async (request, reply) => {
    const { code, name, type, hexColor } = request.body;

    const existing = await prisma.color.findUnique({
      where: { code },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Kolor o tym kodzie już istnieje' });
    }

    const color = await prisma.color.create({
      data: { code, name, type, hexColor },
    });

    // Automatycznie utwórz powiązania ze wszystkimi profilami
    const profiles = await prisma.profile.findMany();
    await prisma.profileColor.createMany({
      data: profiles.map((profile) => ({
        profileId: profile.id,
        colorId: color.id,
        isVisible: true,
      })),
    });

    // Utwórz wpisy w warehouse_stock dla nowego koloru
    await prisma.warehouseStock.createMany({
      data: profiles.map((profile) => ({
        profileId: profile.id,
        colorId: color.id,
        currentStockBeams: 0,
      })),
    });

    return reply.status(201).send(color);
  });

  // PUT /api/colors/:id - aktualizuj kolor
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      type?: 'typical' | 'atypical';
      hexColor?: string;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, type, hexColor } = request.body;

    const color = await prisma.color.update({
      where: { id: parseInt(id) },
      data: { name, type, hexColor },
    });

    return color;
  });

  // DELETE /api/colors/:id - usuń kolor
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.color.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });

  // PUT /api/colors/:colorId/profiles/:profileId/visibility - zmień widoczność profilu w kolorze
  fastify.put<{
    Params: { colorId: string; profileId: string };
    Body: { isVisible: boolean };
  }>('/:colorId/profiles/:profileId/visibility', async (request, reply) => {
    const { colorId, profileId } = request.params;
    const { isVisible } = request.body;

    const profileColor = await prisma.profileColor.update({
      where: {
        profileId_colorId: {
          profileId: parseInt(profileId),
          colorId: parseInt(colorId),
        },
      },
      data: { isVisible },
    });

    return profileColor;
  });
};
