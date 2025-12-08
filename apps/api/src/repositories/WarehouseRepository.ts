/**
 * Warehouse Repository - Database access layer
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { profileBasicSelect } from '../utils/prisma-selects.js';

export class WarehouseRepository {
  constructor(private prisma: PrismaClient) {}

  async getStock(profileId?: number, colorId?: number) {
    const where: Prisma.WarehouseStockWhereInput = {};
    if (profileId) where.profileId = profileId;
    if (colorId) where.colorId = colorId;

    return this.prisma.warehouseStock.findMany({
      where,
      select: {
        id: true,
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: [{ profile: { number: 'asc' } }, { color: { code: 'asc' } }],
    });
  }

  async updateStock(id: number, currentStockBeams: number) {
    return this.prisma.warehouseStock.update({
      where: { id },
      data: { currentStockBeams },
    });
  }
}
