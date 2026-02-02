/**
 * QuickDeliveryService - Szybkie tworzenie dostaw z listy zleceń
 *
 * Obsługuje:
 * - Walidacja listy numerów zleceń (sprawdzenie czy istnieją, czy są przypisane)
 * - Masowe przypisanie zleceń do nowej lub istniejącej dostawy
 * - Przepinanie zleceń między dostawami (za zgodą użytkownika)
 */

import type { PrismaClient } from '@prisma/client';
import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { DeliveryNumberGenerator } from './DeliveryNumberGenerator.js';
import { DeliveryOrderService } from './DeliveryOrderService.js';
import { DeliveryNotificationService, deliveryNotificationService } from './DeliveryNotificationService.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { parseDate } from '../../utils/date-helpers.js';
import { logger } from '../../utils/logger.js';

/**
 * Wynik walidacji pojedynczego numeru zlecenia
 */
export interface ValidatedOrder {
  orderNumber: string;
  orderId: number;
  status: 'found' | 'not_found' | 'already_assigned';
  // Jeśli już przypisane do dostawy
  currentDelivery?: {
    deliveryId: number;
    deliveryNumber: string | null;
    deliveryDate: Date;
  };
  // Podstawowe info o zleceniu
  orderInfo?: {
    client: string | null;
    totalWindows: number | null;
    status: string | null;
  };
}

/**
 * Wynik walidacji listy numerów zleceń
 */
export interface ValidateOrdersResult {
  // Znalezione zlecenia gotowe do przypisania
  found: ValidatedOrder[];
  // Nieznalezione numery (błędy)
  notFound: string[];
  // Zlecenia już przypisane do innych dostaw (wymagają potwierdzenia przepięcia)
  alreadyAssigned: ValidatedOrder[];
  // Czy można kontynuować (brak nieznalezionych)
  canProceed: boolean;
}

/**
 * Wynik masowego przypisania zleceń
 */
export interface BulkAssignResult {
  success: boolean;
  delivery: {
    id: number;
    deliveryNumber: string | null;
    deliveryDate: Date;
  };
  assignedCount: number;
  reassignedCount: number;
  // Szczegóły operacji
  details: {
    assigned: number[];
    reassigned: number[];
    skipped: number[];
  };
}

export class QuickDeliveryService {
  private numberGenerator: DeliveryNumberGenerator;
  private deliveryOrderService: DeliveryOrderService;
  private notificationService: DeliveryNotificationService;

  constructor(
    private repository: DeliveryRepository,
    private prisma: PrismaClient
  ) {
    this.numberGenerator = new DeliveryNumberGenerator(prisma);
    this.deliveryOrderService = new DeliveryOrderService(repository, prisma);
    this.notificationService = deliveryNotificationService;
  }

  /**
   * Parsuje string z numerami zleceń na tablicę
   * Obsługuje separatory: przecinek, spacja, nowa linia, średnik
   */
  parseOrderNumbers(input: string): string[] {
    return input
      .split(/[,;\s\n]+/)
      .map((num) => num.trim())
      .filter((num) => num.length > 0)
      // Usuń duplikaty zachowując kolejność
      .filter((num, index, self) => self.indexOf(num) === index);
  }

