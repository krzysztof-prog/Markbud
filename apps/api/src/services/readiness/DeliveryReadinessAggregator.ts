/**
 * DeliveryReadinessAggregator - Centralny serwis agregacji statusów gotowości dostawy
 *
 * Agreguje wyniki wszystkich modułów sprawdzających i oblicza
 * zagregowany status dostawy: ready | conditional | blocked | pending
 *
 * Reguły agregacji (zatwierdzone):
 * - Jeśli jakikolwiek moduł zwraca 'blocking' → ZABLOKOWANA
 * - Jeśli jakikolwiek moduł zwraca 'warning' → WARUNKOWA
 * - W przeciwnym wypadku → GOTOWA
 */

import type { PrismaClient } from '@prisma/client';
import {
  type ReadinessCheckModule,
  type ReadinessCheckResult,
  type AggregatedReadinessResult,
  type AggregatedReadinessStatus,
  type ReadinessChecklistItem,
  MODULE_LABELS,
  MODULE_SEVERITY,
} from './types';
import {
  MailCompletenessCheck,
  LabelCheckModule,
  DeliveryDateMismatchModule,
  MissingDeliveryDateModule,
  GlassDeliveryCheck,
  OkucDeliveryCheck,
  PalletValidationCheck,
  OrdersCompletedCheck,
} from './modules';
import { logger } from '../../utils/logger';

export class DeliveryReadinessAggregator {
  private modules: ReadinessCheckModule[];

  constructor(private prisma: PrismaClient) {
    // Rejestracja wszystkich modułów sprawdzających
    this.modules = [
      new MailCompletenessCheck(prisma),
      new LabelCheckModule(prisma),
      new DeliveryDateMismatchModule(prisma),
      new MissingDeliveryDateModule(prisma),
      new GlassDeliveryCheck(prisma),
      new OkucDeliveryCheck(prisma),
      new PalletValidationCheck(prisma),
      new OrdersCompletedCheck(prisma),
    ];
  }

