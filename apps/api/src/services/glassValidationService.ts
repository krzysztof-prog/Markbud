import { PrismaClient } from '@prisma/client';

export class GlassValidationService {
  constructor(private prisma: PrismaClient) {}

  async getDashboard() {
    // Get all unresolved validations for stats
    const allValidations = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
    });

    // Get recent issues with full details
    const recentIssues = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = {
      total: allValidations.length,
      errors: allValidations.filter((v) => v.severity === 'error').length,
      warnings: allValidations.filter((v) => v.severity === 'warning').length,
      info: allValidations.filter((v) => v.severity === 'info').length,
      byType: {} as Record<string, number>,
    };

    allValidations.forEach((v) => {
      stats.byType[v.validationType] = (stats.byType[v.validationType] || 0) + 1;
    });

    return {
      stats,
      recentIssues,
    };
  }

  async getByOrderNumber(orderNumber: string) {
    return this.prisma.glassOrderValidation.findMany({
      where: { orderNumber },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: number, resolvedBy: string, notes?: string) {
    return this.prisma.glassOrderValidation.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        details: notes ? JSON.stringify({ notes }) : undefined,
      },
    });
  }

  async findAll(filters?: { severity?: string; resolved?: boolean }) {
    return this.prisma.glassOrderValidation.findMany({
      where: {
        severity: filters?.severity,
        resolved: filters?.resolved,
      },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Pobiera szczegółowe rozbieżności szyb dla zlecenia
   * Zwraca: zamówione szyby, dostarczone szyby, porównanie per wymiar
   */
  async getDetailedDiscrepancies(orderNumber: string) {
    // Pobierz zamówione szyby (GlassOrderItem)
    const orderedItems = await this.prisma.glassOrderItem.findMany({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        orderSuffix: true,
        position: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
        glassType: true, // glassComposition nie istnieje w GlassOrderItem
      },
    });

    // Pobierz dostarczone szyby (GlassDeliveryItem) z info o dostawie
    const deliveredItems = await this.prisma.glassDeliveryItem.findMany({
      where: { orderNumber },
      include: {
        glassDelivery: {
          select: {
            id: true,
            deliveryDate: true,
            rackNumber: true,
            customerOrderNumber: true,
          },
        },
      },
    });

    // Grupuj zamówione wg wymiaru
    const orderedByDimension = new Map<
      string,
      { widthMm: number; heightMm: number; quantity: number; positions: string[]; glassType: string | null }
    >();
    for (const item of orderedItems) {
      const key = `${item.widthMm}x${item.heightMm}`;
      const existing = orderedByDimension.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.positions.push(`poz.${item.position}`);
      } else {
        orderedByDimension.set(key, {
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          quantity: item.quantity,
          positions: [`poz.${item.position}`],
          glassType: item.glassType,
        });
      }
    }

    // Grupuj dostarczone wg wymiaru z info o dostawach
    const deliveredByDimension = new Map<
      string,
      {
        widthMm: number;
        heightMm: number;
        quantity: number;
        deliveries: { deliveryId: number; deliveryDate: Date; rackNumber: string | null; quantity: number }[];
        matchStatus: string;
      }
    >();
    for (const item of deliveredItems) {
      const key = `${item.widthMm}x${item.heightMm}`;
      const existing = deliveredByDimension.get(key);
      const deliveryInfo = {
        deliveryId: item.glassDelivery?.id || 0,
        deliveryDate: item.glassDelivery?.deliveryDate || new Date(),
        rackNumber: item.glassDelivery?.rackNumber || null,
        quantity: item.quantity,
      };

      if (existing) {
        existing.quantity += item.quantity;
        // Dodaj do istniejącej dostawy lub stwórz nową
        const existingDelivery = existing.deliveries.find((d) => d.deliveryId === deliveryInfo.deliveryId);
        if (existingDelivery) {
          existingDelivery.quantity += item.quantity;
        } else {
          existing.deliveries.push(deliveryInfo);
        }
      } else {
        deliveredByDimension.set(key, {
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          quantity: item.quantity,
          deliveries: [deliveryInfo],
          matchStatus: item.matchStatus,
        });
      }
    }

    // Porównaj i wylicz różnice
    const allDimensions = new Set([...orderedByDimension.keys(), ...deliveredByDimension.keys()]);
    const comparison: {
      dimension: string;
      widthMm: number;
      heightMm: number;
      ordered: number;
      delivered: number;
      difference: number;
      status: 'ok' | 'surplus' | 'shortage' | 'missing' | 'extra';
      orderedPositions: string[];
      deliveries: { deliveryId: number; deliveryDate: Date; rackNumber: string | null; quantity: number }[];
      glassType: string | null;
    }[] = [];

    for (const dim of allDimensions) {
      const ordered = orderedByDimension.get(dim);
      const delivered = deliveredByDimension.get(dim);

      const orderedQty = ordered?.quantity || 0;
      const deliveredQty = delivered?.quantity || 0;
      const difference = deliveredQty - orderedQty;

      let status: 'ok' | 'surplus' | 'shortage' | 'missing' | 'extra';
      if (difference === 0) {
        status = 'ok';
      } else if (difference > 0) {
        status = orderedQty === 0 ? 'extra' : 'surplus'; // extra = nie zamówiono w ogóle
      } else {
        status = deliveredQty === 0 ? 'missing' : 'shortage'; // missing = w ogóle nie dostarczono
      }

      const [w, h] = dim.split('x').map(Number);

      comparison.push({
        dimension: dim,
        widthMm: w,
        heightMm: h,
        ordered: orderedQty,
        delivered: deliveredQty,
        difference,
        status,
        orderedPositions: ordered?.positions || [],
        deliveries: delivered?.deliveries || [],
        glassType: ordered?.glassType || null,
      });
    }

    // Sortuj: najpierw problemy (surplus/shortage/missing/extra), potem ok
    comparison.sort((a, b) => {
      const statusOrder = { missing: 0, shortage: 1, extra: 2, surplus: 3, ok: 4 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    // Podsumowanie
    const totalOrdered = orderedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalDelivered = deliveredItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      orderNumber,
      summary: {
        totalOrdered,
        totalDelivered,
        difference: totalDelivered - totalOrdered,
        status: totalDelivered > totalOrdered ? 'surplus' : totalDelivered < totalOrdered ? 'shortage' : 'ok',
      },
      comparison,
      // Zwróć też listę unikalnych dostaw
      deliveries: [...new Set(deliveredItems.map((d) => d.glassDelivery?.id).filter(Boolean))].map((id) => {
        const delivery = deliveredItems.find((d) => d.glassDelivery?.id === id)?.glassDelivery;
        return {
          id,
          deliveryDate: delivery?.deliveryDate,
          rackNumber: delivery?.rackNumber,
          customerOrderNumber: delivery?.customerOrderNumber,
        };
      }),
    };
  }
}
