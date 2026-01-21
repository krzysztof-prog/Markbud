/**
 * VerificationListComparator - Logika porównywania list weryfikacyjnych z dostawami
 *
 * Odpowiada za:
 * - Porównanie listy klienta z dostawą
 * - Wykrywanie brakujących elementów (na liście, nie w dostawie)
 * - Wykrywanie nadmiarowych elementów (w dostawie, nie na liście)
 * - Wykrywanie duplikatów na liście
 * - Generowanie raportu różnic
 */

import type { PrismaClient } from '@prisma/client';
import { OrderNumberMatcher } from './OrderNumberMatcher.js';

// ===================
// Types
// ===================

/**
 * Element dopasowany - jest na liście i w dostawie
 */
export interface MatchedItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
  matchStatus: 'found' | 'variant_match';
}

/**
 * Element brakujący - jest na liście klienta, ale nie w dostawie
 */
export interface MissingItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
}

/**
 * Element nadmiarowy - jest w dostawie, ale nie na liście klienta
 */
export interface ExcessItem {
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  deliveryPosition: number;
}

/**
 * Element nieznaleziony w systemie
 */
export interface NotFoundItem {
  itemId: number;
  orderNumberInput: string;
  position: number;
}

/**
 * Duplikat na liście
 */
export interface DuplicateItem {
  orderNumber: string;
  positions: number[];
}

/**
 * Element listy weryfikacyjnej (input)
 */
export interface VerificationListItem {
  id: number;
  orderNumberInput: string;
  orderNumberBase: string | null;
  position: number;
}

/**
 * Zlecenie w dostawie (input)
 */
export interface DeliveryOrderItem {
  orderId: number;
  position: number;
  order: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
  };
}

/**
 * Wynik porównania list
 */
export interface ComparisonResult {
  matched: MatchedItem[];
  missing: MissingItem[];
  excess: ExcessItem[];
  notFound: NotFoundItem[];
  duplicates: DuplicateItem[];
  summary: {
    totalItems: number;
    matchedCount: number;
    missingCount: number;
    excessCount: number;
    notFoundCount: number;
    duplicatesCount: number;
  };
}

// ===================
// VerificationListComparator
// ===================

export class VerificationListComparator {
  private orderMatcher: OrderNumberMatcher;

  constructor(private prisma: PrismaClient) {
    this.orderMatcher = new OrderNumberMatcher(prisma);
  }

  /**
   * Porównuje listę weryfikacyjną z dostawą
   *
   * @param listItems - Elementy listy weryfikacyjnej
   * @param deliveryOrders - Zlecenia przypisane do dostawy
   * @returns Wynik porównania z kategoryzacją elementów
   */
  async compareListWithDelivery(
    listItems: VerificationListItem[],
    deliveryOrders: DeliveryOrderItem[]
  ): Promise<ComparisonResult> {
    const matched: MatchedItem[] = [];
    const missing: MissingItem[] = [];
    const notFound: NotFoundItem[] = [];

    // Zbiór orderIds z dostawy dla szybkiego sprawdzania
    const deliveryOrderIds = new Set(deliveryOrders.map((d) => d.orderId));

    // Zbiór orderIds dopasowanych z listy (do wykrywania excess)
    const matchedOrderIds = new Set<number>();

    // Przetwórz każdy element listy
    for (const item of listItems) {
      const orderNumberInput = item.orderNumberInput;
      const orderNumberBase = item.orderNumberBase ?? orderNumberInput;

      // Szukaj zlecenia w bazie
      const matchResult = await this.orderMatcher.findMatchingOrder(
        orderNumberInput,
        orderNumberBase
      );

      if (!matchResult) {
        // Nie znaleziono w systemie
        notFound.push({
          itemId: item.id,
          orderNumberInput,
          position: item.position,
        });
        continue;
      }

      const { order, matchStatus } = matchResult;
      matchedOrderIds.add(order.id);

      // Sprawdź czy jest w dostawie
      const isInDelivery = deliveryOrderIds.has(order.id);

      if (isInDelivery) {
        // Dopasowane - jest na liście i w dostawie
        matched.push({
          itemId: item.id,
          orderNumberInput,
          orderId: order.id,
          orderNumber: order.orderNumber,
          client: order.client,
          project: order.project,
          position: item.position,
          matchStatus,
        });
      } else {
        // Brakuje w dostawie - jest na liście, ale nie w dostawie
        missing.push({
          itemId: item.id,
          orderNumberInput,
          orderId: order.id,
          orderNumber: order.orderNumber,
          client: order.client,
          project: order.project,
          position: item.position,
        });
      }
    }

    // Znajdź nadmiarowe (są w dostawie, ale nie na liście)
    const excess = this.findExcessItems(deliveryOrders, matchedOrderIds);

    // Wykryj duplikaty na liście
    const duplicates = this.findDuplicatesOnList(listItems);

    return {
      matched,
      missing,
      excess,
      notFound,
      duplicates,
      summary: {
        totalItems: listItems.length,
        matchedCount: matched.length,
        missingCount: missing.length,
        excessCount: excess.length,
        notFoundCount: notFound.length,
        duplicatesCount: duplicates.length,
      },
    };
  }

