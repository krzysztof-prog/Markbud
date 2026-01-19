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

  async updatePalletType(id: number, data: Partial<{ name: string; lengthMm: number; widthMm: number; heightMm: number; loadWidthMm: number }>) {
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

  // User Folder Settings
  async getUserFolderPath(userId: number) {
    // Try to get user-specific settings first
    const userSettings = await this.repository.findUserFolderSettings(userId);
    
    if (userSettings && userSettings.isActive) {
      return { importsBasePath: userSettings.importsBasePath };
    }

    // Fallback to global settings
    const globalSettings = await this.repository.findGlobalFolderSettings();
    
    if (globalSettings && globalSettings.isActive) {
      return { importsBasePath: globalSettings.importsBasePath };
    }

    // No settings found
    throw new NotFoundError('Folder settings not configured');
  }

  async updateUserFolderPath(userId: number, importsBasePath: string) {
    return this.repository.upsertUserFolderSettings(userId, importsBasePath);
  }

  async updateGlobalFolderPath(importsBasePath: string) {
    return this.repository.upsertGlobalFolderSettings(importsBasePath);
  }

  // Document Author Mappings
  async getAllDocumentAuthorMappings() {
    return this.repository.findAllDocumentAuthorMappings();
  }

  async createDocumentAuthorMapping(data: { authorName: string; userId: number }) {
    return this.repository.createDocumentAuthorMapping(data);
  }

  async updateDocumentAuthorMapping(id: number, data: { authorName?: string; userId?: number }) {
    return this.repository.updateDocumentAuthorMapping(id, data);
  }

  async deleteDocumentAuthorMapping(id: number) {
    return this.repository.deleteDocumentAuthorMapping(id);
  }
}
