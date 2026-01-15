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
    if (profileIds.length === 0) return;

    // Pobierz istniejące powiązania w jednym zapytaniu
    const existingLinks = await this.prisma.profileColor.findMany({
      where: {
        colorId,
        profileId: { in: profileIds },
      },
      select: { profileId: true },
    });

    const existingProfileIds = new Set(existingLinks.map((link) => link.profileId));

    // Filtruj tylko nowe profile (te które nie istnieją)
    const newProfileIds = profileIds.filter((id) => !existingProfileIds.has(id));

    if (newProfileIds.length === 0) return;

    // Batch insert - jedno zapytanie zamiast N
    await this.prisma.profileColor.createMany({
      data: newProfileIds.map((profileId) => ({
        profileId,
        colorId,
        isVisible: true,
      })),
    });
  }

  async createWarehouseStockEntries(colorId: number, profileIds: number[]): Promise<void> {
    if (profileIds.length === 0) return;

    // Pobierz istniejące wpisy w jednym zapytaniu
    const existingStocks = await this.prisma.warehouseStock.findMany({
      where: {
        colorId,
        profileId: { in: profileIds },
      },
      select: { profileId: true },
    });

    const existingProfileIds = new Set(existingStocks.map((stock) => stock.profileId));

    // Filtruj tylko nowe profile
    const newProfileIds = profileIds.filter((id) => !existingProfileIds.has(id));

    if (newProfileIds.length === 0) return;

    // Batch insert - jedno zapytanie zamiast N
    await this.prisma.warehouseStock.createMany({
      data: newProfileIds.map((profileId) => ({
        profileId,
        colorId,
        currentStockBeams: 0,
        updatedById: 1, // System user ID
      })),
    });
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
