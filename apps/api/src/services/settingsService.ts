/**
 * Settings Service - Business logic layer
 */

import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { NotFoundError } from '../utils/errors.js';

export class SettingsService {
  constructor(private repository: SettingsRepository) {}

  async getAllSettings() {
    const settings = await this.repository.findAll();

    // Transform to object
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }

    return settingsObj;
  }

  async getSettingByKey(key: string) {
    const setting = await this.repository.findByKey(key);

    if (!setting) {
      throw new NotFoundError('Setting');
    }

    return setting;
  }

  async upsertSetting(key: string, value: string) {
    return this.repository.upsert(key, value);
  }

  async upsertManySettings(settings: Record<string, string>) {
    await this.repository.upsertMany(settings);
    return { success: true };
  }

  // Pallet Types
  async getAllPalletTypes() {
    return this.repository.findAllPalletTypes();
  }

  async createPalletType(data: { name: string; lengthMm: number; widthMm: number; heightMm: number; loadWidthMm: number }) {
    return this.repository.createPalletType(data);
  }

  async updatePalletType(id: number, data: any) {
    return this.repository.updatePalletType(id, data);
  }

  async deletePalletType(id: number) {
    return this.repository.deletePalletType(id);
  }

  // Packing Rules
  async getAllPackingRules() {
    const rules = await this.repository.findAllPackingRules();
    return rules.map(rule => ({ ...rule, ruleConfig: JSON.parse(rule.ruleConfig) }));
  }

  async createPackingRule(data: { name: string; description?: string; isActive?: boolean; ruleConfig: Record<string, unknown> }) {
    const rule = await this.repository.createPackingRule({
      ...data,
      ruleConfig: JSON.stringify(data.ruleConfig),
    });
    return { ...rule, ruleConfig: JSON.parse(rule.ruleConfig) };
  }

  async updatePackingRule(id: number, data: { name?: string; description?: string; isActive?: boolean; ruleConfig?: Record<string, unknown> }) {
    const { ruleConfig, ...rest } = data;
    const updateData = ruleConfig
      ? { ...rest, ruleConfig: JSON.stringify(ruleConfig) }
      : rest;

    const rule = await this.repository.updatePackingRule(id, updateData);
    return { ...rule, ruleConfig: JSON.parse(rule.ruleConfig) };
  }

  async deletePackingRule(id: number) {
    return this.repository.deletePackingRule(id);
  }
}
