import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { SettingsService } from '../services/settingsService.js';
import { SettingsHandler } from '../handlers/settingsHandler.js';
import {
  settingKeySchema,
  upsertOneSettingSchema,
  upsertManySettingsSchema,
  createPalletTypeSchema,
  updatePalletTypeSchema,
  palletTypeIdSchema,
  createPackingRuleSchema,
  updatePackingRuleSchema,
  packingRuleIdSchema,
} from '../validators/settings.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new SettingsRepository(prisma);
  const service = new SettingsService(repository);
  const handler = new SettingsHandler(service);

  // Settings CRUD
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:key', { schema: settingKeySchema }, handler.getByKey.bind(handler));
  fastify.put('/:key', { schema: upsertOneSettingSchema }, handler.upsertOne.bind(handler));
  fastify.put('/', { schema: upsertManySettingsSchema }, handler.upsertMany.bind(handler));

  // Pallet Types
  fastify.get('/pallet-types', handler.getAllPalletTypes.bind(handler));
  fastify.post('/pallet-types', { schema: createPalletTypeSchema }, handler.createPalletType.bind(handler));
  fastify.put('/pallet-types/:id', { schema: updatePalletTypeSchema }, handler.updatePalletType.bind(handler));
  fastify.delete('/pallet-types/:id', { schema: palletTypeIdSchema }, handler.deletePalletType.bind(handler));

  // Packing Rules
  fastify.get('/packing-rules', handler.getAllPackingRules.bind(handler));
  fastify.post('/packing-rules', { schema: createPackingRuleSchema }, handler.createPackingRule.bind(handler));
  fastify.put('/packing-rules/:id', { schema: updatePackingRuleSchema }, handler.updatePackingRule.bind(handler));
  fastify.delete('/packing-rules/:id', { schema: packingRuleIdSchema }, handler.deletePackingRule.bind(handler));
};
