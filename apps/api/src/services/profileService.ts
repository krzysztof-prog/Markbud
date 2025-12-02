/**
 * Profile Service - Business logic layer
 */

import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { cacheService } from './cache.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { CreateProfileInput, UpdateProfileInput } from '../validators/profile.js';

export class ProfileService {
  constructor(private repository: ProfileRepository) {}

  async getAllProfiles() {
    // Try to get from cache (1 hour TTL)
    return cacheService.getOrCompute(
      'profiles',
      () => this.repository.findAll(),
      3600 // 1 hour TTL
    );
  }

  async getProfileById(id: number) {
    const profile = await this.repository.findById(id);

    if (!profile) {
      throw new NotFoundError('Profile');
    }

    return profile;
  }

  async createProfile(data: CreateProfileInput) {
    // Check if profile with this number already exists
    const existing = await this.repository.findByNumber(data.number);

    if (existing) {
      throw new ConflictError('Profile with this number already exists');
    }

    const created = await this.repository.create(data);

    // Invalidate all profiles cache
    cacheService.invalidateOnProfileChange();

    return created;
  }

  async updateProfile(id: number, data: UpdateProfileInput) {
    // Verify profile exists
    await this.getProfileById(id);

    const updated = await this.repository.update(id, data);

    // Invalidate all profiles cache
    cacheService.invalidateOnProfileChange();

    return updated;
  }

  async deleteProfile(id: number) {
    // Verify profile exists
    await this.getProfileById(id);

    await this.repository.delete(id);

    // Invalidate all profiles cache
    cacheService.invalidateOnProfileChange();
  }
}
