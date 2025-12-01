/**
 * Settings Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { SettingsService } from '../services/settingsService.js';
import {
  CreatePalletTypeBody,
  UpdatePalletTypeBody,
  CreatePackingRuleBody,
  UpdatePackingRuleBody,
} from '../validators/settings.js';
import { ValidationError } from '../utils/errors.js';

export class SettingsHandler {
  constructor(private service: SettingsService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const settings = await this.service.getAllSettings();
    return reply.send(settings);
  }

  async getByKey(request: FastifyRequest<{ Params: { key: string } }>, reply: FastifyReply) {
    const { key } = request.params;
    const setting = await this.service.getSettingByKey(key);
    return reply.send(setting);
  }

  async upsertOne(
    request: FastifyRequest<{ Params: { key: string }; Body: { value: string } }>,
    reply: FastifyReply
  ) {
    const { key } = request.params;
    const { value } = request.body;
    const setting = await this.service.upsertSetting(key, value);
    return reply.send(setting);
  }

  async upsertMany(
    request: FastifyRequest<{ Body: Record<string, string> }>,
    reply: FastifyReply
  ) {
    const settings = request.body;
    const result = await this.service.upsertManySettings(settings);
    return reply.send(result);
  }

  // Pallet Types
  async getAllPalletTypes(request: FastifyRequest, reply: FastifyReply) {
    const palletTypes = await this.service.getAllPalletTypes();
    return reply.send(palletTypes);
  }

  async createPalletType(request: FastifyRequest<{ Body: CreatePalletTypeBody }>, reply: FastifyReply) {
    const palletType = await this.service.createPalletType(request.body);
    return reply.status(201).send(palletType);
  }

  async updatePalletType(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePalletTypeBody }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid pallet type ID');
    }
    const palletType = await this.service.updatePalletType(id, request.body);
    return reply.send(palletType);
  }

  async deletePalletType(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid pallet type ID');
    }
    await this.service.deletePalletType(id);
    return reply.status(204).send();
  }

  // Packing Rules
  async getAllPackingRules(request: FastifyRequest, reply: FastifyReply) {
    const rules = await this.service.getAllPackingRules();
    return reply.send(rules);
  }

  async createPackingRule(request: FastifyRequest<{ Body: CreatePackingRuleBody }>, reply: FastifyReply) {
    const rule = await this.service.createPackingRule(request.body);
    return reply.status(201).send(rule);
  }

  async updatePackingRule(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePackingRuleBody }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid packing rule ID');
    }
    // Remove null values - convert to undefined for service
    const { description, ...rest } = request.body;
    const body: {
      name?: string;
      description?: string;
      isActive?: boolean;
      ruleConfig?: Record<string, unknown>;
    } = {
      ...rest,
      ...(description !== null && description !== undefined ? { description } : {}),
    };
    const rule = await this.service.updatePackingRule(id, body);
    return reply.send(rule);
  }

  async deletePackingRule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid packing rule ID');
    }
    await this.service.deletePackingRule(id);
    return reply.status(204).send();
  }
}
