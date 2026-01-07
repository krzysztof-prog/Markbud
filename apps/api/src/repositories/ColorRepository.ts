/**
 * Color Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';
import type { Color } from '@prisma/client';

export class ColorRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(type?: string) {
    return this.prisma.color.findMany({
      where: type ? { type } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.color.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        hexColor: true,
        createdAt: true,
        updatedAt: true,
        profileColors: {
          select: {
            profileId: true,
            colorId: true,
            isVisible: true,
            profile: {
              select: {
                id: true,
                number: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Color | null> {
    return this.prisma.color.findUnique({
      where: { code },
    });
  }

  async create(data: { code: string; name: string; type: string; hexColor?: string }): Promise<Color> {
    return this.prisma.color.create({
      data,
    });
  }

  async update(id: number, data: { code?: string; name?: string; type?: string; hexColor?: string }): Promise<Color> {
    return this.prisma.color.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.color.delete({
      where: { id },
    });
  }

  async getAllProfiles() {
    return this.prisma.profile.findMany();
  }

  async createProfileColorLinks(colorId: number, profileIds: number[]): Promise<void> {
    // SQLite nie wspiera skipDuplicates - sprawdzamy ręcznie
    for (const profileId of profileIds) {
      const existing = await this.prisma.profileColor.findUnique({
        where: {
          profileId_colorId: {
            profileId,
            colorId,
          },
        },
      });

      if (!existing) {
        await this.prisma.profileColor.create({
          data: {
            profileId,
            colorId,
            isVisible: true,
          },
        });
      }
    }
  }

  async createWarehouseStockEntries(colorId: number, profileIds: number[]): Promise<void> {
    // SQLite nie wspiera skipDuplicates - sprawdzamy ręcznie
    for (const profileId of profileIds) {
      const existing = await this.prisma.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId,
            colorId,
          },
        },
      });

      if (!existing) {
        await this.prisma.warehouseStock.create({
          data: {
            profileId,
            colorId,
            currentStockBeams: 0,
            updatedById: 1, // System user ID
          },
        });
      }
    }
  }

  async updateProfileColorVisibility(profileId: number, colorId: number, isVisible: boolean) {
    return this.prisma.profileColor.update({
      where: {
        profileId_colorId: {
          profileId,
          colorId,
        },
      },
      data: { isVisible },
    });
  }
}