  /**
   * Oblicza status gotowości dostawy
   * Uruchamia wszystkie moduły sprawdzające równolegle i agreguje wyniki
   */
  async calculateReadiness(deliveryId: number): Promise<AggregatedReadinessResult> {
    logger.debug('Calculating readiness for delivery', { deliveryId });

    // Sprawdź czy dostawa istnieje
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, deletedAt: true },
    });

    if (!delivery || delivery.deletedAt) {
      throw new Error(`Delivery ${deliveryId} not found or deleted`);
    }

    // Uruchom wszystkie moduły równolegle
    const results = await Promise.all(
      this.modules.map(async (module) => {
        try {
          return await module.check(deliveryId);
        } catch (error) {
          logger.error(`Error in readiness module ${module.name}`, { deliveryId, error });
          // Zwróć błąd jako warning aby nie blokować całej agregacji
          return {
            module: module.name,
            status: 'warning' as const,
            message: `Błąd sprawdzania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
          };
        }
      })
    );

    // Klasyfikuj wyniki według statusu z uwzględnieniem severity modułu
    const blocking: ReadinessCheckResult[] = [];
    const warnings: ReadinessCheckResult[] = [];
    const passed: ReadinessCheckResult[] = [];

    for (const result of results) {
      if (result.status === 'ok') {
        passed.push(result);
      } else if (result.status === 'blocking') {
        // Moduł zgłasza blokadę
        blocking.push(result);
      } else if (result.status === 'warning') {
        // Sprawdź czy ten moduł może blokować (zgodnie z konfiguracją)
        const moduleSeverity = MODULE_SEVERITY[result.module];
        if (moduleSeverity === 'blocking') {
          // Moduł skonfigurowany jako blokujący zgłasza problem → traktuj jako blocking
          // Ale jeśli moduł sam zgłosił warning, to zostaw jako warning
          warnings.push(result);
        } else {
          warnings.push(result);
        }
      }
    }

    // Oblicz zagregowany status
    let status: AggregatedReadinessStatus;
    if (blocking.length > 0) {
      status = 'blocked';
    } else if (warnings.length > 0) {
      status = 'conditional';
    } else {
      status = 'ready';
    }

    // Buduj checklistę dla UI
    const checklist = this.buildChecklist(results);

    const aggregatedResult: AggregatedReadinessResult = {
      status,
      blocking,
      warnings,
      passed,
      checklist,
      lastCalculatedAt: new Date(),
    };

    logger.info('Readiness calculated', {
      deliveryId,
      status,
      blockingCount: blocking.length,
      warningCount: warnings.length,
      passedCount: passed.length,
    });

    return aggregatedResult;
  }

  /**
   * Oblicza i zapisuje status gotowości do bazy danych
   */
  async calculateAndPersist(deliveryId: number): Promise<AggregatedReadinessResult> {
    const result = await this.calculateReadiness(deliveryId);

    // Zapisz do tabeli DeliveryReadiness
    await this.prisma.deliveryReadiness.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        aggregatedStatus: result.status,
        blockingCount: result.blocking.length,
        warningCount: result.warnings.length,
        moduleResults: JSON.stringify([
          ...result.blocking,
          ...result.warnings,
          ...result.passed,
        ]),
        blockingReasons: JSON.stringify(
          result.blocking.map((b) => b.message)
        ),
        lastCalculatedAt: result.lastCalculatedAt,
      },
      update: {
        aggregatedStatus: result.status,
        blockingCount: result.blocking.length,
        warningCount: result.warnings.length,
        moduleResults: JSON.stringify([
          ...result.blocking,
          ...result.warnings,
          ...result.passed,
        ]),
        blockingReasons: JSON.stringify(
          result.blocking.map((b) => b.message)
        ),
        lastCalculatedAt: result.lastCalculatedAt,
      },
    });

    return result;
  }

  /**
   * Pobiera cached status z bazy lub oblicza jeśli brak/nieaktualny
   */
  async getReadiness(
    deliveryId: number,
    options: { refresh?: boolean; maxAge?: number } = {}
  ): Promise<AggregatedReadinessResult> {
    const { refresh = false, maxAge = 5 * 60 * 1000 } = options; // domyślnie 5 minut

    if (!refresh) {
      // Spróbuj pobrać z cache
      const cached = await this.prisma.deliveryReadiness.findUnique({
        where: { deliveryId },
      });

      if (cached) {
        const age = Date.now() - cached.lastCalculatedAt.getTime();
        if (age < maxAge) {
          // Cache jest aktualny, zwróć go
          return this.parseFromCache(cached);
        }
      }
    }

    // Cache nieaktualny lub wymuszono refresh - oblicz na nowo
    return this.calculateAndPersist(deliveryId);
  }

  /**
   * Przelicza readiness tylko jeśli minął minimalny czas od ostatniego przeliczenia
   * Zapobiega nadmiernemu przeliczaniu przy wielu operacjach naraz (debounce)
   *
   * @param deliveryId - ID dostawy
   * @param minIntervalMs - Minimalny czas między przeliczeniami (domyślnie 5s)
   */
  async recalculateIfNeeded(deliveryId: number, minIntervalMs = 5000): Promise<void> {
    try {
      const existing = await this.prisma.deliveryReadiness.findUnique({
        where: { deliveryId },
        select: { lastCalculatedAt: true },
      });

      if (existing) {
        const timeSinceLastCalc = Date.now() - existing.lastCalculatedAt.getTime();
        if (timeSinceLastCalc < minIntervalMs) {
          logger.debug('Skipping readiness recalculate - recently calculated', {
            deliveryId,
            timeSinceLastCalc,
            minIntervalMs,
          });
          return; // Pomiń - niedawno przeliczone
        }
      }

      await this.calculateAndPersist(deliveryId);
    } catch (error) {
      // Błędy w recalculate nie powinny przerywać głównej operacji
      logger.error('Error in recalculateIfNeeded', { deliveryId, error });
    }
  }

  /**
   * Przelicza status dla wielu dostaw (np. po imporcie)
   */
  async recalculateMultiple(deliveryIds: number[]): Promise<Map<number, AggregatedReadinessStatus>> {
    const results = new Map<number, AggregatedReadinessStatus>();

    // Przetwarzaj równolegle ale z limitem
    const batchSize = 5;
    for (let i = 0; i < deliveryIds.length; i += batchSize) {
      const batch = deliveryIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            const result = await this.calculateAndPersist(id);
            return { id, status: result.status };
          } catch (error) {
            logger.error('Error recalculating readiness', { deliveryId: id, error });
            return { id, status: 'pending' as AggregatedReadinessStatus };
          }
        })
      );

      for (const { id, status } of batchResults) {
        results.set(id, status);
      }
    }

    return results;
  }

  /**
   * Pobiera status readiness dla wielu dostaw jednocześnie (batch)
   * Optymalizacja: jeden request zamiast N requestów z frontendu
   */
  async getBatchReadiness(
    deliveryIds: number[],
    options: { refresh?: boolean; maxAge?: number } = {}
  ): Promise<Record<number, AggregatedReadinessResult>> {
    const { refresh = false, maxAge = 5 * 60 * 1000 } = options;
    const results: Record<number, AggregatedReadinessResult> = {};

    if (deliveryIds.length === 0) {
      return results;
    }

    // Deduplikuj ID
    const uniqueIds = [...new Set(deliveryIds)];

    if (!refresh) {
      // Pobierz wszystkie cached jednym zapytaniem
      const cached = await this.prisma.deliveryReadiness.findMany({
        where: {
          deliveryId: { in: uniqueIds },
        },
      });

      const cachedMap = new Map(cached.map((c) => [c.deliveryId, c]));
      const toCalculate: number[] = [];

      for (const id of uniqueIds) {
        const cachedItem = cachedMap.get(id);
        if (cachedItem) {
          const age = Date.now() - cachedItem.lastCalculatedAt.getTime();
          if (age < maxAge) {
            // Cache aktualny
            results[id] = this.parseFromCache(cachedItem);
            continue;
          }
        }
        // Cache nieaktualny lub brak - do przeliczenia
        toCalculate.push(id);
      }

      // Oblicz brakujące równolegle (z limitem)
      if (toCalculate.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < toCalculate.length; i += batchSize) {
          const batch = toCalculate.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (id) => {
              try {
                const result = await this.calculateAndPersist(id);
                return { id, result };
              } catch (error) {
                logger.error('Error in batch readiness', { deliveryId: id, error });
                // Zwróć pending dla błędnych
                return {
                  id,
                  result: {
                    status: 'pending' as AggregatedReadinessStatus,
                    blocking: [],
                    warnings: [],
                    passed: [],
                    checklist: [],
                    lastCalculatedAt: new Date(),
                  },
                };
              }
            })
          );

          for (const { id, result } of batchResults) {
            results[id] = result;
          }
        }
      }
    } else {
      // Force refresh - oblicz wszystkie
      const batchSize = 5;
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (id) => {
            try {
              const result = await this.calculateAndPersist(id);
              return { id, result };
            } catch (error) {
              logger.error('Error in batch readiness refresh', { deliveryId: id, error });
              return {
                id,
                result: {
                  status: 'pending' as AggregatedReadinessStatus,
                  blocking: [],
                  warnings: [],
                  passed: [],
                  checklist: [],
                  lastCalculatedAt: new Date(),
                },
              };
            }
          })
        );

        for (const { id, result } of batchResults) {
          results[id] = result;
        }
      }
    }

    logger.info('Batch readiness fetched', {
      requested: uniqueIds.length,
      returned: Object.keys(results).length,
    });

    return results;
  }

  /**
   * Buduje checklistę dla UI
   */
  private buildChecklist(results: ReadinessCheckResult[]): ReadinessChecklistItem[] {
    return results.map((result) => ({
      module: result.module,
      label: MODULE_LABELS[result.module] || result.module,
      status: result.status,
      message: result.message,
    }));
  }

  /**
   * Parsuje wynik z cache'owanego rekordu DB
   */
  private parseFromCache(cached: {
    aggregatedStatus: string;
    blockingCount: number;
    warningCount: number;
    moduleResults: string | null;
    blockingReasons: string | null;
    lastCalculatedAt: Date;
  }): AggregatedReadinessResult {
    const allResults: ReadinessCheckResult[] = cached.moduleResults
      ? JSON.parse(cached.moduleResults)
      : [];

    const blocking = allResults.filter((r) => r.status === 'blocking');
    const warnings = allResults.filter((r) => r.status === 'warning');
    const passed = allResults.filter((r) => r.status === 'ok');

    return {
      status: cached.aggregatedStatus as AggregatedReadinessStatus,
      blocking,
      warnings,
      passed,
      checklist: this.buildChecklist(allResults),
      lastCalculatedAt: cached.lastCalculatedAt,
    };
  }
}
