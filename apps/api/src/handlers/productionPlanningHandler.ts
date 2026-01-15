/**
 * Production Planning Handler - Request/Response handling
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProductionPlanningService } from '../services/productionPlanningService.js';
import {
  efficiencyConfigSchema,
  efficiencyConfigIdSchema,
  productionSettingSchema,
  updateProductionSettingSchema,
  productionCalendarSchema,
  updateProfilePalletizedSchema,
  bulkUpdateProfilePalletizedSchema,
  updateColorTypicalSchema,
  bulkUpdateColorTypicalSchema,
} from '../validators/productionPlanning.js';

export class ProductionPlanningHandler {
  constructor(private service: ProductionPlanningService) {}

  // === Efficiency Config ===

  async getAllEfficiencyConfigs(_request: FastifyRequest, reply: FastifyReply) {
    const configs = await this.service.getAllEfficiencyConfigs();
    return reply.send(configs);
  }

  async getEfficiencyConfigById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = efficiencyConfigIdSchema.parse(request.params);
    const config = await this.service.getEfficiencyConfigById(id);
    if (!config) {
      return reply.status(404).send({ error: 'Nie znaleziono konfiguracji' });
    }
    return reply.send(config);
  }

  async createEfficiencyConfig(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = efficiencyConfigSchema.parse(request.body);
    const config = await this.service.createEfficiencyConfig(validated);
    return reply.status(201).send(config);
  }

  async updateEfficiencyConfig(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = efficiencyConfigIdSchema.parse(request.params);
    const validated = efficiencyConfigSchema.partial().parse(request.body);
    const config = await this.service.updateEfficiencyConfig(id, validated);
    return reply.send(config);
  }

  async deleteEfficiencyConfig(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = efficiencyConfigIdSchema.parse(request.params);
    await this.service.deleteEfficiencyConfig(id);
    return reply.status(204).send();
  }

  // === Production Settings ===

  async getAllSettings(_request: FastifyRequest, reply: FastifyReply) {
    const settings = await this.service.getAllSettings();
    return reply.send(settings);
  }

  async getSettingByKey(
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply
  ) {
    const { key } = request.params;
    const setting = await this.service.getSettingByKey(key);
    if (!setting) {
      return reply.status(404).send({ error: 'Nie znaleziono ustawienia' });
    }
    return reply.send(setting);
  }

  async upsertSetting(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = productionSettingSchema.parse(request.body);
    const setting = await this.service.upsertSetting(validated);
    return reply.send(setting);
  }

  async updateSetting(
    request: FastifyRequest<{ Params: { key: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { key } = request.params;
    const validated = updateProductionSettingSchema.parse(request.body);
    const setting = await this.service.upsertSetting({ key, ...validated });
    return reply.send(setting);
  }

  async deleteSetting(
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply
  ) {
    const { key } = request.params;
    await this.service.deleteSetting(key);
    return reply.status(204).send();
  }

  // === Production Calendar ===

  async getCalendarDays(
    request: FastifyRequest<{ Querystring: { from: string; to: string } }>,
    reply: FastifyReply
  ) {
    const { from, to } = request.query;
    const days = await this.service.getCalendarDays(new Date(from), new Date(to));
    return reply.send(days);
  }

  async upsertCalendarDay(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = productionCalendarSchema.parse(request.body);
    const day = await this.service.upsertCalendarDay(validated);
    return reply.send(day);
  }

  async deleteCalendarDay(
    request: FastifyRequest<{ Params: { date: string } }>,
    reply: FastifyReply
  ) {
    const { date } = request.params;
    await this.service.deleteCalendarDay(new Date(date));
    return reply.status(204).send();
  }

  // === Profile isPalletized ===

  async getProfilesWithPalletized(_request: FastifyRequest, reply: FastifyReply) {
    const profiles = await this.service.getProfilesWithPalletized();
    return reply.send(profiles);
  }

  async updateProfilePalletized(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const { isPalletized } = updateProfilePalletizedSchema.parse(request.body);
    const profile = await this.service.updateProfilePalletized(id, isPalletized);
    return reply.send(profile);
  }

  async bulkUpdateProfilePalletized(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = bulkUpdateProfilePalletizedSchema.parse(request.body);
    const profiles = await this.service.bulkUpdateProfilePalletized(validated);
    return reply.send({ success: true, updated: profiles.length });
  }

  // === Color isTypical ===

  async getColorsWithTypical(_request: FastifyRequest, reply: FastifyReply) {
    const colors = await this.service.getColorsWithTypical();
    return reply.send(colors);
  }

  async updateColorTypical(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    const { isTypical } = updateColorTypicalSchema.parse(request.body);
    const color = await this.service.updateColorTypical(id, isTypical);
    return reply.send(color);
  }

  async bulkUpdateColorTypical(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = bulkUpdateColorTypicalSchema.parse(request.body);
    const colors = await this.service.bulkUpdateColorTypical(validated);
    return reply.send({ success: true, updated: colors.length });
  }
}
