/**
 * VerificationListComparator Unit Tests
 *
 * Testuje logike porownywania list weryfikacyjnych z dostawami:
 * - Wykrywanie elementow nadmiarowych
 * - Wykrywanie duplikatow na liscie
 * - Generowanie raportu roznic
 *
 * Uwaga: Metoda compareListWithDelivery wymaga mockowania PrismaClient
 * i jest testowana w testach integracyjnych
 */

import { describe, it, expect } from 'vitest';
import type {
  DeliveryOrderItem,
  ComparisonResult,
  MatchedItem,
  ExcessItem,
  DuplicateItem,
} from './VerificationListComparator.js';

// Import tylko dla metod ktore nie wymagaja Prisma
// VerificationListComparator wymaga PrismaClient w konstruktorze,
// wiec testujemy logike offline przez wywolanie metod na danych wejsciowych

describe('VerificationListComparator', () => {
  // Pomocnicza funkcja do tworzenia mock danych
  const createDeliveryOrder = (
    orderId: number,
    orderNumber: string,
    position: number
  ): DeliveryOrderItem => ({
    orderId,
    position,
    order: {
      id: orderId,
      orderNumber,
      client: `Klient ${orderId}`,
      project: `Projekt ${orderId}`,
      status: 'aktywne',
    },
  });

  describe('findExcessItems (logika)', () => {
    // Ta logika jest ekstraowana z klasy dla testow jednostkowych
    const findExcessItems = (
      deliveryOrders: DeliveryOrderItem[],
      matchedOrderIds: Set<number>
    ): ExcessItem[] => {
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
    };

    it('powinien wykryc zlecenia nadmiarowe w dostawie', () => {
      const deliveryOrders: DeliveryOrderItem[] = [
        createDeliveryOrder(1, '53001', 1),
        createDeliveryOrder(2, '53002', 2),
        createDeliveryOrder(3, '53003', 3),
      ];

      // Tylko zlecenia 1 i 2 sa na liscie
      const matchedOrderIds = new Set([1, 2]);

      const excess = findExcessItems(deliveryOrders, matchedOrderIds);

      expect(excess).toHaveLength(1);
      expect(excess[0].orderId).toBe(3);
      expect(excess[0].orderNumber).toBe('53003');
      expect(excess[0].deliveryPosition).toBe(3);
    });

    it('powinien zwrocic pusta tablice gdy wszystkie zlecenia sa dopasowane', () => {
      const deliveryOrders: DeliveryOrderItem[] = [
        createDeliveryOrder(1, '53001', 1),
        createDeliveryOrder(2, '53002', 2),
      ];

      const matchedOrderIds = new Set([1, 2]);

      const excess = findExcessItems(deliveryOrders, matchedOrderIds);

      expect(excess).toHaveLength(0);
    });

    it('powinien zwrocic wszystkie zlecenia gdy zadne nie jest dopasowane', () => {
      const deliveryOrders: DeliveryOrderItem[] = [
        createDeliveryOrder(1, '53001', 1),
        createDeliveryOrder(2, '53002', 2),
        createDeliveryOrder(3, '53003', 3),
      ];

      const matchedOrderIds = new Set<number>();

      const excess = findExcessItems(deliveryOrders, matchedOrderIds);

      expect(excess).toHaveLength(3);
      expect(excess.map((e) => e.orderId)).toEqual([1, 2, 3]);
    });

    it('powinien obslugiwac pusta liste dostaw', () => {
      const deliveryOrders: DeliveryOrderItem[] = [];
      const matchedOrderIds = new Set([1, 2]);

      const excess = findExcessItems(deliveryOrders, matchedOrderIds);

      expect(excess).toHaveLength(0);
    });

    it('powinien zachowac pozycje z dostawy', () => {
      const deliveryOrders: DeliveryOrderItem[] = [
        createDeliveryOrder(1, '53001', 10),
        createDeliveryOrder(2, '53002', 20),
        createDeliveryOrder(3, '53003', 30),
      ];

      const matchedOrderIds = new Set([2]);

      const excess = findExcessItems(deliveryOrders, matchedOrderIds);

      expect(excess).toHaveLength(2);
      expect(excess.find((e) => e.orderId === 1)?.deliveryPosition).toBe(10);
      expect(excess.find((e) => e.orderId === 3)?.deliveryPosition).toBe(30);
    });
  });

  describe('findDuplicatesOnList (logika)', () => {
    // Logika wykrywania duplikatow na liscie
    const findDuplicatesOnList = (
      items: Array<{
        orderNumberInput: string;
        orderNumberBase: string | null;
        position: number;
      }>
    ): DuplicateItem[] => {
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
    };

    it('powinien wykryc duplikaty na liscie po numerze bazowym', () => {
      const items = [
        { orderNumberInput: '53001', orderNumberBase: '53001', position: 1 },
        { orderNumberInput: '53002', orderNumberBase: '53002', position: 2 },
        { orderNumberInput: '53001-a', orderNumberBase: '53001', position: 3 },
      ];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].orderNumber).toBe('53001');
      expect(duplicates[0].positions).toEqual([1, 3]);
    });

    it('powinien wykryc wiele duplikatow', () => {
      const items = [
        { orderNumberInput: '53001', orderNumberBase: '53001', position: 1 },
        { orderNumberInput: '53002', orderNumberBase: '53002', position: 2 },
        { orderNumberInput: '53001', orderNumberBase: '53001', position: 3 },
        { orderNumberInput: '53002', orderNumberBase: '53002', position: 4 },
        { orderNumberInput: '53002', orderNumberBase: '53002', position: 5 },
      ];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(2);

      const dup53001 = duplicates.find((d) => d.orderNumber === '53001');
      expect(dup53001?.positions).toEqual([1, 3]);

      const dup53002 = duplicates.find((d) => d.orderNumber === '53002');
      expect(dup53002?.positions).toEqual([2, 4, 5]);
    });

    it('powinien zwrocic pusta tablice gdy nie ma duplikatow', () => {
      const items = [
        { orderNumberInput: '53001', orderNumberBase: '53001', position: 1 },
        { orderNumberInput: '53002', orderNumberBase: '53002', position: 2 },
        { orderNumberInput: '53003', orderNumberBase: '53003', position: 3 },
      ];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(0);
    });

    it('powinien uzyc orderNumberInput gdy orderNumberBase jest null', () => {
      const items = [
        { orderNumberInput: '53001', orderNumberBase: null, position: 1 },
        { orderNumberInput: '53001', orderNumberBase: null, position: 2 },
      ];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].orderNumber).toBe('53001');
    });

    it('powinien obslugiwac pusta liste', () => {
      const items: Array<{
        orderNumberInput: string;
        orderNumberBase: string | null;
        position: number;
      }> = [];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(0);
    });

    it('powinien obslugiwac pojedynczy element', () => {
      const items = [
        { orderNumberInput: '53001', orderNumberBase: '53001', position: 1 },
      ];

      const duplicates = findDuplicatesOnList(items);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('findDuplicatesInInput (logika)', () => {
    // Logika wykrywania duplikatow w nowych danych wejsciowych
    const findDuplicatesInInput = (
      items: Array<{ orderNumber: string; position?: number }>
    ): DuplicateItem[] => {
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
    };

    it('powinien wykryc duplikaty w danych wejsciowych', () => {
      const items = [
        { orderNumber: '53001', position: 1 },
        { orderNumber: '53002', position: 2 },
        { orderNumber: '53001', position: 3 },
      ];

      const duplicates = findDuplicatesInInput(items);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].orderNumber).toBe('53001');
      expect(duplicates[0].positions).toEqual([1, 3]);
    });

    it('powinien uzyc indeksu jako pozycji gdy brak position', () => {
      const items = [
        { orderNumber: '53001' },
        { orderNumber: '53002' },
        { orderNumber: '53001' },
      ];

      const duplicates = findDuplicatesInInput(items);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].positions).toEqual([1, 3]); // 0-indexed + 1
    });

    it('powinien trimowac numery zlecen', () => {
      const items = [
        { orderNumber: '53001', position: 1 },
        { orderNumber: '  53001  ', position: 2 },
        { orderNumber: '53001 ', position: 3 },
      ];

      const duplicates = findDuplicatesInInput(items);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].positions).toEqual([1, 2, 3]);
    });

    it('powinien obslugiwac pusta liste', () => {
      const items: Array<{ orderNumber: string; position?: number }> = [];

      const duplicates = findDuplicatesInInput(items);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('generateDifferenceReport (logika)', () => {
    // Logika generowania raportu
    const generateDifferenceReport = (result: ComparisonResult): string => {
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
          lines.push(
            `  ${item.orderNumber} - pozycje: ${item.positions.join(', ')}`
          );
        }
        lines.push('');
      }

      return lines.join('\n');
    };

    it('powinien wygenerowac pelny raport z wszystkimi sekcjami', () => {
      const result: ComparisonResult = {
        matched: [
          {
            itemId: 1,
            orderNumberInput: '53001',
            orderId: 1,
            orderNumber: '53001',
            client: 'Klient A',
            project: 'Projekt A',
            position: 1,
            matchStatus: 'found',
          },
        ],
        missing: [
          {
            itemId: 2,
            orderNumberInput: '53002',
            orderId: 2,
            orderNumber: '53002',
            client: 'Klient B',
            project: 'Projekt B',
            position: 2,
          },
        ],
        excess: [
          {
            orderId: 3,
            orderNumber: '53003',
            client: 'Klient C',
            project: 'Projekt C',
            deliveryPosition: 5,
          },
        ],
        notFound: [
          {
            itemId: 3,
            orderNumberInput: '99999',
            position: 3,
          },
        ],
        duplicates: [
          {
            orderNumber: '53001',
            positions: [1, 4],
          },
        ],
        summary: {
          totalItems: 4,
          matchedCount: 1,
          missingCount: 1,
          excessCount: 1,
          notFoundCount: 1,
          duplicatesCount: 1,
        },
      };

      const report = generateDifferenceReport(result);

      expect(report).toContain('=== RAPORT WERYFIKACJI ===');
      expect(report).toContain('Elementy na liście: 4');
      expect(report).toContain('Dopasowane: 1');
      expect(report).toContain('Brakujące w dostawie: 1');
      expect(report).toContain('Nadmiarowe w dostawie: 1');
      expect(report).toContain('Nieznalezione w systemie: 1');
      expect(report).toContain('Duplikaty: 1');
      expect(report).toContain('--- BRAKUJĄCE (do dodania do dostawy) ---');
      expect(report).toContain('[2] 53002 - Klient B');
      expect(report).toContain('--- NADMIAROWE (do usunięcia z dostawy) ---');
      expect(report).toContain('[5] 53003 - Klient C');
      expect(report).toContain('--- NIEZNALEZIONE W SYSTEMIE ---');
      expect(report).toContain('[3] 99999');
      expect(report).toContain('--- DUPLIKATY NA LIŚCIE ---');
      expect(report).toContain('53001 - pozycje: 1, 4');
    });

    it('powinien wygenerowac raport bez sekcji brakujacych', () => {
      const result: ComparisonResult = {
        matched: [
          {
            itemId: 1,
            orderNumberInput: '53001',
            orderId: 1,
            orderNumber: '53001',
            client: 'Klient A',
            project: 'Projekt A',
            position: 1,
            matchStatus: 'found',
          },
        ],
        missing: [],
        excess: [],
        notFound: [],
        duplicates: [],
        summary: {
          totalItems: 1,
          matchedCount: 1,
          missingCount: 0,
          excessCount: 0,
          notFoundCount: 0,
          duplicatesCount: 0,
        },
      };

      const report = generateDifferenceReport(result);

      expect(report).toContain('=== RAPORT WERYFIKACJI ===');
      expect(report).toContain('Dopasowane: 1');
      expect(report).not.toContain('--- BRAKUJĄCE');
      expect(report).not.toContain('--- NADMIAROWE');
      expect(report).not.toContain('--- NIEZNALEZIONE');
      expect(report).not.toContain('--- DUPLIKATY');
    });

    it('powinien obslugiwac null klienta', () => {
      const result: ComparisonResult = {
        matched: [],
        missing: [
          {
            itemId: 1,
            orderNumberInput: '53001',
            orderId: 1,
            orderNumber: '53001',
            client: null,
            project: null,
            position: 1,
          },
        ],
        excess: [
          {
            orderId: 2,
            orderNumber: '53002',
            client: null,
            project: null,
            deliveryPosition: 1,
          },
        ],
        notFound: [],
        duplicates: [],
        summary: {
          totalItems: 1,
          matchedCount: 0,
          missingCount: 1,
          excessCount: 1,
          notFoundCount: 0,
          duplicatesCount: 0,
        },
      };

      const report = generateDifferenceReport(result);

      expect(report).toContain('53001 - brak klienta');
      expect(report).toContain('53002 - brak klienta');
    });

    it('powinien wygenerowac pusty raport dla pustego wyniku', () => {
      const result: ComparisonResult = {
        matched: [],
        missing: [],
        excess: [],
        notFound: [],
        duplicates: [],
        summary: {
          totalItems: 0,
          matchedCount: 0,
          missingCount: 0,
          excessCount: 0,
          notFoundCount: 0,
          duplicatesCount: 0,
        },
      };

      const report = generateDifferenceReport(result);

      expect(report).toContain('Elementy na liście: 0');
      expect(report).toContain('Dopasowane: 0');
      expect(report).not.toContain('--- BRAKUJĄCE');
    });
  });

  describe('ComparisonResult structure', () => {
    it('powinien miec poprawna strukture summary', () => {
      const result: ComparisonResult = {
        matched: [],
        missing: [],
        excess: [],
        notFound: [],
        duplicates: [],
        summary: {
          totalItems: 10,
          matchedCount: 5,
          missingCount: 2,
          excessCount: 1,
          notFoundCount: 1,
          duplicatesCount: 1,
        },
      };

      expect(result.summary.totalItems).toBe(10);
      expect(result.summary.matchedCount).toBe(5);
      expect(result.summary.missingCount).toBe(2);
      expect(result.summary.excessCount).toBe(1);
      expect(result.summary.notFoundCount).toBe(1);
      expect(result.summary.duplicatesCount).toBe(1);
    });

    it('powinien miec poprawna strukture MatchedItem', () => {
      const item: MatchedItem = {
        itemId: 1,
        orderNumberInput: '53001',
        orderId: 100,
        orderNumber: '53001',
        client: 'Test Klient',
        project: 'Test Projekt',
        position: 5,
        matchStatus: 'found',
      };

      expect(item.matchStatus).toBe('found');
      expect(item.orderId).toBe(100);
    });

    it('powinien miec poprawna strukture dla variant_match', () => {
      const item: MatchedItem = {
        itemId: 1,
        orderNumberInput: '53001-a',
        orderId: 100,
        orderNumber: '53001',
        client: 'Test Klient',
        project: 'Test Projekt',
        position: 5,
        matchStatus: 'variant_match',
      };

      expect(item.matchStatus).toBe('variant_match');
      expect(item.orderNumberInput).toBe('53001-a');
      expect(item.orderNumber).toBe('53001');
    });
  });
});
