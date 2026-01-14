/**
 * VerificationChangeApplier - Logika aplikowania zmian weryfikacji
 *
 * Odpowiada za:
 * - Bulk dodawanie brakujących zleceń do dostawy
 * - Bulk usuwanie nadmiarowych zleceń z dostawy
 * - Obsługa tranzycji statusów
 * - Śledzenie zmian i błędów
 * - Wsparcie dla rollback (przyszła funkcjonalność)
 */

import type { PrismaClient } from '@prisma/client';
import { DeliveryOrderService } from '../../delivery/DeliveryOrderService.js';
import { DeliveryRepository } from '../../../repositories/DeliveryRepository.js';
import { logger } from '../../../utils/logger.js';

// ===================
// Types
// ===================

/**
 * Wynik aplikowania pojedynczej zmiany
 */
export interface ChangeResult {
  orderId: number;
  success: boolean;
  error?: string;
}

/**
 * Wynik aplikowania wszystkich zmian
 */
export interface ApplyChangesResult {
  added: number[];
  removed: number[];
  errors: Array<{ orderId: number; reason: string }>;
}

/**
 * Opcje aplikowania zmian
 */
export interface ApplyChangesOptions {
  /** Czy kontynuować po błędzie czy zatrzymać */
  continueOnError?: boolean;
  /** Czy logować szczegóły operacji */
  verbose?: boolean;
}

/**
 * Rekord zmiany do audytu/rollback
 */
export interface ChangeRecord {
  type: 'add' | 'remove';
  deliveryId: number;
  orderId: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ===================
// VerificationChangeApplier
// ===================

export class VerificationChangeApplier {
  private deliveryOrderService: DeliveryOrderService;

  constructor(private prisma: PrismaClient) {
    const deliveryRepository = new DeliveryRepository(prisma);
    this.deliveryOrderService = new DeliveryOrderService(
      deliveryRepository,
      prisma
    );
  }

