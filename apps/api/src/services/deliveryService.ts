/**
 * Delivery Service - Business logic layer
 */

import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  emitDeliveryCreated,
  emitDeliveryUpdated,
  emitDeliveryDeleted,
  emitOrderUpdated,
} from './event-emitter.js';
import { deliveryTotalsService } from './deliveryTotalsService.js';
import {
  parseDate,
  parseDateSafe,
  formatPolishDate,
  getDayRange,
  toRomanNumeral,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  POLISH_DAY_NAMES,
} from '../utils/date-helpers.js';
import { OrderVariantService } from './orderVariantService.js';
import { CsvParser } from './parsers/csv-parser.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../index.js';

export class DeliveryService {
  private variantService: OrderVariantService;
  private csvParser: CsvParser;

  constructor(private repository: DeliveryRepository) {
    this.variantService = new OrderVariantService(prisma);
    this.csvParser = new CsvParser();
  }

  async getAllDeliveries(filters: { from?: string; to?: string; status?: string }) {
    const deliveryFilters = {
      from: parseDateSafe(filters.from),
      to: parseDateSafe(filters.to),
      status: filters.status,
    };

    return this.repository.findAll(deliveryFilters);
  }

  async getDeliveryById(id: number) {
    const delivery = await this.repository.findById(id);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Add calculated totals
    const totals = await deliveryTotalsService.getDeliveryTotals(id);

    return {
      ...delivery,
      ...totals,
    };
  }

  async createDelivery(data: { deliveryDate: string; deliveryNumber?: string; notes?: string }) {
    const deliveryDate = parseDate(data.deliveryDate);

    // Generate delivery number if not provided: DD.MM.YYYY_X
    let deliveryNumber = data.deliveryNumber;
    if (!deliveryNumber) {
      deliveryNumber = await this.generateDeliveryNumber(deliveryDate);
    }

    const delivery = await this.repository.create({
      deliveryDate,
      deliveryNumber,
      notes: data.notes,
    });

    emitDeliveryCreated(delivery);

    return delivery;
  }

  /**
   * Generate delivery number in format DD.MM.YYYY_X
   * where X is I, II, III, IV etc. for multiple deliveries on same day
   * Uses transaction with row locking to prevent race conditions
   */
  private async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
    const datePrefix = formatPolishDate(deliveryDate);
    const { start, end } = getDayRange(deliveryDate);

