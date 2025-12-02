/**
 * Color Service - Business logic layer
 */

import { ColorRepository } from '../repositories/ColorRepository.js';
import { cacheService } from './cache.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { CreateColorInput, UpdateColorInput } from '../validators/color.js';

export class ColorService {
  constructor(private repository: ColorRepository) {}

  async getAllColors(type?: string) {
    // Cache key depends on type
    const cacheKey = type
      ? type === 'typical'
        ? 'colors:typical'
        : 'colors:atypical'
      : 'colors';

    return cacheService.getOrCompute(
      cacheKey,
      () => this.repository.findAll(type),
      3600 // 1 hour TTL
    );
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

    // Invalidate color caches
    cacheService.invalidateOnColorChange();

    return color;
  }

  async updateColor(id: number, data: UpdateColorInput) {
    // Verify color exists
    await this.getColorById(id);

    const updated = await this.repository.update(id, data);

    // Invalidate color caches
    cacheService.invalidateOnColorChange();

    return updated;
  }

  async deleteColor(id: number) {
    // Verify color exists
    await this.getColorById(id);

    await this.repository.delete(id);

    // Invalidate color caches
    cacheService.invalidateOnColorChange();
  }

  async updateProfileColorVisibility(profileId: number, colorId: number, isVisible: boolean) {
    const result = await this.repository.updateProfileColorVisibility(profileId, colorId, isVisible);

    // Invalidate color caches on visibility change
    cacheService.invalidateOnColorChange();

    return result;
  }
}
