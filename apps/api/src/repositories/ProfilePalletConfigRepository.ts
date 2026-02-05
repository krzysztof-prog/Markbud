/**
 * Profile Pallet Config Repository - Data access for pallet-to-beam conversion configs
 */

import type { PrismaClient, ProfilePalletConfig } from '@prisma/client';
import type { ProfilePalletConfigInput, UpdateProfilePalletConfigInput } from '../validators/profilePalletConfig.js';

export class ProfilePalletConfigRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all configs with profile relation
   */
  async getAll(): Promise<(ProfilePalletConfig & { profile: { id: number; number: string; name: string } })[]> {
    return this.prisma.profilePalletConfig.findMany({
      include: {
        profile: {
          select: { id: true, number: true, name: true },
        },
      },
      orderBy: { profile: { number: 'asc' } },
    });
  }

  /**
   * Get config by ID
   */
  async getById(id: number): Promise<ProfilePalletConfig | null> {
    return this.prisma.profilePalletConfig.findUnique({
      where: { id },
      include: {
        profile: {
          select: { id: true, number: true, name: true },
        },
      },
    });
  }

  /**
   * Get all configs as a map (profileId => beamsPerPallet)
   */
  async getBeamsPerPalletMap(): Promise<Map<number, number>> {
    const configs = await this.prisma.profilePalletConfig.findMany();
    const map = new Map<number, number>();
    for (const config of configs) {
      map.set(config.profileId, config.beamsPerPallet);
    }
    return map;
  }

  /**
   * Create config
   */
  async create(data: ProfilePalletConfigInput): Promise<ProfilePalletConfig> {
    return this.prisma.profilePalletConfig.create({
      data,
      include: {
        profile: {
          select: { id: true, number: true, name: true },
        },
      },
    });
  }

  /**
   * Update config
   */
  async update(id: number, data: UpdateProfilePalletConfigInput): Promise<ProfilePalletConfig> {
    return this.prisma.profilePalletConfig.update({
      where: { id },
      data,
      include: {
        profile: {
          select: { id: true, number: true, name: true },
        },
      },
    });
  }

  /**
   * Delete config
   */
  async delete(id: number): Promise<void> {
    await this.prisma.profilePalletConfig.delete({
      where: { id },
    });
  }
}
