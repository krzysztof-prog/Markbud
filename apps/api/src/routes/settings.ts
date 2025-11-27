import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/settings - wszystkie ustawienia
  fastify.get('/', async () => {
    const settings = await prisma.setting.findMany();

    // Przekształć na obiekt
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }

    return settingsObj;
  });

  // GET /api/settings/:key - pojedyncze ustawienie
  fastify.get<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Ustawienie nie znalezione' });
    }

    return setting;
  });

  // PUT /api/settings/:key - aktualizuj ustawienie
  fastify.put<{
    Params: { key: string };
    Body: { value: string };
  }>('/:key', async (request) => {
    const { key } = request.params;
    const { value } = request.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return setting;
  });

  // PUT /api/settings - aktualizuj wiele ustawień
  fastify.put<{
    Body: Record<string, string>;
  }>('/', async (request) => {
    const settings = request.body;

    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await prisma.$transaction(updates);

    return { success: true };
  });

  // GET /api/settings/pallet-types - typy palet
  fastify.get('/pallet-types', async () => {
    const palletTypes = await prisma.palletType.findMany({
      orderBy: { name: 'asc' },
    });
    return palletTypes;
  });

  // POST /api/settings/pallet-types - dodaj typ palety
  fastify.post<{
    Body: {
      name: string;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
      loadWidthMm: number;
    };
  }>('/pallet-types', async (request, reply) => {
    const { name, lengthMm, widthMm, heightMm, loadWidthMm } = request.body;

    const palletType = await prisma.palletType.create({
      data: { name, lengthMm, widthMm, heightMm, loadWidthMm },
    });

    return reply.status(201).send(palletType);
  });

  // PUT /api/settings/pallet-types/:id - aktualizuj typ palety
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
      loadWidthMm?: number;
    };
  }>('/pallet-types/:id', async (request) => {
    const { id } = request.params;
    const data = request.body;

    const palletType = await prisma.palletType.update({
      where: { id: parseInt(id) },
      data,
    });

    return palletType;
  });

  // DELETE /api/settings/pallet-types/:id - usuń typ palety
  fastify.delete<{ Params: { id: string } }>('/pallet-types/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.palletType.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });

  // GET /api/settings/packing-rules - reguły pakowania
  fastify.get('/packing-rules', async () => {
    const rules = await prisma.packingRule.findMany({
      orderBy: { name: 'asc' },
    });
    return rules;
  });

  // POST /api/settings/packing-rules - dodaj regułę pakowania
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      isActive?: boolean;
      ruleConfig: Record<string, unknown>;
    };
  }>('/packing-rules', async (request, reply) => {
    const { name, description, isActive, ruleConfig } = request.body;

    const rule = await prisma.packingRule.create({
      data: { name, description, isActive, ruleConfig },
    });

    return reply.status(201).send(rule);
  });

  // PUT /api/settings/packing-rules/:id - aktualizuj regułę
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      isActive?: boolean;
      ruleConfig?: Record<string, unknown>;
    };
  }>('/packing-rules/:id', async (request) => {
    const { id } = request.params;
    const data = request.body;

    const rule = await prisma.packingRule.update({
      where: { id: parseInt(id) },
      data,
    });

    return rule;
  });

  // DELETE /api/settings/packing-rules/:id - usuń regułę
  fastify.delete<{ Params: { id: string } }>('/packing-rules/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.packingRule.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });
};
