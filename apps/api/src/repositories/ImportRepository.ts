/**
 * Import Repository - Database access layer
 */

import { PrismaClient, FileImport } from '@prisma/client';

export interface ImportFilters {
  status?: string;
}

export interface CreateImportData {
  filename: string;
  filepath: string;
  fileType: string;
  status?: string;
  metadata?: string;
}

export interface UpdateImportData {
  status?: string;
  processedAt?: Date;
  metadata?: string;
  errorMessage?: string;
}

export class ImportRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: ImportFilters = {}): Promise<FileImport[]> {
    const where: Record<string, unknown> = {
      deletedAt: null, // Wyklucz soft-deleted
    };

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.fileImport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<FileImport | null> {
    return this.prisma.fileImport.findUnique({
      where: { id },
    });
  }

  async findPending(): Promise<FileImport[]> {
    return this.prisma.fileImport.findMany({
      where: {
        status: 'pending',
        deletedAt: null, // Wyklucz soft-deleted
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateImportData): Promise<FileImport> {
    return this.prisma.fileImport.create({
      data: {
        filename: data.filename,
        filepath: data.filepath,
        fileType: data.fileType,
        status: data.status || 'pending',
        metadata: data.metadata,
      },
    });
  }

  async update(id: number, data: UpdateImportData): Promise<FileImport> {
    return this.prisma.fileImport.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    // Soft delete - ustawienie deletedAt zamiast trwałego usunięcia
    await this.prisma.fileImport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findDuplicatePdfImport(orderId: number, excludeId: number): Promise<FileImport | null> {
    return this.prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        id: { not: excludeId },
        metadata: { contains: `"orderId":${orderId}` },
      },
    });
  }

  // Order-related operations
  async findOrderByNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
    });
  }

  /**
   * Szuka zlecenia po numerze z fallbackiem na prefix match
   * Np. "53614" znajdzie "53614-a" gdy dokładny match nie istnieje
   */
  async findOrderByNumberWithPrefix(orderNumber: string) {
    // Najpierw dokładny match
    const exact = await this.prisma.order.findUnique({
      where: { orderNumber },
    });
    if (exact) return exact;

    // Fallback: prefix match (np. 53614 -> 53614-a)
    return this.prisma.order.findFirst({
      where: {
        orderNumber: { startsWith: orderNumber },
      },
      orderBy: { orderNumber: 'asc' },
    });
  }

  async findOrderById(orderId: number) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });
  }

  async deleteOrder(orderId: number): Promise<void> {
    // Soft delete - archiwizacja zlecenia zamiast trwałego usunięcia
    await this.prisma.order.update({
      where: { id: orderId },
      data: { archivedAt: new Date() },
    });
  }

  // Delivery-related operations
  async findDeliveryByDateAndNumber(deliveryDate: Date, deliveryNumber: string) {
    return this.prisma.delivery.findFirst({
      where: {
        deliveryDate: {
          gte: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()),
          lt: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate() + 1),
        },
        deliveryNumber,
      },
    });
  }

  async createDelivery(deliveryDate: Date, deliveryNumber: string) {
    return this.prisma.delivery.create({
      data: {
        deliveryDate,
        deliveryNumber,
        status: 'planned',
      },
    });
  }

  async findDeliveryById(deliveryId: number) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
  }

  async findExistingDeliveryOrder(deliveryId: number, orderId: number) {
    return this.prisma.deliveryOrder.findUnique({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });
  }

  async getMaxDeliveryOrderPosition(deliveryId: number): Promise<number> {
    const result = await this.prisma.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true },
    });
    return result._max.position || 0;
  }

  async addOrderToDelivery(deliveryId: number, orderId: number, position: number) {
    return this.prisma.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position,
      },
    });
  }

  async findDeliveriesOnDate(date: Date) {
    return this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
      select: { id: true, deliveryNumber: true },
    });
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  }

  // Add order to delivery if not already linked (for File Watcher imports)
  async addOrderToDeliveryIfNotExists(deliveryId: number, orderId: number): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      console.warn(`   Dostawa ID ${deliveryId} nie istnieje, pominieto dodanie do dostawy`);
      return;
    }

    const existingDeliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });

    if (!existingDeliveryOrder) {
      const maxPosition = await this.getMaxDeliveryOrderPosition(deliveryId);

      await this.addOrderToDelivery(deliveryId, orderId, maxPosition + 1);

      console.log(`   Dodano zlecenie do dostawy ID: ${deliveryId}`);
    }
  }

  // Transaction wrapper for complex operations
  async executeTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      timeout: 60000, // 60 seconds timeout for large imports
      maxWait: 10000, // Max 10s waiting for transaction slot
    });
  }

  /**
   * Find if order is already assigned to any delivery (different from excludeDeliveryId)
   * Returns delivery info if found, null otherwise
   */
  async findOrderInOtherDelivery(orderId: number, excludeDeliveryId?: number) {
    const where: Record<string, unknown> = { orderId };
    if (excludeDeliveryId) {
      where.deliveryId = { not: excludeDeliveryId };
    }

    return this.prisma.deliveryOrder.findFirst({
      where,
      include: {
        delivery: {
          select: {
            id: true,
            deliveryDate: true,
            deliveryNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find order by order number (for duplicate check)
   */
  async findOrderByOrderNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        deliveryOrders: {
          include: {
            delivery: {
              select: {
                id: true,
                deliveryDate: true,
                deliveryNumber: true,
              },
            },
          },
        },
      },
    });
  }
}
