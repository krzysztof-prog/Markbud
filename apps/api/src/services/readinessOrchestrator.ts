/**
 * ReadinessOrchestrator - System Brain (P1-R4)
 *
 * Centralna warstwa decyzyjna która odpowiada na pytanie:
 * "CZY TO JEST GOTOWE DO (action) I DLACZEGO NIE?"
 *
 * Konsoliduje walidacje z różnych modułów:
 * - Warehouse (profile stock)
 * - Glass (zamówienia i dostawy szyb)
 * - Okuc (zapotrzebowanie i dostawy okuć)
 * - Pallet (walidacja palet)
 * - Approval (akceptacje)
 * - Variant (typy wariantów)
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { PalletValidationService } from './palletValidationService.js';

// ============================================
// TYPES
// ============================================

export type ReadinessModule = 'warehouse' | 'glass' | 'okuc' | 'pallet' | 'approval' | 'variant';
export type SignalStatus = 'ok' | 'warning' | 'blocking';

export interface ReadinessSignal {
  module: ReadinessModule;
  requirement: string;
  status: SignalStatus;
  message: string;
  actionRequired?: string;
  metadata?: Record<string, unknown>;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  blocking: boolean;
}

export interface ReadinessResult {
  ready: boolean;
  blocking: ReadinessSignal[];
  warnings: ReadinessSignal[];
  checklist: ChecklistItem[];
}

// ============================================
// READINESS ORCHESTRATOR
// ============================================

export class ReadinessOrchestrator {
  private palletValidationService: PalletValidationService;

  constructor(private prisma: PrismaClient) {
    this.palletValidationService = new PalletValidationService(prisma);
  }

  // ============================================
  // PRODUCTION READINESS
  // ============================================

  /**
   * Sprawdź czy zlecenie może rozpocząć produkcję
   * Waliduje:
   * - Stock magazynowy (profile)
   * - Status dostawy szyb
   * - Status okuć
   * - Typ wariantu (jeśli wariant)
   */
  async canStartProduction(orderId: number): Promise<ReadinessResult> {
    const signals: ReadinessSignal[] = [];
    const checklist: ChecklistItem[] = [];

    // Pobierz zlecenie z powiązaniami
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        requirements: {
          include: { profile: true, color: true },
        },
        okucDemands: true,
      },
    });

    if (!order) {
      return {
        ready: false,
        blocking: [
          {
            module: 'warehouse',
            requirement: 'order_exists',
            status: 'blocking',
            message: 'Zlecenie nie istnieje',
          },
        ],
        warnings: [],
        checklist: [],
      };
    }

    // 1. Warehouse Stock Check
    // Filtrujemy requirements aby brać tylko te z colorId (nie prywatne kolory)
    const akrobudRequirements = order.requirements.filter(
      (req): req is typeof req & { colorId: number; color: NonNullable<typeof req.color> } =>
        req.colorId !== null && req.color !== null
    );
    const warehouseSignal = await this.checkWarehouseStock(orderId, akrobudRequirements);
    signals.push(warehouseSignal);
    checklist.push({
      id: 'warehouse_stock',
      label: 'Profile na magazynie',
      checked: warehouseSignal.status === 'ok',
      blocking: warehouseSignal.status === 'blocking',
    });

    // 2. Glass Delivery Check
    const glassSignal = this.checkGlassStatus(order);
    signals.push(glassSignal);
    checklist.push({
      id: 'glass_delivery',
      label: 'Szyby dostarczone',
      checked: glassSignal.status === 'ok',
      blocking: glassSignal.status === 'blocking',
    });

    // 3. Okuc Check
    const okucSignal = this.checkOkucStatus(order);
    signals.push(okucSignal);
    checklist.push({
      id: 'okuc_ready',
      label: 'Okucia gotowe',
      checked: okucSignal.status === 'ok',
      blocking: okucSignal.status === 'blocking',
    });

    // 4. Variant Type Check (jeśli wariant)
    const variantSignal = this.checkVariantType(order);
    if (variantSignal) {
      signals.push(variantSignal);
      checklist.push({
        id: 'variant_type',
        label: 'Typ wariantu określony',
        checked: variantSignal.status === 'ok',
        blocking: variantSignal.status === 'blocking',
      });
    }

    // Agreguj wyniki
    const blocking = signals.filter((s) => s.status === 'blocking');
    const warnings = signals.filter((s) => s.status === 'warning');

    logger.info('Production readiness check completed', {
      orderId,
      orderNumber: order.orderNumber,
      ready: blocking.length === 0,
      blockingCount: blocking.length,
      warningCount: warnings.length,
    });

    return {
      ready: blocking.length === 0,
      blocking,
      warnings,
      checklist,
    };
  }

  // ============================================
  // DELIVERY READINESS
  // ============================================

  /**
   * Sprawdź czy dostawa może być wysłana
   * Waliduje:
   * - Wszystkie zlecenia ukończone
   * - Walidacja palet
   * - Szyby dostarczone
   * - Okucia dostarczone
   */
  async canShipDelivery(deliveryId: number): Promise<ReadinessResult> {
    const signals: ReadinessSignal[] = [];
    const checklist: ChecklistItem[] = [];

    // Pobierz dostawę z zleceniami
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                okucDemands: true,
              },
            },
          },
        },
        optimization: true,
      },
    });

    if (!delivery) {
      return {
        ready: false,
        blocking: [
          {
            module: 'pallet',
            requirement: 'delivery_exists',
            status: 'blocking',
            message: 'Dostawa nie istnieje',
          },
        ],
        warnings: [],
        checklist: [],
      };
    }

    // 1. Orders Completed Check
    const ordersSignal = this.checkOrdersCompleted(delivery.deliveryOrders);
    signals.push(ordersSignal);
    checklist.push({
      id: 'orders_completed',
      label: 'Wszystkie zlecenia ukończone',
      checked: ordersSignal.status === 'ok',
      blocking: ordersSignal.status === 'blocking',
    });

    // 2. Pallet Validation Check
    const palletSignal = await this.checkPalletValidation(deliveryId, delivery.optimization);
    signals.push(palletSignal);
    checklist.push({
      id: 'pallet_validated',
      label: 'Palety zwalidowane',
      checked: palletSignal.status === 'ok',
      blocking: palletSignal.status === 'blocking',
    });

    // 3. Glass Delivered Check (wszystkie zlecenia)
    const glassSignal = this.checkAllGlassDelivered(delivery.deliveryOrders);
    signals.push(glassSignal);
    checklist.push({
      id: 'all_glass_delivered',
      label: 'Wszystkie szyby dostarczone',
      checked: glassSignal.status === 'ok',
      blocking: glassSignal.status === 'blocking',
    });

    // 4. Okuc Delivered Check (wszystkie zlecenia)
    const okucSignal = this.checkAllOkucDelivered(delivery.deliveryOrders);
    signals.push(okucSignal);
    checklist.push({
      id: 'all_okuc_delivered',
      label: 'Wszystkie okucia dostarczone',
      checked: okucSignal.status === 'ok',
      blocking: okucSignal.status === 'blocking',
    });

    // Agreguj wyniki
    const blocking = signals.filter((s) => s.status === 'blocking');
    const warnings = signals.filter((s) => s.status === 'warning');

    logger.info('Delivery ship readiness check completed', {
      deliveryId,
      ready: blocking.length === 0,
      blockingCount: blocking.length,
      warningCount: warnings.length,
    });

    return {
      ready: blocking.length === 0,
      blocking,
      warnings,
      checklist,
    };
  }

  // ============================================
  // PRIVATE CHECK METHODS
  // ============================================

  private async checkWarehouseStock(
    orderId: number,
    requirements: Array<{
      profileId: number;
      colorId: number;
      beamsCount: number;
      profile: { number: string };
      color: { code: string };
    }>
  ): Promise<ReadinessSignal> {
    // Sprawdź stan magazynowy dla każdego wymagania
    const shortages: string[] = [];

    for (const req of requirements) {
      const stock = await this.prisma.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId: req.profileId,
            colorId: req.colorId,
          },
        },
      });

      const available = stock?.currentStockBeams || 0;
      if (available < req.beamsCount) {
        shortages.push(
          `${req.profile.number} ${req.color.code}: brakuje ${req.beamsCount - available} szt.`
        );
      }
    }

    if (shortages.length > 0) {
      return {
        module: 'warehouse',
        requirement: 'sufficient_stock',
        status: 'blocking',
        message: `Brak profili na magazynie: ${shortages.slice(0, 3).join(', ')}${shortages.length > 3 ? ` (i ${shortages.length - 3} więcej)` : ''}`,
        actionRequired: 'Zamów brakujące profile lub poczekaj na dostawę',
        metadata: { shortages },
      };
    }

    return {
      module: 'warehouse',
      requirement: 'sufficient_stock',
      status: 'ok',
      message: 'Wszystkie profile dostępne na magazynie',
    };
  }

  private checkGlassStatus(order: {
    glassOrderStatus?: string | null;
    orderedGlassCount?: number | null;
    deliveredGlassCount?: number | null;
    totalGlasses?: number | null;
  }): ReadinessSignal {
    const status = order.glassOrderStatus || 'not_ordered';
    const ordered = order.orderedGlassCount || 0;
    const delivered = order.deliveredGlassCount || 0;
    const total = order.totalGlasses || 0;

    // Brak szyb w zleceniu
    if (total === 0) {
      return {
        module: 'glass',
        requirement: 'glass_delivered',
        status: 'ok',
        message: 'Zlecenie bez szyb',
      };
    }

    // Wszystkie dostarczone
    if (delivered >= total) {
      return {
        module: 'glass',
        requirement: 'glass_delivered',
        status: 'ok',
        message: `Wszystkie szyby dostarczone (${delivered}/${total})`,
      };
    }

    // Zamówione ale nie dostarczone
    if (ordered > 0 && status === 'ordered') {
      return {
        module: 'glass',
        requirement: 'glass_delivered',
        status: 'blocking',
        message: `Czekamy na dostawę szyb (${delivered}/${total})`,
        actionRequired: 'Poczekaj na dostawę szyb od dostawcy',
        metadata: { ordered, delivered, total },
      };
    }

    // Nie zamówione
    return {
      module: 'glass',
      requirement: 'glass_delivered',
      status: 'blocking',
      message: `Szyby nie zostały zamówione (0/${total})`,
      actionRequired: 'Zamów szyby u dostawcy',
      metadata: { ordered, delivered, total },
    };
  }

  private checkOkucStatus(order: {
    okucDemandStatus?: string | null;
    okucDemands?: Array<{ status: string }>;
  }): ReadinessSignal {
    const status = order.okucDemandStatus || 'none';

    // Brak zapotrzebowania na okucia
    if (status === 'none') {
      return {
        module: 'okuc',
        requirement: 'okuc_ready',
        status: 'ok',
        message: 'Brak zapotrzebowania na okucia',
      };
    }

    // Zaimportowane = gotowe
    if (status === 'imported') {
      return {
        module: 'okuc',
        requirement: 'okuc_ready',
        status: 'ok',
        message: 'Okucia zaimportowane i gotowe',
      };
    }

    // Są nietypowe okucia
    if (status === 'has_atypical') {
      return {
        module: 'okuc',
        requirement: 'okuc_ready',
        status: 'warning',
        message: 'Zlecenie zawiera nietypowe okucia',
        actionRequired: 'Sprawdź dostępność nietypowych okuć',
      };
    }

    // Czeka na zlecenie
    return {
      module: 'okuc',
      requirement: 'okuc_ready',
      status: 'blocking',
      message: 'Okucia nie zostały zamówione',
      actionRequired: 'Zamów okucia u dostawcy',
    };
  }

  private checkVariantType(order: {
    orderNumber: string;
    variantType?: string | null;
  }): ReadinessSignal | null {
    // Sprawdź czy to wariant (ma suffix literowy)
    const suffixMatch = order.orderNumber.match(/[-]?([a-zA-Z])$/);
    if (!suffixMatch) {
      return null; // Nie wariant, nie trzeba sprawdzać
    }

    if (!order.variantType) {
      return {
        module: 'variant',
        requirement: 'variant_type_set',
        status: 'blocking',
        message: `Zlecenie ${order.orderNumber} wymaga określenia typu wariantu`,
        actionRequired: 'Określ czy to korekta czy dodatkowy plik',
      };
    }

    return {
      module: 'variant',
      requirement: 'variant_type_set',
      status: 'ok',
      message: `Typ wariantu: ${order.variantType === 'correction' ? 'Korekta' : 'Dodatkowy plik'}`,
    };
  }

  private checkOrdersCompleted(
    deliveryOrders: Array<{ order: { status: string; orderNumber: string } }>
  ): ReadinessSignal {
    const incompleteOrders = deliveryOrders.filter((dO) => dO.order.status !== 'completed');

    if (incompleteOrders.length === 0) {
      return {
        module: 'approval',
        requirement: 'orders_completed',
        status: 'ok',
        message: 'Wszystkie zlecenia ukończone',
      };
    }

    const orderNumbers = incompleteOrders.map((dO) => dO.order.orderNumber);
    return {
      module: 'approval',
      requirement: 'orders_completed',
      status: 'blocking',
      message: `${incompleteOrders.length} zleceń nieukończonych: ${orderNumbers.slice(0, 3).join(', ')}${orderNumbers.length > 3 ? '...' : ''}`,
      actionRequired: 'Ukończ produkcję wszystkich zleceń',
      metadata: { incompleteOrders: orderNumbers },
    };
  }

  private async checkPalletValidation(
    deliveryId: number,
    optimization: { validationStatus?: string | null } | null
  ): Promise<ReadinessSignal> {
    // Brak optymalizacji - ostrzeżenie (legacy behavior)
    if (!optimization) {
      return {
        module: 'pallet',
        requirement: 'pallet_validated',
        status: 'warning',
        message: 'Brak optymalizacji palet',
        actionRequired: 'Wygeneruj optymalizację palet (opcjonalne)',
      };
    }

    const status = optimization.validationStatus || 'pending';

    if (status === 'valid') {
      return {
        module: 'pallet',
        requirement: 'pallet_validated',
        status: 'ok',
        message: 'Palety zwalidowane poprawnie',
      };
    }

    if (status === 'pending') {
      return {
        module: 'pallet',
        requirement: 'pallet_validated',
        status: 'warning',
        message: 'Palety oczekują na walidację',
        actionRequired: 'Wykonaj walidację palet przed wysyłką',
      };
    }

    // status === 'invalid'
    return {
      module: 'pallet',
      requirement: 'pallet_validated',
      status: 'blocking',
      message: 'Walidacja palet nie powiodła się',
      actionRequired: 'Napraw problemy z paletami i zwaliduj ponownie',
    };
  }

  private checkAllGlassDelivered(
    deliveryOrders: Array<{
      order: {
        orderNumber: string;
        totalGlasses?: number | null;
        deliveredGlassCount?: number | null;
      };
    }>
  ): ReadinessSignal {
    const ordersWithMissingGlass: string[] = [];

    for (const dO of deliveryOrders) {
      const total = dO.order.totalGlasses || 0;
      const delivered = dO.order.deliveredGlassCount || 0;

      if (total > 0 && delivered < total) {
        ordersWithMissingGlass.push(`${dO.order.orderNumber} (${delivered}/${total})`);
      }
    }

    if (ordersWithMissingGlass.length === 0) {
      return {
        module: 'glass',
        requirement: 'all_glass_delivered',
        status: 'ok',
        message: 'Wszystkie szyby dla dostawy dostarczone',
      };
    }

    return {
      module: 'glass',
      requirement: 'all_glass_delivered',
      status: 'blocking',
      message: `Brakuje szyb dla: ${ordersWithMissingGlass.slice(0, 3).join(', ')}${ordersWithMissingGlass.length > 3 ? '...' : ''}`,
      actionRequired: 'Poczekaj na dostawę szyb',
      metadata: { ordersWithMissingGlass },
    };
  }

  private checkAllOkucDelivered(
    deliveryOrders: Array<{
      order: {
        orderNumber: string;
        okucDemandStatus?: string | null;
      };
    }>
  ): ReadinessSignal {
    const ordersWithPendingOkuc: string[] = [];

    for (const dO of deliveryOrders) {
      const status = dO.order.okucDemandStatus || 'none';

      if (status === 'pending') {
        ordersWithPendingOkuc.push(dO.order.orderNumber);
      }
    }

    if (ordersWithPendingOkuc.length === 0) {
      return {
        module: 'okuc',
        requirement: 'all_okuc_delivered',
        status: 'ok',
        message: 'Wszystkie okucia dla dostawy gotowe',
      };
    }

    return {
      module: 'okuc',
      requirement: 'all_okuc_delivered',
      status: 'blocking',
      message: `Brakuje okuć dla: ${ordersWithPendingOkuc.slice(0, 3).join(', ')}${ordersWithPendingOkuc.length > 3 ? '...' : ''}`,
      actionRequired: 'Zamów brakujące okucia',
      metadata: { ordersWithPendingOkuc },
    };
  }
}
