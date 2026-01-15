/**
 * Profile Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';
import type { Profile } from '@prisma/client';

export class ProfileRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
    });
  }

  async findById(id: number) {
    return this.prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        articleNumber: true,
        name: true,
        description: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        profileColors: {
          select: {
            profileId: true,
            colorId: true,
            isVisible: true,
            color: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                hexColor: true,
              },
            },
          },
        },
      },
    });
  }

  async findByNumber(number: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { number },
    });
  }

  async findByArticleNumber(articleNumber: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { articleNumber },
    });
  }

  async create(data: { number: string; name: string; description?: string | null; articleNumber?: string | null }): Promise<Profile> {
    return this.prisma.profile.create({
      data,
    });
  }

  async update(id: number, data: { name?: string; description?: string | null; articleNumber?: string | null }): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    // First delete related ProfileColor records (has onDelete: Cascade but do it explicitly)
    await this.prisma.profileColor.deleteMany({
      where: { profileId: id },
    });

    await this.prisma.profile.delete({
      where: { id },
    });
  }

  async getRelatedCounts(id: number): Promise<{
    orderRequirements: number;
    warehouseStock: number;
    warehouseOrders: number;
    warehouseHistory: number;
  }> {
    const [orderRequirements, warehouseStock, warehouseOrders, warehouseHistory] =
      await Promise.all([
        this.prisma.orderRequirement.count({ where: { profileId: id } }),
        this.prisma.warehouseStock.count({ where: { profileId: id } }),
        this.prisma.warehouseOrder.count({ where: { profileId: id } }),
        this.prisma.warehouseHistory.count({ where: { profileId: id } }),
      ]);

    return {
      orderRequirements,
      warehouseStock,
      warehouseOrders,
      warehouseHistory,
    };
  }

  async updateProfileOrders(profileOrders: { id: number; sortOrder: number }[]): Promise<void> {
    // Use transaction to update all profiles atomically
    await this.prisma.$transaction(
      profileOrders.map((order) =>
        this.prisma.profile.update({
          where: { id: order.id },
          data: { sortOrder: order.sortOrder },
        })
      )
    );
  }

  /**
   * Pobiera wszystkie kolory z bazy
   */
  async getAllColors() {
    return this.prisma.color.findMany({
      select: { id: true },
    });
  }

  /**
   * Tworzy powiązania ProfileColor dla danego profilu ze wszystkimi kolorami
   * Używa batch operations zamiast N+1 queries
   */
  async createProfileColorLinks(profileId: number, colorIds: number[]): Promise<void> {
    if (colorIds.length === 0) return;

    // Pobierz istniejące powiązania w jednym zapytaniu
    const existingLinks = await this.prisma.profileColor.findMany({
      where: {
        profileId,
        colorId: { in: colorIds },
      },
      select: { colorId: true },
    });

    const existingColorIds = new Set(existingLinks.map((link) => link.colorId));

    // Filtruj tylko nowe kolory
    const newColorIds = colorIds.filter((id) => !existingColorIds.has(id));

    if (newColorIds.length === 0) return;

    // Batch insert - jedno zapytanie zamiast N
    await this.prisma.profileColor.createMany({
      data: newColorIds.map((colorId) => ({
        profileId,
        colorId,
        isVisible: true,
      })),
    });
  }

  /**
   * Tworzy wpisy WarehouseStock dla danego profilu ze wszystkimi kolorami
   * Używa batch operations zamiast N+1 queries
   */
  async createWarehouseStockEntries(profileId: number, colorIds: number[]): Promise<void> {
    if (colorIds.length === 0) return;

    // Pobierz istniejące wpisy w jednym zapytaniu
    const existingStocks = await this.prisma.warehouseStock.findMany({
      where: {
        profileId,
        colorId: { in: colorIds },
      },
      select: { colorId: true },
    });

    const existingColorIds = new Set(existingStocks.map((stock) => stock.colorId));

    // Filtruj tylko nowe kolory
    const newColorIds = colorIds.filter((id) => !existingColorIds.has(id));

    if (newColorIds.length === 0) return;

    // Batch insert - jedno zapytanie zamiast N
    await this.prisma.warehouseStock.createMany({
      data: newColorIds.map((colorId) => ({
        profileId,
        colorId,
        currentStockBeams: 0,
        updatedById: 1, // System user ID
      })),
    });
  }
}
