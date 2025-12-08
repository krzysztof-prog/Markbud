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
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.fileImport.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
      where: { status: 'pending' },
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
    await this.prisma.fileImport.delete({
      where: { id },
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

  async findOrderById(orderId: number) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });
  }

  async deleteOrder(orderId: number): Promise<void> {
    await this.prisma.order.delete({
      where: { id: orderId },
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

  // Transaction wrapper for complex operations
  async executeTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
