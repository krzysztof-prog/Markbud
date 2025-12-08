/**
 * Profile Depth Repository - Data access for profile depths
 */

import type { PrismaClient, ProfileDepth } from '@prisma/client';
import type { ProfileDepthInput, UpdateProfileDepthInput } from '../validators/profileDepth.js';

export class ProfileDepthRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all profile depths
   */
  async getAll(): Promise<ProfileDepth[]> {
    return this.prisma.profileDepth.findMany({
      orderBy: { profileType: 'asc' },
    });
  }

  /**
   * Get profile depth by ID
   */
  async getById(id: number): Promise<ProfileDepth | null> {
    return this.prisma.profileDepth.findUnique({
      where: { id },
    });
  }

  /**
   * Get profile depth by profile type
   */
  async getByProfileType(profileType: string): Promise<ProfileDepth | null> {
    return this.prisma.profileDepth.findUnique({
      where: { profileType },
    });
  }

  /**
   * Get all profile depths as a map (profileType => depthMm)
   */
  async getDepthsMap(): Promise<Record<string, number>> {
    const depths = await this.getAll();
    return depths.reduce((map, depth) => {
      map[depth.profileType] = depth.depthMm;
      return map;
    }, {} as Record<string, number>);
  }

  /**
   * Create profile depth
   */
  async create(data: ProfileDepthInput): Promise<ProfileDepth> {
    return this.prisma.profileDepth.create({
      data,
    });
  }

  /**
   * Update profile depth
   */
  async update(id: number, data: UpdateProfileDepthInput): Promise<ProfileDepth> {
    return this.prisma.profileDepth.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete profile depth
   */
  async delete(id: number): Promise<void> {
    await this.prisma.profileDepth.delete({
      where: { id },
    });
  }
}