  /**
   * Waliduje listę numerów zleceń
   * Sprawdza czy istnieją i czy są już przypisane do dostaw
   */
  async validateOrderNumbers(orderNumbers: string[]): Promise<ValidateOrdersResult> {
    if (orderNumbers.length === 0) {
      throw new ValidationError('Lista numerów zleceń jest pusta');
    }

    logger.info('Validating order numbers for quick delivery', {
      count: orderNumbers.length,
      numbers: orderNumbers,
    });

    // Znajdź zlecenia po numerach
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: { in: orderNumbers },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalWindows: true,
        client: true,
        deliveryOrders: {
          select: {
            delivery: {
              select: {
                id: true,
                deliveryNumber: true,
                deliveryDate: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    // Mapuj wyniki
    const orderMap = new Map(orders.map((o) => [o.orderNumber, o]));

    const found: ValidatedOrder[] = [];
    const notFound: string[] = [];
    const alreadyAssigned: ValidatedOrder[] = [];

    for (const orderNumber of orderNumbers) {
      const order = orderMap.get(orderNumber);

      if (!order) {
        notFound.push(orderNumber);
        continue;
      }

      // Sprawdź czy jest przypisane do aktywnej dostawy (nie usuniętej)
      const activeDeliveryOrder = order.deliveryOrders.find(
        (dOrder) => dOrder.delivery.deletedAt === null
      );

      const validatedOrder: ValidatedOrder = {
        orderNumber: order.orderNumber,
        orderId: order.id,
        status: activeDeliveryOrder ? 'already_assigned' : 'found',
        orderInfo: {
          client: order.client ?? null,
          totalWindows: order.totalWindows,
          status: order.status,
        },
      };

      if (activeDeliveryOrder) {
        validatedOrder.currentDelivery = {
          deliveryId: activeDeliveryOrder.delivery.id,
          deliveryNumber: activeDeliveryOrder.delivery.deliveryNumber,
          deliveryDate: activeDeliveryOrder.delivery.deliveryDate,
        };
        alreadyAssigned.push(validatedOrder);
      } else {
        found.push(validatedOrder);
      }
    }

    const result: ValidateOrdersResult = {
      found,
      notFound,
      alreadyAssigned,
      canProceed: notFound.length === 0,
    };

    logger.info('Order validation complete', {
      found: found.length,
      notFound: notFound.length,
      alreadyAssigned: alreadyAssigned.length,
      canProceed: result.canProceed,
    });

    return result;
  }

  /**
   * Masowo przypisuje zlecenia do dostawy
   * Może utworzyć nową dostawę lub użyć istniejącej
   */
  async bulkAssignOrders(params: {
    orderIds: number[];
    deliveryId?: number;
    deliveryDate?: string;
    reassignOrderIds?: number[];
  }): Promise<BulkAssignResult> {
    const { orderIds, deliveryId, deliveryDate, reassignOrderIds = [] } = params;

    logger.info('Bulk assigning orders to delivery', {
      orderIds,
      deliveryId,
      deliveryDate,
      reassignOrderIds,
    });

    // Walidacja: musi być albo deliveryId albo deliveryDate
    if (!deliveryId && !deliveryDate) {
      throw new ValidationError('Musisz podać deliveryId (istniejąca dostawa) lub deliveryDate (nowa dostawa)');
    }

    // Użyj transakcji dla atomowości
    return this.prisma.$transaction(async (tx) => {
      let targetDelivery: { id: number; deliveryNumber: string | null; deliveryDate: Date };

      if (deliveryId) {
        // Użyj istniejącej dostawy
        const existing = await tx.delivery.findUnique({
          where: { id: deliveryId },
          select: { id: true, deliveryNumber: true, deliveryDate: true, deletedAt: true },
        });

        if (!existing || existing.deletedAt !== null) {
          throw new NotFoundError('Delivery');
        }

        targetDelivery = existing;
      } else {
        // Utwórz nową dostawę
        const parsedDate = parseDate(deliveryDate!);
        const generatedNumber = await this.numberGenerator.generateDeliveryNumber(parsedDate);

        const newDelivery = await tx.delivery.create({
          data: {
            deliveryDate: parsedDate,
            deliveryNumber: generatedNumber,
            status: 'planned',
          },
          select: { id: true, deliveryNumber: true, deliveryDate: true },
        });

        targetDelivery = newDelivery;

        // Powiadom o utworzeniu nowej dostawy
        this.notificationService.notifyDeliveryCreated({
          id: newDelivery.id,
          deliveryNumber: newDelivery.deliveryNumber ?? undefined,
          deliveryDate: newDelivery.deliveryDate,
        });
      }

      const assigned: number[] = [];
      const reassigned: number[] = [];
      const skipped: number[] = [];

      // Set z orderIds do przepięcia (użytkownik potwierdził)
      const reassignSet = new Set(reassignOrderIds);

      // Przypisz każde zlecenie
      for (const orderId of orderIds) {
        // Sprawdź czy zlecenie jest już przypisane do jakiejś dostawy
        const existingAssignment = await tx.deliveryOrder.findFirst({
          where: {
            orderId,
            delivery: { deletedAt: null },
          },
          select: { deliveryId: true },
        });

        if (existingAssignment) {
          // Zlecenie jest już przypisane
          if (existingAssignment.deliveryId === targetDelivery.id) {
            // Już w tej dostawie - pomiń
            skipped.push(orderId);
            continue;
          }

          if (reassignSet.has(orderId)) {
            // Użytkownik potwierdził przepięcie - usuń z poprzedniej dostawy
            await tx.deliveryOrder.delete({
              where: {
                deliveryId_orderId: {
                  deliveryId: existingAssignment.deliveryId,
                  orderId,
                },
              },
            });
            reassigned.push(orderId);
          } else {
            // Nie potwierdzono przepięcia - pomiń
            skipped.push(orderId);
            continue;
          }
        } else {
          assigned.push(orderId);
        }

        // Znajdź następną pozycję w dostawie
        const maxPosition = await tx.deliveryOrder.aggregate({
          where: { deliveryId: targetDelivery.id },
          _max: { position: true },
        });
        const nextPosition = (maxPosition._max.position ?? 0) + 1;

        // Dodaj zlecenie do dostawy
        await tx.deliveryOrder.create({
          data: {
            deliveryId: targetDelivery.id,
            orderId,
            position: nextPosition,
          },
        });
      }

      const result: BulkAssignResult = {
        success: true,
        delivery: targetDelivery,
        assignedCount: assigned.length,
        reassignedCount: reassigned.length,
        details: {
          assigned,
          reassigned,
          skipped,
        },
      };

      logger.info('Bulk assign complete', {
        deliveryId: targetDelivery.id,
        assignedCount: assigned.length,
        reassignedCount: reassigned.length,
        skippedCount: skipped.length,
      });

      return result;
    });
  }

  /**
   * Pobiera listę dostaw na podaną datę (do wyboru w UI)
   */
  async getDeliveriesForDate(date: string): Promise<Array<{
    id: number;
    deliveryNumber: string | null;
    ordersCount: number;
  }>> {
    const parsedDate = parseDate(date);

    // Ustal zakres daty (cały dzień)
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        deliveryNumber: true,
        _count: {
          select: { deliveryOrders: true },
        },
      },
      orderBy: { deliveryNumber: 'asc' },
    });

    return deliveries.map((d) => ({
      id: d.id,
      deliveryNumber: d.deliveryNumber,
      ordersCount: d._count.deliveryOrders,
    }));
  }

  /**
   * Podgląd numeru następnej dostawy dla daty
   */
  async previewNextDeliveryNumber(date: string): Promise<string> {
    const parsedDate = parseDate(date);
    return this.numberGenerator.previewNextNumber(parsedDate);
  }
}
