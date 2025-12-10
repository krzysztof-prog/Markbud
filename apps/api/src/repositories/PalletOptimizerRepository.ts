/**
 * Pallet Optimizer Repository - Data access layer for pallet optimization
 */

import type { PrismaClient } from '@prisma/client';
import type { WindowInput, PalletDefinition, OptimizationResult, OptimizedWindow } from '../services/pallet-optimizer/PalletOptimizerService.js';
import { NotFoundError } from '../utils/errors.js';

export class PalletOptimizerRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Pobierz głębokości profili z bazy
   */
  async getProfileDepths(): Promise<Record<string, number>> {
    const profileDepths = await this.prisma.profileDepth.findMany();
    return profileDepths.reduce((map, depth) => {
      map[depth.profileType] = depth.depthMm;
      return map;
    }, {} as Record<string, number>);
  }

  /**
   * Pobierz definicje typów palet z bazy
   */
  async getPalletTypes(): Promise<PalletDefinition[]> {
    const palletTypes = await this.prisma.palletType.findMany({
      orderBy: { lengthMm: 'desc' }, // Od najdłuższej do najkrótszej
    });

    return palletTypes.map(pt => ({
      name: pt.name,
      lengthMm: pt.lengthMm,
      maxLoadDepthMm: pt.loadDepthMm,
      maxOverhangMm: 700, // Stała wartość zgodnie z wymaganiami
    }));
  }

  /**
   * Pobierz wszystkie okna dla dostawy
   */
  async getDeliveryWindows(deliveryId: number): Promise<WindowInput[]> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                windows: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    const windows: WindowInput[] = [];
    for (const deliveryOrder of delivery.deliveryOrders) {
      const order = deliveryOrder.order;
      for (const window of order.windows) {
        windows.push({
          id: window.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          widthMm: window.widthMm,
          heightMm: window.heightMm,
          profileType: window.profileType, // Accepts any profile type from database
          quantity: window.quantity,
          reference: window.reference || undefined,
        });
      }
    }

    return windows;
  }

  /**
   * Sprawdź czy dostawa istnieje
   */
  async deliveryExists(deliveryId: number): Promise<boolean> {
    const count = await this.prisma.delivery.count({
      where: { id: deliveryId },
    });
    return count > 0;
  }

  /**
   * Zapisz optymalizację do bazy (z transakcją)
   */
  async saveOptimization(result: OptimizationResult): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Usuń starą optymalizację jeśli istnieje
      await tx.palletOptimization.deleteMany({
        where: { deliveryId: result.deliveryId },
      });

      // Zapisz nową optymalizację
      await tx.palletOptimization.create({
        data: {
          deliveryId: result.deliveryId,
          totalPallets: result.totalPallets,
          optimizationData: JSON.stringify(result),
          pallets: {
            create: result.pallets.map(pallet => ({
              palletNumber: pallet.palletNumber,
              palletTypeName: pallet.palletType,
              palletWidth: pallet.palletLengthMm,  // Długość palety (odpowiada szerokości okien)
              usedDepthMm: pallet.usedDepthMm,
              maxDepthMm: pallet.maxDepthMm,
              utilizationPercent: pallet.utilizationPercent,
              windowsData: JSON.stringify(pallet.windows),
            })),
          },
        },
      });
    });
  }

  /**
   * Pobierz zapisaną optymalizację
   */
  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    const optimization = await this.prisma.palletOptimization.findUnique({
      where: { deliveryId },
      include: {
        pallets: {
          orderBy: { palletNumber: 'asc' },
        },
      },
    });

    if (!optimization) {
      return null;
    }

    // Odtwórz wynik z danych w bazie
    // POPRAWKA: Cache parsed windows, aby nie parsować 2 razy + poprawny typ OptimizedWindow
    const parsedPallets = optimization.pallets.map(p => {
      let windows: OptimizedWindow[];
      try {
        windows = JSON.parse(p.windowsData) as OptimizedWindow[];
      } catch (error) {
        throw new Error(`Invalid JSON data in pallet ${p.palletNumber}: ${error}`);
      }

      return {
        palletNumber: p.palletNumber,
        palletType: p.palletTypeName,
        palletLengthMm: p.palletWidth,  // Długość palety
        maxDepthMm: p.maxDepthMm,
        usedDepthMm: p.usedDepthMm,
        utilizationPercent: p.utilizationPercent,
        windows,
      };
    });

    // Oblicz totalWindows z już sparsowanych danych
    const totalWindows = parsedPallets.reduce((sum, pallet) => {
      return sum + pallet.windows.reduce((wSum, w) => wSum + w.quantity, 0);
    }, 0);

    const result: OptimizationResult = {
      deliveryId: optimization.deliveryId,
      totalPallets: optimization.totalPallets,
      pallets: parsedPallets,
      summary: {
        totalWindows,
        averageUtilization: optimization.pallets.length > 0
          ? optimization.pallets.reduce((sum, p) => sum + p.utilizationPercent, 0) / optimization.pallets.length
          : 0,
      },
    };

    return result;
  }

  /**
   * Usuń optymalizację
   */
  async deleteOptimization(deliveryId: number): Promise<void> {
    const deleted = await this.prisma.palletOptimization.deleteMany({
      where: { deliveryId },
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Optimization');
    }
  }

  /**
   * Sprawdź czy optymalizacja istnieje
   */
  async optimizationExists(deliveryId: number): Promise<boolean> {
    const count = await this.prisma.palletOptimization.count({
      where: { deliveryId },
    });
    return count > 0;
  }

  /**
   * Pobierz wszystkie typy palet (dla zarządzania w panelu administracyjnym)
   */
  async getAllPalletTypes() {
    return this.prisma.palletType.findMany({
      orderBy: { lengthMm: 'desc' },
    });
  }

  /**
   * Utwórz nowy typ palety
   */
  async createPalletType(data: {
    name: string;
    lengthMm: number;      // Długość palety
    loadDepthMm: number;   // Głębokość załadunku
  }) {
    return this.prisma.palletType.create({ data });
  }

  /**
   * Zaktualizuj typ palety
   */
  async updatePalletType(id: number, data: {
    name?: string;
    lengthMm?: number;       // Długość palety
    loadDepthMm?: number;    // Głębokość załadunku
  }) {
    // POPRAWKA: Obsługa błędu gdy rekord nie istnieje
    try {
      return await this.prisma.palletType.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Pallet type');
      }
      throw error;
    }
  }

  /**
   * Usuń typ palety
   */
  async deletePalletType(id: number) {
    // POPRAWKA: Prisma delete() rzuca wyjątek jeśli nie znajdzie, więc try-catch
    try {
      return await this.prisma.palletType.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Prisma error: "Record to delete does not exist"
        throw new NotFoundError('Pallet type');
      }
      throw error;
    }
  }

  /**
   * Pobierz typ palety po ID
   */
  async getPalletTypeById(id: number) {
    const palletType = await this.prisma.palletType.findUnique({
      where: { id },
    });

    if (!palletType) {
      throw new NotFoundError('Pallet type');
    }

    return palletType;
  }
}
