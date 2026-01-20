import type { PrismaClient, Prisma } from '@prisma/client';
import { parseGlassDeliveryCsv } from '../parsers/glass-delivery-csv-parser.js';
import { GlassDeliveryMatchingService } from './GlassDeliveryMatchingService.js';
import type { GlassDeliveryWithItems } from './types.js';

// Typ transakcji Prisma
type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Service responsible for importing glass deliveries from CSV files
 */
export class GlassDeliveryImportService {
  private matchingService: GlassDeliveryMatchingService;

  constructor(private prisma: PrismaClient) {
    this.matchingService = new GlassDeliveryMatchingService(prisma);
  }

  /**
   * Deduplikuje items z CSV - usuwa duplikaty (ten sam orderNumber, position, wymiary, quantity)
   * Pliki CSV często mają zduplikowane wiersze
   */
  private deduplicateItems<T extends {
    orderNumber: string;
    position: number;
    widthMm: number;
    heightMm: number;
    quantity: number;
  }>(items: T[]): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
      const key = `${item.orderNumber}|${item.position}|${item.widthMm}|${item.heightMm}|${item.quantity}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    if (unique.length < items.length) {
      console.log(`[GlassDeliveryImportService] Usunięto ${items.length - unique.length} duplikatów z CSV`);
    }

    return unique;
  }

  /**
   * Import glass delivery from CSV file content
   * Akceptuje string (UTF-8) lub Buffer (CP1250 - automatycznie konwertowany)
   * @throws Error jeśli dostawa z tym samym rackNumber już istnieje
   */
  async importFromCsv(
    fileContent: string | Buffer,
    filename: string,
    deliveryDate?: Date
  ): Promise<GlassDeliveryWithItems> {
    const parsed = parseGlassDeliveryCsv(fileContent);

    // Sprawdź czy dostawa z tym rackNumber już istnieje (zapobieganie duplikatom)
    const rackNumber = parsed.metadata.rackNumber || filename;
    const existingDelivery = await this.prisma.glassDelivery.findFirst({
      where: { rackNumber },
      select: { id: true, createdAt: true }
    });

    if (existingDelivery) {
      const importDate = existingDelivery.createdAt.toLocaleDateString('pl-PL');
      throw new Error(
        `Dostawa z numerem racka "${rackNumber}" została już zaimportowana (${importDate}). ` +
        `Jeśli chcesz ponownie zaimportować, najpierw usuń poprzednią dostawę.`
      );
    }

    // Use transaction with extended timeout for large imports (60s instead of default 5s)
    return this.prisma.$transaction(
      async (tx) => {
        // Create GlassDelivery with items (tylko standardowe szyby)
        const standardItems = parsed.items.filter(item => item.category === 'standard');

        // Deduplikacja - usuń duplikaty z CSV (ten sam orderNumber, position, wymiary, quantity)
        const uniqueItems = this.deduplicateItems(standardItems);

        const glassDelivery = await tx.glassDelivery.create({
          data: {
            rackNumber: parsed.metadata.rackNumber || filename,
            customerOrderNumber: parsed.metadata.customerOrderNumber,
            supplierOrderNumber: parsed.metadata.supplierOrderNumber || null,
            deliveryDate: deliveryDate || new Date(),
            items: {
              create: uniqueItems.map((item) => ({
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
                // Nowe pola - per item (mogą różnić się od parent)
                customerOrderNumber: item.customerOrderNumber || null,
                rackNumber: item.rackNumber || null,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Zapisz skategoryzowane szyby do odpowiednich tabel
        await this.saveCategorizedGlasses(tx, glassDelivery.id, parsed.categorized);

        // Match with orders (within transaction) - tylko dla standardowych
        if (standardItems.length > 0) {
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
        }

        return glassDelivery;
      },
      {
        timeout: 60000, // 60 seconds timeout for large imports
        maxWait: 10000, // Max 10s waiting for transaction slot
      }
    );
  }

  /**
   * Deduplikuje kategoryzowane szyby (loose/aluminum/reclamation)
   * Klucz: orderNumber + wymiary + quantity
   */
  private deduplicateCategorizedItems<T extends {
    orderNumber: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
  }>(items: T[], categoryName: string): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
      const key = `${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    if (unique.length < items.length) {
      console.log(`[GlassDeliveryImportService] Usunięto ${items.length - unique.length} duplikatów ${categoryName}`);
    }

    return unique;
  }

  /**
   * Zapisuje skategoryzowane szyby do odpowiednich tabel
   */
  private async saveCategorizedGlasses(
    tx: PrismaTx,
    glassDeliveryId: number,
    categorized: {
      loose: Array<{
        customerOrderNumber: string;
        clientName: string | null;
        widthMm: number;
        heightMm: number;
        quantity: number;
        orderNumber: string;
        glassComposition: string;
      }>;
      aluminum: Array<{
        customerOrderNumber: string;
        clientName: string | null;
        widthMm: number;
        heightMm: number;
        quantity: number;
        orderNumber: string;
        glassComposition: string;
      }>;
      reclamation: Array<{
        customerOrderNumber: string;
        clientName: string | null;
        widthMm: number;
        heightMm: number;
        quantity: number;
        orderNumber: string;
        glassComposition: string;
      }>;
    }
  ): Promise<void> {
    // Deduplikacja przed zapisem
    const uniqueLoose = this.deduplicateCategorizedItems(categorized.loose, 'loose');
    const uniqueAluminum = this.deduplicateCategorizedItems(categorized.aluminum, 'aluminum');
    const uniqueReclamation = this.deduplicateCategorizedItems(categorized.reclamation, 'reclamation');

    // Szyby luzem
    if (uniqueLoose.length > 0) {
      await tx.looseGlass.createMany({
        data: uniqueLoose.map(item => ({
          glassDeliveryId,
          customerOrderNumber: item.customerOrderNumber,
          clientName: item.clientName,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          quantity: item.quantity,
          orderNumber: item.orderNumber,
          glassComposition: item.glassComposition || null
        }))
      });
    }

    // Szyby aluminiowe
    if (uniqueAluminum.length > 0) {
      await tx.aluminumGlass.createMany({
        data: uniqueAluminum.map(item => ({
          glassDeliveryId,
          customerOrderNumber: item.customerOrderNumber,
          clientName: item.clientName,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          quantity: item.quantity,
          orderNumber: item.orderNumber,
          glassComposition: item.glassComposition || null
        }))
      });
    }

    // Szyby reklamacyjne
    if (uniqueReclamation.length > 0) {
      await tx.reclamationGlass.createMany({
        data: uniqueReclamation.map(item => ({
          glassDeliveryId,
          customerOrderNumber: item.customerOrderNumber,
          clientName: item.clientName,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          quantity: item.quantity,
          orderNumber: item.orderNumber,
          glassComposition: item.glassComposition || null
        }))
      });
    }
  }
}