    // Use raw query with FOR UPDATE to lock rows and prevent race conditions
    // This ensures only one transaction at a time can count deliveries for this day
    return prisma.$transaction(async (tx) => {
      const existingDeliveries = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM deliveries
        WHERE delivery_date >= ${start.getTime()}
          AND delivery_date <= ${end.getTime()}
        FOR UPDATE
      `;

      const count = Number(existingDeliveries[0]?.count || 0n) + 1;
      const suffix = toRomanNumeral(count);

      return `${datePrefix}_${suffix}`;
    });
  }

  async updateDelivery(id: number, data: { deliveryDate?: string; status?: string; notes?: string }) {
    // Verify delivery exists
    await this.getDeliveryById(id);

    const delivery = await this.repository.update(id, {
      deliveryDate: parseDateSafe(data.deliveryDate),
      status: data.status,
      notes: data.notes,
    });

    emitDeliveryUpdated(delivery);

    return delivery;
  }

  async deleteDelivery(id: number) {
    // Verify delivery exists
    await this.getDeliveryById(id);

    await this.repository.delete(id);

    emitDeliveryDeleted(id);
  }

  async addOrderToDelivery(deliveryId: number, orderId: number) {
    // Verify delivery exists
    const delivery = await this.getDeliveryById(deliveryId);

    // Get order details to extract order number
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Parse order number to get base number
    const { base: baseNumber } = this.csvParser.parseOrderNumber(order.orderNumber);

    logger.info('Checking for order variant conflicts before adding to delivery', {
      orderId,
      orderNumber: order.orderNumber,
      baseNumber,
      deliveryId,
      deliveryNumber: delivery.deliveryNumber,
    });

    // Check if any variant of this order is already in a delivery
    const variantCheck = await this.variantService.checkVariantInDelivery(baseNumber);

    if (variantCheck.hasConflict && variantCheck.conflictingOrder) {
      const conflictingOrder = variantCheck.conflictingOrder;
      const conflictingDelivery = conflictingOrder.deliveryAssignment;

      logger.warn('Order variant conflict detected', {
        newOrder: order.orderNumber,
        conflictingOrder: conflictingOrder.orderNumber,
        deliveryNumber: conflictingDelivery?.deliveryNumber,
        deliveryId: conflictingDelivery?.deliveryId,
      });

      throw new ValidationError(
        `Zlecenie ${conflictingOrder.orderNumber} (wariant tego samego zlecenia bazowego ${baseNumber}) jest już przypisane do dostawy ${conflictingDelivery?.deliveryNumber || conflictingDelivery?.deliveryId}`
      );
    }

    logger.info('No variant conflicts found, proceeding to add order to delivery', {
      orderId,
      orderNumber: order.orderNumber,
      deliveryId,
    });

    // Add order with atomic position calculation to prevent race conditions
    const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });

    return deliveryOrder;
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number) {
    await this.repository.removeOrderFromDelivery(deliveryId, orderId);

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
    // Walidacja 1: Usuń duplikaty
    const uniqueOrderIds = [...new Set(orderIds)];

    if (uniqueOrderIds.length !== orderIds.length) {
      throw new ValidationError('Lista zleceń zawiera duplikaty');
    }

    // Walidacja 2: Pobierz istniejące zlecenia w tej dostawie
    const delivery = await this.getDeliveryById(deliveryId);
    const existingOrderIds = new Set(delivery.deliveryOrders.map(d => d.orderId));

    // Walidacja 3: Sprawdź czy wszystkie orderIds należą do tej dostawy
    const invalidOrders = uniqueOrderIds.filter(id => !existingOrderIds.has(id));
    if (invalidOrders.length > 0) {
      throw new ValidationError(
        `Następujące zlecenia nie należą do tej dostawy: ${invalidOrders.join(', ')}`
      );
    }

    // Walidacja 4: Czy wszystkie zlecenia są uwzględnione?
    if (uniqueOrderIds.length !== existingOrderIds.size) {
      throw new ValidationError(
        `Lista zleceń jest niepełna. Oczekiwano ${existingOrderIds.size} zleceń, otrzymano ${uniqueOrderIds.length}`
      );
    }

    await this.repository.reorderDeliveryOrders(deliveryId, uniqueOrderIds);
    return { success: true };
  }

  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ) {
    // Execute as atomic transaction to prevent data loss
    const deliveryOrder = await this.repository.moveOrderBetweenDeliveries(
      sourceDeliveryId,
      targetDeliveryId,
      orderId
    );

    // Emit events after successful transaction
    emitDeliveryUpdated({ id: sourceDeliveryId });
    emitDeliveryUpdated({ id: targetDeliveryId });
    emitOrderUpdated({ id: orderId });

    return deliveryOrder;
  }

  async addItemToDelivery(deliveryId: number, data: { itemType: string; description: string; quantity: number }) {
    // Verify delivery exists
    await this.getDeliveryById(deliveryId);

    const item = await this.repository.addItem(deliveryId, data);

    emitDeliveryUpdated({ id: deliveryId });

    return item;
  }

  async removeItemFromDelivery(deliveryId: number, itemId: number) {
    await this.repository.removeItem(itemId);

    emitDeliveryUpdated({ id: deliveryId });
  }

  async completeDelivery(deliveryId: number, productionDate: string) {
    const delivery = await this.repository.getDeliveryOrders(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    const orderIds = delivery.deliveryOrders.map((d) => d.orderId);

    await this.repository.updateOrdersBatch(orderIds, {
      productionDate: parseDate(productionDate),
      status: 'completed',
    });

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    orderIds.forEach((orderId) => {
      emitOrderUpdated({ id: orderId });
    });

    return { success: true, updatedOrders: orderIds.length };
  }

  /**
   * Get calendar data for a specific month/year
   */
  async getCalendarData(year: number, month: number) {
    return this.repository.getCalendarData(year, month);
  }

  /**
   * Get batched calendar data for multiple months
   * Combines deliveries, working days, and holidays into a single query
   */
  async getCalendarDataBatch(months: Array<{ month: number; year: number }>) {
    // Fetch all calendar data in parallel
    const calendarPromises = months.map(({ month, year }) =>
      this.repository.getCalendarData(year, month)
    );

    const calendarResults = await Promise.all(calendarPromises);

    // Combine deliveries and unassigned orders
    const allDeliveries = calendarResults.flatMap(r => r.deliveries || []);
    const unassignedOrders = calendarResults[0]?.unassignedOrders || [];

    // Get working days for all months
    const workingDaysPromises = months.map(({ month, year }) =>
      this.repository.getWorkingDays(month, year)
    );
    const workingDaysResults = await Promise.all(workingDaysPromises);
    const workingDays = workingDaysResults.flat();

    // Get holidays for all unique years
    const uniqueYears = Array.from(new Set(months.map(m => m.year)));
    const holidaysPromises = uniqueYears.map(year =>
      this.repository.getHolidays(year)
    );
    const holidaysResults = await Promise.all(holidaysPromises);
    const holidays = holidaysResults.flat();

    return {
      deliveries: allDeliveries,
      unassignedOrders,
      workingDays,
      holidays,
    };
  }

  /**
   * Get profile requirements aggregated by delivery
   */
  async getProfileRequirements(fromDate?: string) {
    const deliveries = await this.repository.getDeliveriesWithRequirements(
      parseDateSafe(fromDate)
    );

    const result: Array<{
      deliveryId: number;
      deliveryDate: string;
      profileId: number;
      colorCode: string;
      totalBeams: number;
    }> = [];

    deliveries.forEach((delivery) => {
      const profileMap = new Map<string, { beams: number; meters: number }>();

      delivery.deliveryOrders.forEach((deliveryOrder) => {
        deliveryOrder.order.requirements.forEach((req) => {
          const key = `${req.profileId}-${req.color.code}`;
          const current = profileMap.get(key) || { beams: 0, meters: 0 };
          profileMap.set(key, {
            beams: current.beams + req.beamsCount,
            meters: current.meters + req.meters,
          });
        });
      });

      profileMap.forEach((data, key) => {
        const [profileIdStr, colorCode] = key.split('-');
        const profileIdNum = parseInt(profileIdStr, 10);

        if (isNaN(profileIdNum)) {
          return;
        }

        // Add beams from meters: sum meters / 6m, rounded up
        const beamsFromMeters = Math.ceil(data.meters / 6);
        const totalBeams = data.beams + beamsFromMeters;

        result.push({
          deliveryId: delivery.id,
          deliveryDate: delivery.deliveryDate.toISOString(),
          profileId: profileIdNum,
          colorCode,
          totalBeams,
        });
      });
    });

    return result;
  }

  /**
   * Get windows/sashes/glasses statistics by weekday
   */
  async getWindowsStatsByWeekday(monthsBack: number) {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, monthsBack));

    const deliveries = await this.repository.getDeliveriesWithWindows(startDate);

    // Initialize weekday stats (0 = Sunday, 6 = Saturday)
    const weekdayStats = new Map<number, {
      deliveriesCount: number;
      totalWindows: number;
      totalSashes: number;
      totalGlasses: number;
    }>();

    for (let i = 0; i < 7; i++) {
      weekdayStats.set(i, {
        deliveriesCount: 0,
        totalWindows: 0,
        totalSashes: 0,
        totalGlasses: 0,
      });
    }

    // Aggregate data
    deliveries.forEach((delivery) => {
      const weekday = getDay(delivery.deliveryDate);
      const stats = weekdayStats.get(weekday)!;

      stats.deliveriesCount += 1;

      delivery.deliveryOrders.forEach((dOrder) => {
        stats.totalWindows += dOrder.order.totalWindows || 0;
        stats.totalSashes += dOrder.order.totalSashes || 0;
        stats.totalGlasses += dOrder.order.totalGlasses || 0;
      });
    });

    const stats = Array.from(weekdayStats.entries()).map(([weekday, data]) => ({
      weekday,
      weekdayName: POLISH_DAY_NAMES[weekday],
      ...data,
      avgWindowsPerDelivery: data.deliveriesCount > 0
        ? data.totalWindows / data.deliveriesCount
        : 0,
      avgSashesPerDelivery: data.deliveriesCount > 0
        ? data.totalSashes / data.deliveriesCount
        : 0,
      avgGlassesPerDelivery: data.deliveriesCount > 0
        ? data.totalGlasses / data.deliveriesCount
        : 0,
    }));

    return {
      stats,
      periodStart: startDate,
      periodEnd: today,
    };
  }

  /**
   * Get monthly windows/sashes/glasses statistics
   */
  async getMonthlyWindowsStats(monthsBack: number) {
    const today = new Date();

    // Prepare date ranges for each month
    const monthRanges = [];
    for (let i = 0; i < monthsBack; i++) {
      const targetMonth = subMonths(today, i);
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      monthRanges.push({
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear(),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    // Get stats for each month
    const stats = await Promise.all(
      monthRanges.map(async (range) => {
        const deliveries = await this.repository.getDeliveriesWithWindows(
          range.startDate,
          range.endDate
        );

        let totalWindows = 0;
        let totalSashes = 0;
        let totalGlasses = 0;

        deliveries.forEach((delivery) => {
          delivery.deliveryOrders.forEach((dOrder) => {
            totalWindows += dOrder.order.totalWindows || 0;
            totalSashes += dOrder.order.totalSashes || 0;
            totalGlasses += dOrder.order.totalGlasses || 0;
          });
        });

        return {
          month: range.month,
          year: range.year,
          monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
          deliveriesCount: deliveries.length,
          totalWindows,
          totalSashes,
          totalGlasses,
        };
      })
    );

    return { stats: stats.reverse() };
  }

  /**
   * Get monthly profile usage statistics
   */
  async getMonthlyProfileStats(monthsBack: number) {
    const today = new Date();

    const monthRanges = [];
    for (let i = 0; i < monthsBack; i++) {
      const targetMonth = subMonths(today, i);
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      monthRanges.push({
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear(),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    const stats = await Promise.all(
      monthRanges.map(async (range) => {
        const deliveries = await this.repository.getDeliveriesWithProfileStats(
          range.startDate,
          range.endDate
        );

        const profileUsage = new Map<string, {
          profileId: number;
          profileNumber: string;
          profileName: string;
          colorId: number;
          colorCode: string;
          colorName: string;
          totalBeams: number;
          totalMeters: number;
          deliveryCount: number;
        }>();

        deliveries.forEach((delivery) => {
          delivery.deliveryOrders.forEach((dOrder) => {
            dOrder.order.requirements.forEach((req) => {
              const key = `${req.profileId}-${req.colorId}`;

              if (!profileUsage.has(key)) {
                profileUsage.set(key, {
                  profileId: req.profileId,
                  profileNumber: req.profile.number,
                  profileName: req.profile.name,
                  colorId: req.colorId,
                  colorCode: req.color.code,
                  colorName: req.color.name,
                  totalBeams: 0,
                  totalMeters: 0,
                  deliveryCount: 0,
                });
              }

              const usage = profileUsage.get(key)!;
              usage.totalBeams += req.beamsCount;
              usage.totalMeters += req.meters;
              usage.deliveryCount += 1;
            });
          });
        });

        return {
          month: range.month,
          year: range.year,
          monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
          deliveriesCount: deliveries.length,
          profiles: Array.from(profileUsage.values()).sort(
            (a, b) => b.totalBeams - a.totalBeams
          ),
        };
      })
    );

    return { stats: stats.reverse() };
  }

  /**
   * Get protocol data for a delivery
   */
  async getProtocolData(deliveryId: number) {
    const delivery = await this.repository.getDeliveryForProtocol(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    let totalWindows = 0;
    let totalValue = 0;

    const orders = delivery.deliveryOrders.map((dOrder) => {
      const windowsCount = dOrder.order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalWindows += windowsCount;

      const value = parseFloat(dOrder.order.valuePln?.toString() || '0');
      totalValue += value;

      return {
        orderNumber: dOrder.order.orderNumber,
        windowsCount,
        value,
        isReclamation: false,
      };
    });

    // Get total pallets from totals service
    const totalPallets = await deliveryTotalsService.getTotalPallets(deliveryId);

    return {
      deliveryId,
      deliveryDate: delivery.deliveryDate,
      orders,
      totalWindows,
      totalPallets,
      totalValue,
      generatedAt: new Date(),
    };
  }
}
