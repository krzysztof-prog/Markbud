import type { PrismaClient } from '@prisma/client';
import { parseGlassDeliveryCsv } from '../parsers/glass-delivery-csv-parser.js';
import { GlassDeliveryMatchingService } from './GlassDeliveryMatchingService.js';
import type { GlassDeliveryWithItems } from './types.js';

/**
 * Service responsible for importing glass deliveries from CSV files
 */
export class GlassDeliveryImportService {
  private matchingService: GlassDeliveryMatchingService;

  constructor(private prisma: PrismaClient) {
    this.matchingService = new GlassDeliveryMatchingService(prisma);
  }

  /**
   * Import glass delivery from CSV file content
   */
  async importFromCsv(
    fileContent: string,
    filename: string,
    deliveryDate?: Date
  ): Promise<GlassDeliveryWithItems> {
    const parsed = parseGlassDeliveryCsv(fileContent);

    // Use transaction with extended timeout for large imports (60s instead of default 5s)
    return this.prisma.$transaction(
      async (tx) => {
        // Create GlassDelivery with items
        const glassDelivery = await tx.glassDelivery.create({
          data: {
            rackNumber: parsed.metadata.rackNumber || filename,
            customerOrderNumber: parsed.metadata.customerOrderNumber,
            supplierOrderNumber: parsed.metadata.supplierOrderNumber || null,
            deliveryDate: deliveryDate || new Date(),
            items: {
              create: parsed.items.map((item) => ({
                orderNumber: item.orderNumber,
                orderSuffix: item.orderSuffix || null,
                position: String(item.position),
                widthMm: item.widthMm,
                heightMm: item.heightMm,
                quantity: item.quantity,
                glassComposition: item.glassComposition || null,
                serialNumber: item.serialNumber || null,
                clientCode: item.clientCode || null,
                matchStatus: 'pending',
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Match with orders (within transaction)
        await this.matchingService.matchWithOrdersTx(tx, glassDelivery.id);

        // Update glass delivery dates if orders are complete
        const deliveryItems = await tx.glassDeliveryItem.findMany({
          where: { glassDeliveryId: glassDelivery.id },
          select: { orderNumber: true },
          distinct: ['orderNumber'],
        });
        const orderNumbers = deliveryItems.map((item) => item.orderNumber);
        await this.matchingService.updateGlassDeliveryDateIfComplete(
          tx,
          orderNumbers,
          glassDelivery.deliveryDate
        );

        return glassDelivery;
      },
      {
        timeout: 60000, // 60 seconds timeout for large imports
        maxWait: 10000, // Max 10s waiting for transaction slot
      }
    );
  }
}