  /**
   * Wykrywa elementy nadmiarowe w dostawie
   * Nadmiarowe = są w dostawie, ale nie pasują do żadnego elementu listy
   */
  findExcessItems(
    deliveryOrders: DeliveryOrderItem[],
    matchedOrderIds: Set<number>
  ): ExcessItem[] {
    const excess: ExcessItem[] = [];

    for (const d of deliveryOrders) {
      if (!matchedOrderIds.has(d.orderId)) {
        excess.push({
          orderId: d.orderId,
          orderNumber: d.order.orderNumber,
          client: d.order.client,
          project: d.order.project,
          deliveryPosition: d.position,
        });
      }
    }

    return excess;
  }

  /**
   * Wykrywa duplikaty na liście (po orderNumberBase)
   * Zwraca numery zleceń które pojawiają się więcej niż raz
   */
  findDuplicatesOnList(
    items: Array<{
      orderNumberInput: string;
      orderNumberBase: string | null;
      position: number;
    }>
  ): DuplicateItem[] {
    const baseToPositions = new Map<string, number[]>();

    for (const item of items) {
      const base = item.orderNumberBase ?? item.orderNumberInput;
      if (!baseToPositions.has(base)) {
        baseToPositions.set(base, []);
      }
      baseToPositions.get(base)?.push(item.position);
    }

    const duplicates: DuplicateItem[] = [];
    for (const [orderNumber, positions] of baseToPositions.entries()) {
      if (positions.length > 1) {
        duplicates.push({ orderNumber, positions });
      }
    }

    return duplicates;
  }

  /**
   * Wykrywa duplikaty w nowych danych wejściowych
   * Używane przy dodawaniu elementów do listy
   *
   * @param items - Nowe elementy do dodania
   * @returns Lista duplikatów z pozycjami
   */
  findDuplicatesInInput(
    items: Array<{ orderNumber: string; position?: number }>
  ): DuplicateItem[] {
    const orderNumberCounts = new Map<string, number[]>();

    for (let i = 0; i < items.length; i++) {
      const orderNumber = items[i].orderNumber.trim();
      if (!orderNumberCounts.has(orderNumber)) {
        orderNumberCounts.set(orderNumber, []);
      }
      orderNumberCounts.get(orderNumber)?.push(items[i].position ?? i + 1);
    }

    const duplicates: DuplicateItem[] = [];
    for (const [orderNumber, positions] of orderNumberCounts.entries()) {
      if (positions.length > 1) {
        duplicates.push({ orderNumber, positions });
      }
    }

    return duplicates;
  }

  /**
   * Generuje raport różnic w formacie tekstowym
   * Przydatne do logowania i debugowania
   */
  generateDifferenceReport(result: ComparisonResult): string {
    const lines: string[] = [];

    lines.push('=== RAPORT WERYFIKACJI ===');
    lines.push('');
    lines.push(`Elementy na liście: ${result.summary.totalItems}`);
    lines.push(`Dopasowane: ${result.summary.matchedCount}`);
    lines.push(`Brakujące w dostawie: ${result.summary.missingCount}`);
    lines.push(`Nadmiarowe w dostawie: ${result.summary.excessCount}`);
    lines.push(`Nieznalezione w systemie: ${result.summary.notFoundCount}`);
    lines.push(`Duplikaty: ${result.summary.duplicatesCount}`);
    lines.push('');

    if (result.missing.length > 0) {
      lines.push('--- BRAKUJĄCE (do dodania do dostawy) ---');
      for (const item of result.missing) {
        lines.push(
          `  [${item.position}] ${item.orderNumber} - ${item.client || 'brak klienta'}`
        );
      }
      lines.push('');
    }

    if (result.excess.length > 0) {
      lines.push('--- NADMIAROWE (do usunięcia z dostawy) ---');
      for (const item of result.excess) {
        lines.push(
          `  [${item.deliveryPosition}] ${item.orderNumber} - ${item.client || 'brak klienta'}`
        );
      }
      lines.push('');
    }

    if (result.notFound.length > 0) {
      lines.push('--- NIEZNALEZIONE W SYSTEMIE ---');
      for (const item of result.notFound) {
        lines.push(`  [${item.position}] ${item.orderNumberInput}`);
      }
      lines.push('');
    }

    if (result.duplicates.length > 0) {
      lines.push('--- DUPLIKATY NA LIŚCIE ---');
      for (const item of result.duplicates) {
        lines.push(`  ${item.orderNumber} - pozycje: ${item.positions.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