  /**
   * Aplikuje zmiany - dodaje brakujące i usuwa nadmiarowe zlecenia
   *
   * @param deliveryId - ID dostawy
   * @param addOrderIds - Lista orderIds do dodania
   * @param removeOrderIds - Lista orderIds do usunięcia
   * @param deliveryNumber - Opcjonalny numer dostawy (dla logów)
   * @param options - Opcje aplikowania
   * @returns Wynik z listą dodanych, usuniętych i błędów
   */
  async applyChanges(
    deliveryId: number,
    addOrderIds: number[],
    removeOrderIds: number[],
    deliveryNumber?: string,
    options: ApplyChangesOptions = {}
  ): Promise<ApplyChangesResult> {
    const { continueOnError = true, verbose = false } = options;

    const added: number[] = [];
    const removed: number[] = [];
    const errors: Array<{ orderId: number; reason: string }> = [];
    const changeRecords: ChangeRecord[] = [];

    if (verbose) {
      logger.info('Rozpoczynanie aplikowania zmian weryfikacji', {
        deliveryId,
        deliveryNumber,
        toAdd: addOrderIds.length,
        toRemove: removeOrderIds.length,
      });
    }

    // 1. Dodaj brakujące zlecenia
    for (const orderId of addOrderIds) {
      const result = await this.addOrderToDelivery(
        deliveryId,
        orderId,
        deliveryNumber
      );

      changeRecords.push({
        type: 'add',
        deliveryId,
        orderId,
        timestamp: new Date(),
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        added.push(orderId);
      } else {
        errors.push({ orderId, reason: result.error ?? 'Nieznany błąd' });
        if (!continueOnError) {
          break;
        }
      }
    }

    // 2. Usuń nadmiarowe zlecenia (jeśli nie przerwano)
    if (continueOnError || errors.length === 0) {
      for (const orderId of removeOrderIds) {
        const result = await this.removeOrderFromDelivery(deliveryId, orderId);

        changeRecords.push({
          type: 'remove',
          deliveryId,
          orderId,
          timestamp: new Date(),
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          removed.push(orderId);
        } else {
          errors.push({ orderId, reason: result.error ?? 'Nieznany błąd' });
          if (!continueOnError) {
            break;
          }
        }
      }
    }

    if (verbose) {
      logger.info('Zakończono aplikowanie zmian weryfikacji', {
        deliveryId,
        added: added.length,
        removed: removed.length,
        errors: errors.length,
      });
    }

    return { added, removed, errors };
  }

  /**
   * Dodaje pojedyncze zlecenie do dostawy
   * Zwraca wynik zamiast rzucać wyjątek
   */
  private async addOrderToDelivery(
    deliveryId: number,
    orderId: number,
    deliveryNumber?: string
  ): Promise<ChangeResult> {
    try {
      await this.deliveryOrderService.addOrderToDelivery(
        deliveryId,
        orderId,
        deliveryNumber
      );
      return { orderId, success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Nieznany błąd';
      logger.warn('Błąd dodawania zlecenia do dostawy', {
        deliveryId,
        orderId,
        error: errorMessage,
      });
      return { orderId, success: false, error: errorMessage };
    }
  }

  /**
   * Usuwa pojedyncze zlecenie z dostawy
   * Zwraca wynik zamiast rzucać wyjątek
   */
  private async removeOrderFromDelivery(
    deliveryId: number,
    orderId: number
  ): Promise<ChangeResult> {
    try {
      await this.deliveryOrderService.removeOrderFromDelivery(
        deliveryId,
        orderId
      );
      return { orderId, success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Nieznany błąd';
      logger.warn('Błąd usuwania zlecenia z dostawy', {
        deliveryId,
        orderId,
        error: errorMessage,
      });
      return { orderId, success: false, error: errorMessage };
    }
  }

  /**
   * Wykonuje zmiany w transakcji (atomowo)
   * Wszystkie zmiany muszą się powieść albo żadna nie zostanie zapisana
   *
   * @param deliveryId - ID dostawy
   * @param addOrderIds - Lista orderIds do dodania
   * @param removeOrderIds - Lista orderIds do usunięcia
   * @param deliveryNumber - Opcjonalny numer dostawy
   * @returns Wynik aplikowania zmian
   */
  async applyChangesTransactional(
    deliveryId: number,
    addOrderIds: number[],
    removeOrderIds: number[],
    deliveryNumber?: string
  ): Promise<ApplyChangesResult> {
    const added: number[] = [];
    const removed: number[] = [];
    const errors: Array<{ orderId: number; reason: string }> = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        // Dodaj brakujące
        for (const orderId of addOrderIds) {
          // W transakcji używamy bezpośrednio Prisma
          // DeliveryOrderService nie wspiera transakcji przekazanych z zewnątrz
          const maxPosition = await tx.deliveryOrder.aggregate({
            where: { deliveryId },
            _max: { position: true },
          });

          const nextPosition = (maxPosition._max.position ?? 0) + 1;

          await tx.deliveryOrder.create({
            data: {
              deliveryId,
              orderId,
              position: nextPosition,
            },
          });

          added.push(orderId);
        }

        // Usuń nadmiarowe
        for (const orderId of removeOrderIds) {
          await tx.deliveryOrder.deleteMany({
            where: {
              deliveryId,
              orderId,
            },
          });

          removed.push(orderId);
        }
      });

      logger.info('Zmiany weryfikacji zastosowane transakcyjnie', {
        deliveryId,
        deliveryNumber,
        added: added.length,
        removed: removed.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error('Błąd transakcji przy aplikowaniu zmian', {
        deliveryId,
        error: errorMessage,
      });

      // Wszystkie zmiany zostały wycofane
      errors.push({
        orderId: 0, // Błąd ogólny transakcji
        reason: `Transakcja wycofana: ${errorMessage}`,
      });

      return { added: [], removed: [], errors };
    }

    return { added, removed, errors };
  }

  /**
   * Waliduje czy zmiany mogą zostać zastosowane
   * Sprawdza przed wykonaniem czy wszystkie zlecenia istnieją
   *
   * @param addOrderIds - Lista orderIds do dodania
   * @param removeOrderIds - Lista orderIds do usunięcia
   * @param deliveryId - ID dostawy
   * @returns Lista błędów walidacji (pusta jeśli wszystko OK)
   */
  async validateChanges(
    addOrderIds: number[],
    removeOrderIds: number[],
    deliveryId: number
  ): Promise<Array<{ orderId: number; reason: string }>> {
    const errors: Array<{ orderId: number; reason: string }> = [];

    // Sprawdź czy zlecenia do dodania istnieją
    if (addOrderIds.length > 0) {
      const existingOrders = await this.prisma.order.findMany({
        where: { id: { in: addOrderIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingOrders.map((o) => o.id));

      for (const orderId of addOrderIds) {
        if (!existingIds.has(orderId)) {
          errors.push({
            orderId,
            reason: 'Zlecenie nie istnieje w systemie',
          });
        }
      }
    }

    // Sprawdź czy zlecenia do usunięcia są w dostawie
    if (removeOrderIds.length > 0) {
      const deliveryOrders = await this.prisma.deliveryOrder.findMany({
        where: {
          deliveryId,
          orderId: { in: removeOrderIds },
        },
        select: { orderId: true },
      });

      const inDeliveryIds = new Set(deliveryOrders.map((d) => d.orderId));

      for (const orderId of removeOrderIds) {
        if (!inDeliveryIds.has(orderId)) {
          errors.push({
            orderId,
            reason: 'Zlecenie nie jest przypisane do tej dostawy',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Pobiera podsumowanie potencjalnych zmian
   * Używane do wyświetlenia preview przed aplikowaniem
   */
  async getChangesSummary(
    addOrderIds: number[],
    removeOrderIds: number[]
  ): Promise<{
    toAdd: Array<{ orderId: number; orderNumber: string; client: string | null }>;
    toRemove: Array<{ orderId: number; orderNumber: string; client: string | null }>;
  }> {
    const [toAddOrders, toRemoveOrders] = await Promise.all([
      addOrderIds.length > 0
        ? this.prisma.order.findMany({
            where: { id: { in: addOrderIds } },
            select: { id: true, orderNumber: true, client: true },
          })
        : [],
      removeOrderIds.length > 0
        ? this.prisma.order.findMany({
            where: { id: { in: removeOrderIds } },
            select: { id: true, orderNumber: true, client: true },
          })
        : [],
    ]);

    return {
      toAdd: toAddOrders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        client: o.client,
      })),
      toRemove: toRemoveOrders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        client: o.client,
      })),
    };
  }
}
