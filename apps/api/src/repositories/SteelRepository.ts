/**
 * Repository dla modułu Steel (wzmocnienia stalowe)
 */
import { PrismaClient } from '@prisma/client';
import type { CreateSteelInput, UpdateSteelInput } from '../validators/steel.js';

export class SteelRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Pobiera wszystkie stale z ich stanem magazynowym
   */
  async findAll() {
    return this.prisma.steel.findMany({
      include: {
        steelStock: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Pobiera stal po ID
   */
  async findById(id: number) {
    return this.prisma.steel.findUnique({
      where: { id },
      include: {
        steelStock: true,
      },
    });
  }

  /**
   * Pobiera stal po numerze
   */
  async findByNumber(number: string) {
    return this.prisma.steel.findUnique({
      where: { number },
      include: {
        steelStock: true,
      },
    });
  }

  /**
   * Pobiera stal po numerze artykułu
   */
  async findByArticleNumber(articleNumber: string) {
    return this.prisma.steel.findUnique({
      where: { articleNumber },
      include: {
        steelStock: true,
      },
    });
  }

  /**
   * Tworzy nową stal wraz z rekordem stock
   */
  async create(data: CreateSteelInput) {
    return this.prisma.steel.create({
      data: {
        ...data,
        steelStock: {
          create: {
            currentStockBeams: 0,
            initialStockBeams: 0,
          },
        },
      },
      include: {
        steelStock: true,
      },
    });
  }

  /**
   * Aktualizuje stal
   */
  async update(id: number, data: UpdateSteelInput) {
    return this.prisma.steel.update({
      where: { id },
      data,
      include: {
        steelStock: true,
      },
    });
  }

  /**
   * Usuwa stal (tylko jeśli nie ma powiązań)
   */
  async delete(id: number) {
    // Najpierw usuń stock
    await this.prisma.steelStock.deleteMany({
      where: { steelId: id },
    });

    return this.prisma.steel.delete({
      where: { id },
    });
  }

  /**
   * Sprawdza czy stal ma powiązania (zamówienia, zapotrzebowanie)
   */
  async hasRelations(id: number) {
    const [ordersCount, requirementsCount, historyCount] = await Promise.all([
      this.prisma.steelOrder.count({ where: { steelId: id } }),
      this.prisma.orderSteelRequirement.count({ where: { steelId: id } }),
      this.prisma.steelHistory.count({ where: { steelId: id } }),
    ]);

    return ordersCount > 0 || requirementsCount > 0 || historyCount > 0;
  }

  /**
   * Aktualizuje kolejność wielu stali
   */
  async updateOrders(orders: { id: number; sortOrder: number }[]) {
    const updates = orders.map((order) =>
      this.prisma.steel.update({
        where: { id: order.id },
        data: { sortOrder: order.sortOrder },
      })
    );

    return this.prisma.$transaction(updates);
  }

  /**
   * Pobiera stan magazynowy dla stali
   */
  async getStock(steelId: number) {
    return this.prisma.steelStock.findUnique({
      where: { steelId },
      include: {
        steel: true,
      },
    });
  }

  /**
   * Aktualizuje stan magazynowy z historią
   */
  async updateStock(
    steelId: number,
    currentStockBeams: number,
    notes: string | undefined,
    userId: number | undefined
  ) {
    const existingStock = await this.prisma.steelStock.findUnique({
      where: { steelId },
    });

    if (!existingStock) {
      throw new Error(`Nie znaleziono stanu magazynowego dla stali ${steelId}`);
    }

    const previousStock = existingStock.currentStockBeams;
    const difference = currentStockBeams - previousStock;

    // Aktualizacja w transakcji
    return this.prisma.$transaction(async (tx) => {
      // Aktualizuj stock
      const updatedStock = await tx.steelStock.update({
        where: { steelId },
        data: {
          currentStockBeams,
          version: { increment: 1 },
          updatedById: userId,
        },
        include: {
          steel: true,
        },
      });

      // Dodaj wpis do historii
      await tx.steelHistory.create({
        data: {
          steelId,
          calculatedStock: previousStock,
          actualStock: currentStockBeams,
          difference,
          previousStock,
          currentStock: currentStockBeams,
          changeType: 'adjustment',
          notes,
          recordedById: userId,
        },
      });

      return updatedStock;
    });
  }

  /**
   * Pobiera wszystkie stale z ich stanem magazynowym (dla widoku magazynu)
   */
  async findAllWithStock() {
    return this.prisma.steel.findMany({
      include: {
        steelStock: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Sprawdza czy numer stali jest unikalny (dla walidacji)
   */
  async isNumberUnique(number: string, excludeId?: number) {
    const existing = await this.prisma.steel.findFirst({
      where: {
        number,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return !existing;
  }

  /**
   * Sprawdza czy numer artykułu jest unikalny (dla walidacji)
   */
  async isArticleNumberUnique(articleNumber: string, excludeId?: number) {
    const existing = await this.prisma.steel.findFirst({
      where: {
        articleNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return !existing;
  }

  /**
   * Pobiera historię zmian stanu magazynowego stali
   */
  async getHistory(limit = 100) {
    return this.prisma.steelHistory.findMany({
      include: {
        steel: {
          select: {
            number: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
