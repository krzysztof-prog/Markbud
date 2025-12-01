/**
 * Profile Service - Business logic layer
 */

import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { CreateProfileInput, UpdateProfileInput } from '../validators/profile.js';

export class ProfileService {
  constructor(private repository: ProfileRepository) {}

  async getAllProfiles() {
    return this.repository.findAll();
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

    return this.repository.create(data);
  }

  async updateProfile(id: number, data: UpdateProfileInput) {
    // Verify profile exists
    await this.getProfileById(id);

    return this.repository.update(id, data);
  }

  async deleteProfile(id: number) {
    // Verify profile exists
    await this.getProfileById(id);

    return this.repository.delete(id);
  }
}
