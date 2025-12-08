/**
 * Profile Service - Business logic layer
 */

import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { cacheService } from './cache.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { CreateProfileInput, UpdateProfileInput, UpdateProfileOrderInput } from '../validators/profile.js';

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

    // Check for related records that would prevent deletion
    const relatedCounts = await this.repository.getRelatedCounts(id);

    const hasRelatedData =
      relatedCounts.orderRequirements > 0 ||
      relatedCounts.warehouseStock > 0 ||
      relatedCounts.warehouseOrders > 0 ||
      relatedCounts.warehouseHistory > 0;

    if (hasRelatedData) {
      const details: string[] = [];
      if (relatedCounts.orderRequirements > 0) {
        details.push(`zapotrzebowanie w ${relatedCounts.orderRequirements} zleceniach`);
      }
      if (relatedCounts.warehouseStock > 0) {
        details.push(`stan magazynowy (${relatedCounts.warehouseStock} pozycji)`);
      }
      if (relatedCounts.warehouseOrders > 0) {
        details.push(`${relatedCounts.warehouseOrders} zamówień magazynowych`);
      }
      if (relatedCounts.warehouseHistory > 0) {
        details.push(`historia magazynu (${relatedCounts.warehouseHistory} wpisów)`);
      }

      throw new ConflictError(
        `Nie można usunąć profilu - istnieją powiązane dane: ${details.join(', ')}. Usuń najpierw powiązane dane.`
      );
    }

    await this.repository.delete(id);

    // Invalidate all profiles cache
    cacheService.invalidateOnProfileChange();
  }

  async updateProfileOrders(data: UpdateProfileOrderInput) {
    await this.repository.updateProfileOrders(data.profileOrders);

    // Invalidate all profiles cache
    cacheService.invalidateOnProfileChange();
  }
}
