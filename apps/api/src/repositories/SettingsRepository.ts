/**
 * Settings Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';

export class SettingsRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.setting.findMany();
  }

  async findByKey(key: string) {
    return this.prisma.setting.findUnique({
      where: { key },
    });
  }

  async upsert(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async upsertMany(settings: Record<string, string>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    try {
      return await this.prisma.$transaction(updates);
    } catch (error) {
      throw new Error(`Failed to upsert settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Pallet Types
  async findAllPalletTypes() {
    return this.prisma.palletType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createPalletType(data: { name: string; lengthMm: number; widthMm: number; heightMm: number; loadWidthMm: number }) {
    return this.prisma.palletType.create({
      data,
    });
  }

  async updatePalletType(id: number, data: any) {
    return this.prisma.palletType.update({
      where: { id },
      data,
    });
  }

  async deletePalletType(id: number) {
    await this.prisma.palletType.delete({
      where: { id },
    });
  }

  // Packing Rules
  async findAllPackingRules() {
    return this.prisma.packingRule.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createPackingRule(data: { name: string; description?: string; isActive?: boolean; ruleConfig: string }) {
    return this.prisma.packingRule.create({
      data,
    });
  }

  async updatePackingRule(id: number, data: any) {
    return this.prisma.packingRule.update({
      where: { id },
      data,
    });
  }

  async deletePackingRule(id: number) {
    await this.prisma.packingRule.delete({
      where: { id },
    });
  }
}
