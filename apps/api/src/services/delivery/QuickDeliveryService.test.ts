/**
 * QuickDeliveryService - testy dopasowywania numerów zleceń z sufiksem
 *
 * Pokrywa zachowanie elastycznego dopasowania w validateOrderNumbers:
 * gdy użytkownik wpisze JAWNY sufiks (np. "54945-a"), wpis NIE może być
 * zwijany do zlecenia bazowego "54945". Jeśli wariant nie istnieje w bazie,
 * numer trafia do notFound (jasny komunikat), zamiast mylącego
 * "już w tej dostawie".
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Odetnij efekty uboczne WebSocketów przy imporcie serwisu powiadomień
vi.mock('./DeliveryEventEmitter.js', () => ({
  DeliveryEventEmitter: class MockDeliveryEventEmitter {},
  deliveryEventEmitter: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

import { QuickDeliveryService } from './QuickDeliveryService.js';
import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { createMockPrisma } from '../../tests/mocks/prisma.mock.js';

type MockOrderRow = {
  id: number;
  orderNumber: string;
  status: string;
  totalWindows: number | null;
  client: string | null;
  deliveryOrders: Array<{
    delivery: {
      id: number;
      deliveryNumber: string | null;
      deliveryDate: Date;
      deletedAt: Date | null;
    };
  }>;
};

function makeOrder(
  id: number,
  orderNumber: string,
  opts: { assignedToDeliveryId?: number } = {}
): MockOrderRow {
  return {
    id,
    orderNumber,
    status: 'new',
    totalWindows: 5,
    client: 'Testowy',
    deliveryOrders:
      opts.assignedToDeliveryId !== undefined
        ? [
            {
              delivery: {
                id: opts.assignedToDeliveryId,
                deliveryNumber: 'D-TEST',
                deliveryDate: new Date('2026-09-03'),
                deletedAt: null,
              },
            },
          ]
        : [],
  };
}

describe('QuickDeliveryService.validateOrderNumbers - dopasowanie sufiksu', () => {
  let service: QuickDeliveryService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    const repository = new DeliveryRepository(mockPrisma as never);
    service = new QuickDeliveryService(repository, mockPrisma as never);
  });

  /**
   * Konfiguruje mock order.findMany: pierwsze wywołanie (exact `in`) oraz
   * kolejne (elastyczne `startsWith`) zwracają zadane zestawy.
   */
  function mockFindMany(exact: MockOrderRow[], fuzzy: MockOrderRow[]) {
    mockPrisma.order.findMany.mockImplementation((args: { where?: { orderNumber?: { in?: unknown; startsWith?: unknown } } }) => {
      const clause = args?.where?.orderNumber;
      if (clause && 'in' in clause) return Promise.resolve(exact);
      if (clause && 'startsWith' in clause) return Promise.resolve(fuzzy);
      return Promise.resolve([]);
    });
  }

  it('NIE zwija jawnego sufiksu do zlecenia bazowego - zgłasza notFound', async () => {
    // "54945-a" nie istnieje; w bazie jest tylko "54945" (już w dostawie 10)
    mockFindMany([], [makeOrder(1, '54945', { assignedToDeliveryId: 10 })]);

    const result = await service.validateOrderNumbers(['54945-a']);

    expect(result.notFound).toEqual(['54945-a']);
    expect(result.found).toHaveLength(0);
    expect(result.alreadyAssigned).toHaveLength(0);
    expect(result.canProceed).toBe(false);
  });

  it('dopasowuje wariant z tym samym sufiksem (także bez myślnika)', async () => {
    // Wpis "54945-a"; w bazie jest bazowe "54945" oraz wariant "54945a"
    mockFindMany(
      [],
      [
        makeOrder(1, '54945', { assignedToDeliveryId: 10 }),
        makeOrder(2, '54945a'),
      ]
    );

    const result = await service.validateOrderNumbers(['54945-a']);

    expect(result.notFound).toHaveLength(0);
    expect(result.found).toHaveLength(1);
    expect(result.found[0].orderNumber).toBe('54945a');
    expect(result.found[0].matchedFrom).toBe('54945-a');
  });

  it('bez sufiksu nadal dopasowuje wariant do numeru bazowego (regresja)', async () => {
    // Wpis "54945"; w bazie jest tylko wariant "54945-a"
    mockFindMany([], [makeOrder(2, '54945-a')]);

    const result = await service.validateOrderNumbers(['54945']);

    expect(result.notFound).toHaveLength(0);
    expect(result.found).toHaveLength(1);
    expect(result.found[0].orderNumber).toBe('54945-a');
  });
});
