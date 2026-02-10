/**
 * Order Service - Business logic layer
 */

import { Prisma } from '@prisma/client';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateStatusTransition, ORDER_STATUSES } from '../utils/order-status-machine.js';
import { validateSufficientStock } from '../utils/warehouse-validation.js';
import { prisma } from '../index.js';
import {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
} from './event-emitter.js';
import { ReadinessOrchestrator } from './readinessOrchestrator.js';
import { OkucRwService } from './okuc/OkucRwService.js';
import { WarehouseRwService } from './warehouse/WarehouseRwService.js';
import { SteelRwService } from './SteelRwService.js';
import { logger } from '../utils/logger.js';
import { DeliveryReadinessAggregator } from './readiness/index.js';
import { orderNumberParser } from './parsers/OrderNumberParser.js';

export class OrderService {
  private readinessAggregator: DeliveryReadinessAggregator;

  constructor(private repository: OrderRepository) {
    this.readinessAggregator = new DeliveryReadinessAggregator(prisma);
  }

  async getAllOrders(filters: { status?: string; archived?: string; colorId?: string; documentAuthorUserId?: string }) {
    return this.repository.findAll(filters);
  }

  /**
   * Wyszukiwanie zleceń - zoptymalizowane dla GlobalSearch
   * Filtruje po stronie serwera, zwraca tylko niezbędne pola
   */
  async searchOrders(query: string, includeArchived: boolean = true) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.repository.search(query, includeArchived);
  }

  async getOrderById(id: number) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  async getOrderByNumber(orderNumber: string) {
    const order = await this.repository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  async createOrder(data: { orderNumber: string; status?: string; valuePln?: number; valueEur?: number }) {
    const order = await this.repository.create(data);

    // Sprawdź czy istnieje pending price dla tego numeru zlecenia
    // Jeśli zlecenie nie ma ceny, a pending price istnieje - przypisz automatycznie
    await this.applyPendingPriceIfExists(order.id, data.orderNumber, data.valuePln, data.valueEur);

    // Jeśli zamówienie z sufixem (-a, -b, -c) nadal nie ma ceny EUR,
    // spróbuj odziedziczyć cenę z zamówienia bazowego
    await this.inheritPriceFromBaseOrder(order.id, data.orderNumber);

    emitOrderCreated(order);

    return order;
  }

  /**
   * Sprawdza i przypisuje pending price do nowo utworzonego zlecenia.
   * Strategie dopasowania (w kolejności):
   * 1. Exact match po orderNumber
   * 2. Prefix match (np. "53526-a" -> "53526")
   * 3. Match po nazwie pliku zawierającej numer zlecenia
   */
  private async applyPendingPriceIfExists(
    orderId: number,
    orderNumber: string,
    existingPln?: number,
    existingEur?: number
  ): Promise<void> {
    try {
      // Strategia 1: Exact match po orderNumber
      let pendingPrice = await prisma.pendingOrderPrice.findFirst({
        where: { orderNumber, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });

      // Strategia 2: Prefix match - "53526-a" -> "53526"
      if (!pendingPrice) {
        const baseNumber = orderNumber.split('-')[0];
        if (baseNumber !== orderNumber) {
          pendingPrice = await prisma.pendingOrderPrice.findFirst({
            where: { orderNumber: baseNumber, status: 'pending' },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      // Strategia 3: Match po nazwie pliku (fallback dla UNKNOWN)
      if (!pendingPrice) {
        pendingPrice = await prisma.pendingOrderPrice.findFirst({
          where: {
            orderNumber: 'UNKNOWN',
            status: 'pending',
            filename: { contains: orderNumber },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (pendingPrice) {
          logger.info(`Pending price dopasowana po nazwie pliku: ${pendingPrice.filename} -> ${orderNumber}`);
        }
      }

      if (!pendingPrice) return;

      // Sprawdź czy zlecenie nie ma już ceny w odpowiedniej walucie
      const priceField = pendingPrice.currency === 'EUR' ? existingEur : existingPln;
      if (priceField != null) {
        logger.debug(`Pending price dla ${orderNumber} pominięta - zlecenie już ma cenę ${pendingPrice.currency}`);
        return;
      }

      // Przypisz cenę do zlecenia
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: pendingPrice.currency === 'EUR'
            ? { valueEur: pendingPrice.valueNetto }
            : { valuePln: pendingPrice.valueNetto },
        });

        await tx.pendingOrderPrice.update({
          where: { id: pendingPrice.id },
          data: {
            status: 'applied',
            appliedAt: new Date(),
            appliedToOrderId: orderId,
          },
        });
      });

      logger.info(
        `Pending price automatycznie przypisana: ${orderNumber} -> ${pendingPrice.currency} ${pendingPrice.valueNetto / 100}`
      );
    } catch (error) {
      // Nie blokuj tworzenia zlecenia jeśli pending price matching się nie powiedzie
      const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.warn(`Błąd przy matching pending price dla ${orderNumber}: ${errMsg}`);
    }
  }

  async updateOrder(id: number, data: Prisma.OrderUpdateInput) {
    // Verify order exists
    const currentOrder = await this.getOrderById(id);

    // Validate status transition if status is being updated
    if (data.status && typeof data.status === 'string') {
      validateStatusTransition(currentOrder.status, data.status);

      // P1-R5: Full production readiness check including Glass + Okuc
      // Prevents edge case: start production without sufficient materials/glass/okuc → deadline missed
      if (data.status === ORDER_STATUSES.IN_PROGRESS) {
        // Legacy warehouse check (fast, critical)
        // Fixed: ignoruje requirements z beamsCount = 0
        await validateSufficientStock(prisma, id);

        // P1-R5: Extended readiness check (glass + okuc status)
        const orchestrator = new ReadinessOrchestrator(prisma);
        const readiness = await orchestrator.canStartProduction(id);

        if (!readiness.ready) {
          const blockingMessages = readiness.blocking.map((b) => b.message).join('; ');
          throw new ValidationError(
            `Nie można rozpocząć produkcji: ${blockingMessages}`,
            { code: 'PRODUCTION_NOT_READY', blocking: readiness.blocking }
          );
        }
      }
    }

    // Sprawdź czy zmienia się cena EUR - potrzebne do propagacji
    const isEurPriceChange = data.valueEur !== undefined;
    // Sprawdź czy użytkownik ręcznie ustawia cenę na zamówieniu z odziedziczoną ceną
    const isManualPriceSet = isEurPriceChange && currentOrder.priceInheritedFromOrder;

    // Przygotuj dane do zapisu - opcjonalnie wyczyść flagę dziedziczenia
    let updateData = data;
    if (isManualPriceSet) {
      updateData = { ...data, priceInheritedFromOrder: null };
    }

    const order = await this.repository.update(id, updateData);

    emitOrderUpdated(order);

    // Jeśli zmieniono cenę EUR zamówienia bazowego (bez sufiksu),
    // propaguj cenę do zamówień zastępczych (-a, -b, -c)
    if (isEurPriceChange) {
      await this.propagatePriceToVariants(currentOrder.orderNumber, order.valueEur);
    }

    // Auto-recalculate readiness dla powiązanych dostaw
    await this.recalculateDeliveryReadinessForOrder(id);

    return order;
  }

  /**
   * Dziedziczenie ceny EUR z zamówienia bazowego dla zamówień z sufixem (-a, -b, -c)
   * Wywoływane przy tworzeniu zamówienia, po sprawdzeniu pending prices
   */
  private async inheritPriceFromBaseOrder(orderId: number, orderNumber: string): Promise<void> {
    try {
      // Sprawdź czy zamówienie ma sufiks
      if (!orderNumberParser.hasSuffix(orderNumber)) return;

      // Pobierz aktualne dane zamówienia (mogły się zmienić po applyPendingPrice)
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { valueEur: true },
      });

      // Jeśli zamówienie już ma cenę EUR - nie dziedzicz
      if (currentOrder?.valueEur != null) return;

      // Szukaj zamówienia bazowego
      const baseOrderNumber = orderNumberParser.getBase(orderNumber);
      const baseOrder = await prisma.order.findUnique({
        where: { orderNumber: baseOrderNumber },
        select: { valueEur: true },
      });

      // Jeśli bazowe nie istnieje lub nie ma ceny - nie dziedzicz
      if (!baseOrder?.valueEur) return;

      // Skopiuj cenę z bazowego + oznacz jako odziedziczoną
      await prisma.order.update({
        where: { id: orderId },
        data: {
          valueEur: baseOrder.valueEur,
          priceInheritedFromOrder: baseOrderNumber,
        },
      });

      logger.info(
        `Cena EUR odziedziczona: ${orderNumber} <- ${baseOrderNumber} (${baseOrder.valueEur / 100} EUR)`
      );
    } catch (error) {
      // Nie blokuj tworzenia zamówienia
      const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.warn(`Błąd przy dziedziczeniu ceny dla ${orderNumber}: ${errMsg}`);
    }
  }

  /**
   * Propagacja ceny EUR do zamówień zastępczych (z sufixem -a, -b, -c)
   * Wywoływane gdy zmienia się cena EUR zamówienia bazowego
   */
  private async propagatePriceToVariants(orderNumber: string, newValueEur: number | null): Promise<void> {
    try {
      // Pobierz bazowy numer (dla pewności, gdyby ktoś zmienił cenę na wariancie)
      const baseNumber = orderNumberParser.getBase(orderNumber);

      // Szukaj zamówień które odziedziczyły cenę z tego bazowego zamówienia
      const variantOrders = await prisma.order.findMany({
        where: {
          priceInheritedFromOrder: baseNumber,
          deletedAt: null,
        },
        select: { id: true, orderNumber: true },
      });

      if (variantOrders.length === 0) return;

      // Zaktualizuj cenę EUR we wszystkich wariantach
      await prisma.order.updateMany({
        where: {
          priceInheritedFromOrder: baseNumber,
          deletedAt: null,
        },
        data: {
          valueEur: newValueEur,
        },
      });

      const variantNumbers = variantOrders.map(o => o.orderNumber).join(', ');
      logger.info(
        `Cena EUR propagowana z ${baseNumber} do wariantów: ${variantNumbers} (${newValueEur ? newValueEur / 100 : 0} EUR)`
      );
    } catch (error) {
      // Nie blokuj aktualizacji zamówienia
      const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.warn(`Błąd przy propagacji ceny z ${orderNumber}: ${errMsg}`);
    }
  }

  /**
   * Helper: Przelicza readiness dla wszystkich dostaw powiązanych ze zleceniem
   */
  private async recalculateDeliveryReadinessForOrder(orderId: number): Promise<void> {
    try {
      const deliveryOrders = await prisma.deliveryOrder.findMany({
        where: { orderId },
        select: { deliveryId: true },
      });

      for (const { deliveryId } of deliveryOrders) {
        await this.readinessAggregator.recalculateIfNeeded(deliveryId);
      }
    } catch (error) {
      logger.error('Error recalculating delivery readiness for order', { orderId, error });
    }
  }

  /**
   * Soft delete zlecenia - tylko dla adminów/kierowników, tylko status "new"
   * @param id - ID zlecenia
   * @param deletedByUserId - ID użytkownika usuwającego
   */
  async deleteOrder(id: number, deletedByUserId: number) {
    // Verify order exists
    const order = await this.getOrderById(id);

    // Safety check: Tylko zlecenia w statusie "new" można usunąć
    if (order.status !== 'new') {
      throw new ValidationError(
        `Nie można usunąć zlecenia o statusie "${order.status}". ` +
        'Można usuwać tylko zlecenia w statusie "Nowe".'
      );
    }

    // Safety check: Sprawdź czy zlecenie nie jest powiązane z wysłaną/dostarczoną dostawą
    const deliveries = await this.repository.getOrderDeliveries(id);
    const hasShippedOrDelivered = deliveries.some(
      d => d.status === 'shipped' || d.status === 'delivered'
    );

    if (hasShippedOrDelivered) {
      throw new ValidationError(
        'Nie można usunąć zlecenia przypisanego do wysłanej lub dostarczonej dostawy.'
      );
    }

    // Soft delete - zachowuje dane w bazie z datą usunięcia
    await this.repository.softDelete(id, deletedByUserId);

    emitOrderDeleted(id);

    logger.info('Order soft deleted', { orderId: id, deletedByUserId });
  }

  /**
   * Przywrócenie usuniętego zlecenia (soft delete restore)
   */
  async restoreOrder(id: number) {
    await this.repository.restore(id);

    const order = await this.getOrderById(id);
    emitOrderUpdated(order);

    logger.info('Order restored', { orderId: id });

    return order;
  }

  async archiveOrder(id: number) {
    // Verify order exists
    await this.getOrderById(id);

    const order = await this.repository.archive(id);

    emitOrderUpdated(order);

    return order;
  }

  /**
   * Aktualizuj ręczny status zlecenia (NIE CIĄĆ, Anulowane, Wstrzymane)
   * @param id - ID zlecenia
   * @param manualStatus - nowy status lub null (aby usunąć)
   */
  async updateManualStatus(id: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null) {
    // Verify order exists
    await this.getOrderById(id);

    const order = await this.repository.updateManualStatus(id, manualStatus);

    // Jeśli zlecenie ma status 'cancelled', nie cofamy automatycznie okuć z zapotrzebowania
    // - to robi scheduler/użytkownik ręcznie przy archiwizacji

    logger.info(`Order ${id} manual status updated to: ${manualStatus}`);

    return order;
  }

  async unarchiveOrder(id: number) {
    // Verify order exists
    await this.getOrderById(id);

    const order = await this.repository.unarchive(id);

    emitOrderUpdated(order);

    return order;
  }

  async bulkUpdateStatus(
    orderIds: number[],
    status: string,
    productionDate?: string,
    skipWarehouseValidation = false,
    deliveryIds?: number[]
  ) {
    // Validate that all orders exist
    const orders = await Promise.all(
      orderIds.map(id => this.repository.findById(id))
    );

    // Check if any orders don't exist
    const notFoundIds = orderIds.filter((id, index) => !orders[index]);
    if (notFoundIds.length > 0) {
      throw new NotFoundError(`Orders with IDs ${notFoundIds.join(', ')} not found`);
    }

    // Validate status transitions for all orders BEFORE updating any
    const invalidTransitions: Array<{ id: number; orderNumber: string; currentStatus: string }> = [];

    orders.forEach((order) => {
      if (order) {
        try {
          validateStatusTransition(order.status, status);
        } catch {
          invalidTransitions.push({
            id: order.id,
            orderNumber: order.orderNumber,
            currentStatus: order.status,
          });
        }
      }
    });

    // If any transitions are invalid, fail the entire operation
    if (invalidTransitions.length > 0) {
      const errorDetails = invalidTransitions
        .map(({ orderNumber, currentStatus }) =>
          `${orderNumber} (${currentStatus} → ${status})`
        )
        .join(', ');

      throw new ValidationError(
        `Niedozwolone zmiany statusu dla ${invalidTransitions.length} zlecenia/zleceń: ${errorDetails}. ` +
        `Wszystkie zlecenia muszą mieć dozwoloną zmianę statusu.`
      );
    }

    // CRITICAL: Validate warehouse stock for ALL orders if starting production
    // Check BEFORE transaction to fail fast
    // Fixed: ignoruje requirements z beamsCount = 0
    // Można pominąć walidację gdy użytkownik potwierdził mimo braków
    if (status === ORDER_STATUSES.IN_PROGRESS && !skipWarehouseValidation) {
      for (const order of orders) {
        if (order) {
          await validateSufficientStock(prisma, order.id);
        }
      }
    }

    // Use transaction to update all orders atomically
    const updatedOrders = await this.repository.bulkUpdateStatus(
      orderIds,
      status,
      productionDate
    );

    // Emit update events for all orders
    updatedOrders.forEach(order => emitOrderUpdated(order));

    // Automatyczne RW gdy status = completed
    // Wykonuj ASYNCHRONICZNIE aby nie blokować odpowiedzi API
    // SEKWENCYJNIE (nie równolegle!) - SQLite nie obsługuje concurrent writes
    if (status === ORDER_STATUSES.COMPLETED) {
      this.processAllRwSequentially(orderIds);
    }

    // Auto-recalculate readiness dla powiązanych dostaw
    await this.recalculateDeliveryReadinessForOrders(orderIds);

    // Zmień status dostaw jeśli były zaznaczone całe dostawy
    if (deliveryIds && deliveryIds.length > 0) {
      await prisma.delivery.updateMany({
        where: { id: { in: deliveryIds } },
        data: { status },
      });
    }

    // Automatyczne completed dla dostaw gdy wszystkie zlecenia są completed
    if (status === ORDER_STATUSES.COMPLETED) {
      await this.autoCompleteDeliveriesIfAllOrdersCompleted(orderIds);
    }

    return updatedOrders;
  }

  /**
   * Automatycznie oznacza dostawę jako 'completed' gdy wszystkie jej zlecenia mają status 'completed'
   * Wywoływane po bulk update statusu zleceń na 'completed'
   */
  private async autoCompleteDeliveriesIfAllOrdersCompleted(orderIds: number[]): Promise<void> {
    try {
      // Znajdź wszystkie dostawy powiązane z tymi zleceniami
      const deliveryOrders = await prisma.deliveryOrder.findMany({
        where: { orderId: { in: orderIds } },
        select: { deliveryId: true },
        distinct: ['deliveryId'],
      });

      const deliveryIds = deliveryOrders.map(d => d.deliveryId);

      if (deliveryIds.length === 0) return;

      // Dla każdej dostawy sprawdź czy wszystkie zlecenia są completed
      for (const deliveryId of deliveryIds) {
        // Pobierz dostawę i sprawdź czy jej status to in_progress (nie chcemy zmieniać już zakończonych)
        const delivery = await prisma.delivery.findUnique({
          where: { id: deliveryId },
          select: { id: true, status: true },
        });

        if (!delivery || delivery.status !== 'in_progress') continue;

        // Sprawdź czy wszystkie zlecenia w tej dostawie mają status 'completed'
        const incompleteOrders = await prisma.deliveryOrder.findFirst({
          where: {
            deliveryId,
            order: {
              status: { not: 'completed' },
            },
          },
        });

        // Jeśli nie ma żadnych niezakończonych zleceń - oznacz dostawę jako completed
        if (!incompleteOrders) {
          await prisma.delivery.update({
            where: { id: deliveryId },
            data: { status: 'completed' },
          });

          logger.info('Dostawa automatycznie oznaczona jako completed', {
            deliveryId,
            reason: 'all_orders_completed',
          });
        }
      }
    } catch (error) {
      logger.error('Błąd podczas automatycznego kończenia dostaw', {
        orderIds,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Helper: Przelicza readiness dla wszystkich dostaw powiązanych z wieloma zleceniami
   */
  private async recalculateDeliveryReadinessForOrders(orderIds: number[]): Promise<void> {
    try {
      const deliveryOrders = await prisma.deliveryOrder.findMany({
        where: { orderId: { in: orderIds } },
        select: { deliveryId: true },
        distinct: ['deliveryId'],
      });

      for (const { deliveryId } of deliveryOrders) {
        await this.readinessAggregator.recalculateIfNeeded(deliveryId);
      }
    } catch (error) {
      logger.error('Error recalculating delivery readiness for orders', { orderIds, error });
    }
  }

  /**
   * Przetworz wszystkie typy RW SEKWENCYJNIE (nie równolegle)
   * SQLite nie obsługuje concurrent writes - równoległe transakcje powodują SQLITE_BUSY
   */
  private async processAllRwSequentially(orderIds: number[]): Promise<void> {
    try {
      // Okucia RW
      await this.processOkucRwAsync(orderIds);
      // Profile RW (po zakończeniu okuć)
      await this.processProfileRwAsync(orderIds);
      // Stal RW (po zakończeniu profili)
      await this.processSteelRwAsync(orderIds);

      logger.info('Wszystkie RW przetworzone sekwencyjnie', { orderIds });
    } catch (error) {
      logger.error('Błąd podczas sekwencyjnego przetwarzania RW', {
        orderIds,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Przetworz RW dla okuć asynchronicznie
   * Nie blokuje głównego flow zmiany statusu
   */
  private async processOkucRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new OkucRwService(prisma);
      const results = await rwService.processRwForOrders(orderIds);

      // Loguj wyniki
      const summary = results.reduce(
        (acc, r) => ({
          totalProcessed: acc.totalProcessed + r.processed,
          totalSkipped: acc.totalSkipped + r.skipped,
          totalErrors: acc.totalErrors + r.errors.length,
        }),
        { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 }
      );

      if (summary.totalProcessed > 0) {
        logger.info('Automatyczne RW dla okuć przetworzone', {
          ordersCount: orderIds.length,
          processed: summary.totalProcessed,
          skipped: summary.totalSkipped,
          errors: summary.totalErrors,
        });
      }

      // Loguj błędy jeśli występują
      results.forEach(result => {
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas RW dla zlecenia', {
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            errors: result.errors,
          });
        }
      });
    } catch (error) {
      // Nie rzucaj błędu - RW nie powinno blokować głównego flow
      logger.error('Błąd podczas automatycznego RW dla okuć', {
        orderIds,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Przetworz RW dla profili asynchronicznie
   * Nie blokuje głównego flow zmiany statusu
   */
  private async processProfileRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new WarehouseRwService(prisma);
      const results = await rwService.processRwForOrders(orderIds);

      // Loguj wyniki
      const summary = results.reduce(
        (acc, r) => ({
          totalProcessed: acc.totalProcessed + r.processed,
          totalSkipped: acc.totalSkipped + r.skipped,
          totalErrors: acc.totalErrors + r.errors.length,
        }),
        { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 }
      );

      if (summary.totalProcessed > 0) {
        logger.info('Automatyczne RW dla profili przetworzone', {
          ordersCount: orderIds.length,
          processed: summary.totalProcessed,
          skipped: summary.totalSkipped,
          errors: summary.totalErrors,
        });
      }

      // Loguj błędy jeśli występują
      results.forEach(result => {
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas RW profili dla zlecenia', {
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            errors: result.errors,
          });
        }
      });
    } catch (error) {
      // Nie rzucaj błędu - RW nie powinno blokować głównego flow
      logger.error('Błąd podczas automatycznego RW dla profili', {
        orderIds,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Przetworz RW dla stali asynchronicznie
   * Nie blokuje głównego flow zmiany statusu
   */
  private async processSteelRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new SteelRwService(prisma);
      const results = await rwService.processRwForOrders(orderIds);

      // Loguj wyniki
      const summary = results.reduce(
        (acc, r) => ({
          totalProcessed: acc.totalProcessed + r.processed,
          totalSkipped: acc.totalSkipped + r.skipped,
          totalErrors: acc.totalErrors + r.errors.length,
        }),
        { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 }
      );

      if (summary.totalProcessed > 0) {
        logger.info('Automatyczne RW dla stali przetworzone', {
          ordersCount: orderIds.length,
          processed: summary.totalProcessed,
          skipped: summary.totalSkipped,
          errors: summary.totalErrors,
        });
      }

      // Loguj błędy jeśli występują
      results.forEach(result => {
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas RW stali dla zlecenia', {
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            errors: result.errors,
          });
        }
      });
    } catch (error) {
      // Nie rzucaj błędu - RW nie powinno blokować głównego flow
      logger.error('Błąd podczas automatycznego RW dla stali', {
        orderIds,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Cofnij RW dla okuć asynchronicznie
   */
  private async reverseOkucRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new OkucRwService(prisma);
      for (const orderId of orderIds) {
        const result = await rwService.reverseRwForOrder(orderId);
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas cofania RW okuć', {
            orderId, orderNumber: result.orderNumber, errors: result.errors,
          });
        }
      }
    } catch (error) {
      logger.error('Błąd podczas cofania RW dla okuć', {
        orderIds, error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Cofnij RW dla profili asynchronicznie
   */
  private async reverseProfileRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new WarehouseRwService(prisma);
      for (const orderId of orderIds) {
        const result = await rwService.reverseRwForOrder(orderId);
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas cofania RW profili', {
            orderId, orderNumber: result.orderNumber, errors: result.errors,
          });
        }
      }
    } catch (error) {
      logger.error('Błąd podczas cofania RW dla profili', {
        orderIds, error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Cofnij RW dla stali asynchronicznie
   */
  private async reverseSteelRwAsync(orderIds: number[]): Promise<void> {
    try {
      const rwService = new SteelRwService(prisma);
      for (const orderId of orderIds) {
        const result = await rwService.reverseRwForOrder(orderId);
        if (result.errors.length > 0) {
          logger.warn('Błędy podczas cofania RW stali', {
            orderId, orderNumber: result.orderNumber, errors: result.errors,
          });
        }
      }
    } catch (error) {
      logger.error('Błąd podczas cofania RW dla stali', {
        orderIds, error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  /**
   * Cofnij produkcję - zmień status z completed na in_progress
   * Cofa również RW (rozchody wewnętrzne) dla okuć, profili i stali
   */
  async revertProduction(orderIds: number[]) {
    // Waliduj że wszystkie zlecenia istnieją i mają status completed
    const orders = await Promise.all(
      orderIds.map(id => this.repository.findById(id))
    );

    const notFoundIds = orderIds.filter((id, index) => !orders[index]);
    if (notFoundIds.length > 0) {
      throw new NotFoundError(`Orders with IDs ${notFoundIds.join(', ')} not found`);
    }

    const notCompleted = orders.filter(o => o && o.status !== 'completed');
    if (notCompleted.length > 0) {
      const details = notCompleted
        .map(o => `${o!.orderNumber} (${o!.status})`)
        .join(', ');
      throw new ValidationError(
        `Można cofnąć tylko zlecenia ze statusem "completed". Nieprawidłowe: ${details}`
      );
    }

    // Zmień status na in_progress (repository wyczyści completedAt i productionDate)
    const updatedOrders = await this.repository.bulkUpdateStatus(
      orderIds,
      ORDER_STATUSES.IN_PROGRESS
    );

    // Emituj eventy
    updatedOrders.forEach(order => emitOrderUpdated(order));

    // Cofnij RW asynchronicznie
    this.reverseOkucRwAsync(orderIds);
    this.reverseProfileRwAsync(orderIds);
    this.reverseSteelRwAsync(orderIds);

    // Przelicz readiness dostaw
    await this.recalculateDeliveryReadinessForOrders(orderIds);

    logger.info('Production reverted for orders', {
      orderIds,
      orderNumbers: updatedOrders.map(o => o.orderNumber),
    });

    return updatedOrders;
  }

  async getForProduction(params: {
    overdueDays: number;
    upcomingDays: number;
    deliveriesLimit: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingDate = new Date(today);
    upcomingDate.setDate(upcomingDate.getDate() + params.upcomingDays);

    // Fetch deliveries first to get order IDs that are already in deliveries
    const upcomingDeliveries = await this.repository.findUpcomingDeliveries({
      deliveryDate: { gte: today },
      status: { in: ['planned', 'in_progress'] },
      limit: params.deliveriesLimit,
    });

    // Extract all order IDs from deliveries to exclude them from other sections
    const deliveryOrderIds = new Set<number>();
    upcomingDeliveries.forEach((delivery) => {
      delivery.deliveryOrders?.forEach((dOrder) => {
        if (dOrder.order?.id) {
          deliveryOrderIds.add(dOrder.order.id);
        }
      });
    });

    const excludeDeliveryOrders = deliveryOrderIds.size > 0
      ? { id: { notIn: Array.from(deliveryOrderIds) } }
      : {};

    const [overdueOrders, upcomingOrders, privateOrders] = await Promise.all([
      // Overdue orders: deadline < today, status = new (not yet in production), NOT AKROBUD
      this.repository.findPrivateOrders({
        deadline: { lt: today },
        status: 'new',
        archivedAt: null,
        ...excludeDeliveryOrders,
      }),

      // Upcoming orders: deadline between today and upcoming date, status = new, NOT AKROBUD
      this.repository.findPrivateOrders({
        deadline: { gte: today, lte: upcomingDate },
        status: 'new',
        archivedAt: null,
        ...excludeDeliveryOrders,
      }),

      // Private orders: status = new, NOT in overdue (deadline < today) and NOT in upcoming (deadline <= upcomingDate)
      // Czyli: brak deadline LUB deadline > upcomingDate
      this.repository.findPrivateOrdersExcludingDeadline({
        status: 'new',
        archivedAt: null,
        ...excludeDeliveryOrders,
      }, upcomingDate),
    ]);

    return {
      overdueOrders,
      upcomingOrders,
      privateOrders,
      upcomingDeliveries,
    };
  }

  /**
   * Get orders completed in a specific month/year for production reports
   * Optimized to only fetch orders from the selected month
   */
  async getMonthlyProduction(year: number, month: number) {
    // Validate input
    if (year < 2000 || year > 2100) {
      throw new ValidationError('Year must be between 2000 and 2100');
    }
    if (month < 1 || month > 12) {
      throw new ValidationError('Month must be between 1 and 12');
    }

    return this.repository.findMonthlyProduction(year, month);
  }

  /**
   * Get completeness statistics for operator dashboard
   * Shows how many orders have files, glass, and hardware ready
   *
   * @param userId - User ID to filter by (null = all orders)
   */
  async getCompletenessStats(userId: number | null) {
    return this.repository.getCompletenessStats(userId);
  }

  /**
   * Partial update of order (PATCH)
   * Handles conversion of PLN/EUR strings to grosze/centy
   */
  async patchOrder(
    id: number,
    data: {
      valuePln?: string | null;
      valueEur?: string | null;
      deadline?: string | null;
      status?: string | null;
      glassDeliveryDate?: string | null;
      documentAuthorUserId?: number | null;
    }
  ) {
    // Verify order exists
    await this.getOrderById(id);

    // Import money conversion functions lazily to avoid circular deps
    const { plnToGrosze, eurToCenty } = await import('../utils/money.js');

    // Build update data with proper conversions
    const updateData: Prisma.OrderUpdateInput = {};

    if (data.valuePln !== undefined) {
      // Convert PLN string (e.g., "123.45") to grosze (12345)
      updateData.valuePln = data.valuePln !== null ? plnToGrosze(Number(data.valuePln)) : null;
    }
    if (data.valueEur !== undefined) {
      // Convert EUR string (e.g., "123.45") to cents (12345)
      updateData.valueEur = data.valueEur !== null ? eurToCenty(Number(data.valueEur)) : null;
    }
    if (data.deadline !== undefined) {
      // Convert deadline string to Date or null
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.status !== undefined) {
      updateData.status = data.status ?? undefined;
    }
    if (data.glassDeliveryDate !== undefined) {
      updateData.glassDeliveryDate = data.glassDeliveryDate ? new Date(data.glassDeliveryDate) : null;
    }
    if (data.documentAuthorUserId !== undefined) {
      if (data.documentAuthorUserId === null) {
        // Usunięcie autora
        updateData.documentAuthorUser = { disconnect: true };
        updateData.documentAuthor = null;
      } else {
        // Pobierz nazwę użytkownika z bazy
        const { prisma } = await import('../index.js');
        const user = await prisma.user.findUnique({
          where: { id: data.documentAuthorUserId },
          select: { name: true },
        });
        if (!user) {
          throw new Error(`Nie znaleziono użytkownika o ID ${data.documentAuthorUserId}`);
        }
        updateData.documentAuthorUser = { connect: { id: data.documentAuthorUserId } };
        updateData.documentAuthor = user.name;
      }
    }

    const order = await this.repository.update(id, updateData);

    emitOrderUpdated(order);

    return order;
  }

  /**
   * Get requirements totals grouped by profile and color
   * Used for the requirements totals view
   */
  async getRequirementsTotals() {
    return this.repository.getRequirementsTotals();
  }
}
