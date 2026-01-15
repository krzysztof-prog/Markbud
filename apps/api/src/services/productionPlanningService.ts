/**
 * Production Planning Service - Business logic dla planowania produkcji
 */
import type { PrismaClient } from '@prisma/client';
import type {
  EfficiencyConfigInput,
  ProductionSettingInput,
  ProductionCalendarInput,
  BulkUpdateProfilePalletizedInput,
  BulkUpdateColorTypicalInput,
} from '../validators/productionPlanning.js';

export class ProductionPlanningService {
  constructor(private prisma: PrismaClient) {}

  // === Efficiency Config ===

  async getAllEfficiencyConfigs() {
    return this.prisma.productionEfficiencyConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getEfficiencyConfigById(id: number) {
    return this.prisma.productionEfficiencyConfig.findUnique({
      where: { id },
    });
  }

  async getEfficiencyConfigByClientType(clientType: string) {
    return this.prisma.productionEfficiencyConfig.findUnique({
      where: { clientType },
    });
  }

  async createEfficiencyConfig(data: EfficiencyConfigInput) {
    return this.prisma.productionEfficiencyConfig.create({
      data: {
        clientType: data.clientType,
        name: data.name,
        glazingsPerHour: data.glazingsPerHour,
        wingsPerHour: data.wingsPerHour,
        coefficient: data.coefficient ?? 1.0,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateEfficiencyConfig(id: number, data: Partial<EfficiencyConfigInput>) {
    return this.prisma.productionEfficiencyConfig.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.glazingsPerHour !== undefined && { glazingsPerHour: data.glazingsPerHour }),
        ...(data.wingsPerHour !== undefined && { wingsPerHour: data.wingsPerHour }),
        ...(data.coefficient !== undefined && { coefficient: data.coefficient }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async deleteEfficiencyConfig(id: number) {
    return this.prisma.productionEfficiencyConfig.delete({
      where: { id },
    });
  }

  // === Production Settings ===

  async getAllSettings() {
    return this.prisma.productionSettings.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getSettingByKey(key: string) {
    return this.prisma.productionSettings.findUnique({
      where: { key },
    });
  }

  async upsertSetting(data: ProductionSettingInput) {
    return this.prisma.productionSettings.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        description: data.description,
      },
      create: {
        key: data.key,
        value: data.value,
        description: data.description,
      },
    });
  }

  async deleteSetting(key: string) {
    return this.prisma.productionSettings.delete({
      where: { key },
    });
  }

  // === Production Calendar ===

  async getCalendarDays(from: Date, to: Date) {
    return this.prisma.productionCalendar.findMany({
      where: {
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getCalendarDay(date: Date) {
    // Normalizuj datę do początku dnia
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return this.prisma.productionCalendar.findUnique({
      where: { date: normalizedDate },
    });
  }

  async upsertCalendarDay(data: ProductionCalendarInput) {
    // Normalizuj datę do początku dnia
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    return this.prisma.productionCalendar.upsert({
      where: { date: normalizedDate },
      update: {
        dayType: data.dayType,
        description: data.description,
        maxHours: data.maxHours,
      },
      create: {
        date: normalizedDate,
        dayType: data.dayType,
        description: data.description,
        maxHours: data.maxHours,
      },
    });
  }

  async deleteCalendarDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return this.prisma.productionCalendar.delete({
      where: { date: normalizedDate },
    });
  }

  // === Profile isPalletized ===

  async getProfilesWithPalletized() {
    return this.prisma.profile.findMany({
      select: {
        id: true,
        number: true,
        name: true,
        articleNumber: true,
        isPalletized: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateProfilePalletized(id: number, isPalletized: boolean) {
    return this.prisma.profile.update({
      where: { id },
      data: { isPalletized },
    });
  }

  async bulkUpdateProfilePalletized(data: BulkUpdateProfilePalletizedInput) {
    const updates = data.profiles.map((p) =>
      this.prisma.profile.update({
        where: { id: p.id },
        data: { isPalletized: p.isPalletized },
      })
    );
    return this.prisma.$transaction(updates);
  }

  // === Color isTypical ===

  async getColorsWithTypical() {
    return this.prisma.color.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        hexColor: true,
        isTypical: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateColorTypical(id: number, isTypical: boolean) {
    return this.prisma.color.update({
      where: { id },
      data: { isTypical },
    });
  }

  async bulkUpdateColorTypical(data: BulkUpdateColorTypicalInput) {
    const updates = data.colors.map((c) =>
      this.prisma.color.update({
        where: { id: c.id },
        data: { isTypical: c.isTypical },
      })
    );
    return this.prisma.$transaction(updates);
  }
}
