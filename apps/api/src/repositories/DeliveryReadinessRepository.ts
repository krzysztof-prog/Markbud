/**
 * Repository dla DeliveryReadiness
 *
 * Obsługuje operacje CRUD na tabeli delivery_readiness
 */

import type { PrismaClient, DeliveryReadiness, Prisma } from '@prisma/client';

export class DeliveryReadinessRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Znajdź readiness dla dostawy
   */
  async findByDeliveryId(deliveryId: number): Promise<DeliveryReadiness | null> {
    return this.prisma.deliveryReadiness.findUnique({
      where: { deliveryId },
    });
  }

  /**
   * Znajdź readiness dla wielu dostaw
   */
  async findByDeliveryIds(deliveryIds: number[]): Promise<DeliveryReadiness[]> {
    return this.prisma.deliveryReadiness.findMany({
      where: {
        deliveryId: { in: deliveryIds },
      },
    });
  }

  /**
   * Pobierz readiness jako mapę (deliveryId -> status)
   */
  async getStatusMap(deliveryIds: number[]): Promise<Map<number, string>> {
    const records = await this.findByDeliveryIds(deliveryIds);
    const map = new Map<number, string>();

    for (const record of records) {
      map.set(record.deliveryId, record.aggregatedStatus);
    }

    return map;
  }

  /**
   * Utwórz lub zaktualizuj readiness
   */
  async upsert(
    deliveryId: number,
    data: {
      aggregatedStatus: string;
      blockingCount: number;
      warningCount: number;
      moduleResults?: string | null;
      blockingReasons?: string | null;
    }
  ): Promise<DeliveryReadiness> {
    return this.prisma.deliveryReadiness.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        ...data,
        lastCalculatedAt: new Date(),
      },
      update: {
        ...data,
        lastCalculatedAt: new Date(),
      },
    });
  }

  /**
   * Usuń readiness dla dostawy
   */
  async deleteByDeliveryId(deliveryId: number): Promise<void> {
    await this.prisma.deliveryReadiness.deleteMany({
      where: { deliveryId },
    });
  }

  /**
   * Znajdź dostawy według statusu readiness
   */
  async findDeliveryIdsByStatus(status: string): Promise<number[]> {
    const records = await this.prisma.deliveryReadiness.findMany({
      where: { aggregatedStatus: status },
      select: { deliveryId: true },
    });

    return records.map((r) => r.deliveryId);
  }

  /**
   * Znajdź dostawy z nieaktualnym readiness (starsze niż maxAge)
   */
  async findStaleDeliveryIds(maxAgeMs: number): Promise<number[]> {
    const cutoff = new Date(Date.now() - maxAgeMs);

    const records = await this.prisma.deliveryReadiness.findMany({
      where: {
        lastCalculatedAt: { lt: cutoff },
      },
      select: { deliveryId: true },
    });

    return records.map((r) => r.deliveryId);
  }

  /**
   * Pobierz statystyki statusów
   */
  async getStatusStats(): Promise<{ status: string; count: number }[]> {
    const result = await this.prisma.deliveryReadiness.groupBy({
      by: ['aggregatedStatus'],
      _count: { id: true },
    });

    return result.map((r) => ({
      status: r.aggregatedStatus,
      count: r._count.id,
    }));
  }

  /**
   * Pobierz dostawy z blokadami (dla alertów)
   */
  async findBlockedWithDetails(): Promise<
    Array<{
      deliveryId: number;
      blockingReasons: string[];
      lastCalculatedAt: Date;
    }>
  > {
    const records = await this.prisma.deliveryReadiness.findMany({
      where: { aggregatedStatus: 'blocked' },
      select: {
        deliveryId: true,
        blockingReasons: true,
        lastCalculatedAt: true,
      },
    });

    return records.map((r) => ({
      deliveryId: r.deliveryId,
      blockingReasons: r.blockingReasons ? JSON.parse(r.blockingReasons) : [],
      lastCalculatedAt: r.lastCalculatedAt,
    }));
  }
}
