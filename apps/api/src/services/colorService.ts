/**
 * Color Service - Business logic layer
 */

import { ColorRepository } from '../repositories/ColorRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { CreateColorInput, UpdateColorInput } from '../validators/color.js';

export class ColorService {
  constructor(private repository: ColorRepository) {}

  async getAllColors(type?: string) {
    return this.repository.findAll(type);
  }

  async getColorById(id: number) {
    const color = await this.repository.findById(id);

    if (!color) {
      throw new NotFoundError('Color');
    }

    return color;
  }

  async createColor(data: CreateColorInput) {
    // Check if color with this code already exists
    const existing = await this.repository.findByCode(data.code);

    if (existing) {
      throw new ConflictError('Color with this code already exists');
    }

    // Create color
    const color = await this.repository.create({
      code: data.code,
      name: data.name,
      type: data.type || 'typical',
      hexColor: data.hexColor,
    });

    // Automatically create profile-color links for all profiles
    const profiles = await this.repository.getAllProfiles();
    const profileIds = profiles.map((p) => p.id);

    await this.repository.createProfileColorLinks(color.id, profileIds);
    await this.repository.createWarehouseStockEntries(color.id, profileIds);

    return color;
  }

  async updateColor(id: number, data: UpdateColorInput) {
    // Verify color exists
    await this.getColorById(id);

    return this.repository.update(id, data);
  }

  async deleteColor(id: number) {
    // Verify color exists
    await this.getColorById(id);

    return this.repository.delete(id);
  }

  async updateProfileColorVisibility(profileId: number, colorId: number, isVisible: boolean) {
    return this.repository.updateProfileColorVisibility(profileId, colorId, isVisible);
  }
}
