import type { PrismaClient } from '@prisma/client';
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
   * UWAGA: Duplicate check przeniesiony do transakcji dla unikniecia race conditions
   */
  async importFromCsv(
    fileContent: string | Buffer,
    filename: string,
    deliveryDate?: Date
  ): Promise<GlassDeliveryWithItems> {
    const parsed = parseGlassDeliveryCsv(fileContent);
    const rackNumber = parsed.metadata.rackNumber || filename;

    // Use transaction with extended timeout for large imports (60s instead of default 5s)
    // WAZNE: Duplicate check MUSI byc w transakcji aby uniknac race condition
    return this.prisma.$transaction(
      async (tx) => {
        // Sprawdź czy dostawa z tym rackNumber już istnieje (W TRANSAKCJI!)
        // To zapobiega race condition przy równoczesnym imporcie tego samego pliku
        const existingDelivery = await tx.glassDelivery.findFirst({
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
   * Klucz: customerOrderNumber + orderNumber + wymiary + quantity + glassComposition
   *
   * UWAGA: customerOrderNumber i glassComposition są kluczowe dla aluminiowych szyb,
   * bo orderNumber to często tylko numer pozycji (np. "2")
   */
  private deduplicateCategorizedItems<T extends {
    customerOrderNumber: string;
    orderNumber: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    glassComposition: string;
  }>(items: T[], categoryName: string): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
      // Pełny klucz z customerOrderNumber i glassComposition
      const key = `${item.customerOrderNumber}|${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}|${item.glassComposition || ''}`;
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
   * Sprawdza czy szyba (kategoryzowana) już istnieje w bazie
   * Zwraca tylko te które NIE istnieją (nowe do zapisania)
   */
  private async filterExistingLooseGlasses<T extends {
    orderNumber: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    glassComposition: string;
  }>(tx: PrismaTx, items: T[]): Promise<T[]> {
    if (items.length === 0) return [];

    // Pobierz wszystkie istniejące szyby luzem (optymalizacja: pobierz raz)
    const existing = await tx.looseGlass.findMany({
      where: {
        orderNumber: { in: items.map(i => i.orderNumber) }
      },
      select: {
        orderNumber: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
        glassComposition: true,
      }
    });

    // Stwórz Set kluczy dla szybkiego lookup
    const existingKeys = new Set(
      existing.map(e => `${e.orderNumber}|${e.widthMm}|${e.heightMm}|${e.quantity}|${e.glassComposition || ''}`)
    );

    // Filtruj - zostaw tylko nowe
    const newItems = items.filter(item => {
      const key = `${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}|${item.glassComposition || ''}`;
      return !existingKeys.has(key);
    });

    if (newItems.length < items.length) {
      console.log(`[GlassDeliveryImportService] Pominięto ${items.length - newItems.length} szyb luzem (już istnieją w bazie)`);
    }

    return newItems;
  }

  /**
   * Sprawdza czy szyba aluminiowa już istnieje w bazie
   */
  private async filterExistingAluminumGlasses<T extends {
    orderNumber: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    glassComposition: string;
  }>(tx: PrismaTx, items: T[]): Promise<T[]> {
    if (items.length === 0) return [];

    const existing = await tx.aluminumGlass.findMany({
      where: {
        orderNumber: { in: items.map(i => i.orderNumber) }
      },
      select: {
        orderNumber: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
        glassComposition: true,
      }
    });

    const existingKeys = new Set(
      existing.map(e => `${e.orderNumber}|${e.widthMm}|${e.heightMm}|${e.quantity}|${e.glassComposition || ''}`)
    );

    const newItems = items.filter(item => {
      const key = `${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}|${item.glassComposition || ''}`;
      return !existingKeys.has(key);
    });

    if (newItems.length < items.length) {
      console.log(`[GlassDeliveryImportService] Pominięto ${items.length - newItems.length} szyb aluminiowych (już istnieją w bazie)`);
    }

    return newItems;
  }

  /**
   * Sprawdza czy szyba reklamacyjna już istnieje w bazie
   */
  private async filterExistingReclamationGlasses<T extends {
    orderNumber: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    glassComposition: string;
  }>(tx: PrismaTx, items: T[]): Promise<T[]> {
    if (items.length === 0) return [];

    const existing = await tx.reclamationGlass.findMany({
      where: {
        orderNumber: { in: items.map(i => i.orderNumber) }
      },
      select: {
        orderNumber: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
        glassComposition: true,
      }
    });

    const existingKeys = new Set(
      existing.map(e => `${e.orderNumber}|${e.widthMm}|${e.heightMm}|${e.quantity}|${e.glassComposition || ''}`)
    );

    const newItems = items.filter(item => {
      const key = `${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}|${item.glassComposition || ''}`;
      return !existingKeys.has(key);
    });

    if (newItems.length < items.length) {
      console.log(`[GlassDeliveryImportService] Pominięto ${items.length - newItems.length} szyb reklamacyjnych (już istnieją w bazie)`);
    }

    return newItems;
  }

  /**
   * Zapisuje skategoryzowane szyby do odpowiednich tabel
   * UWAGA: Sprawdza czy szyba już istnieje w bazie - zapobiega duplikatom między importami
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
    // Deduplikacja wewnątrz pliku CSV
    const uniqueLoose = this.deduplicateCategorizedItems(categorized.loose, 'loose');
    const uniqueAluminum = this.deduplicateCategorizedItems(categorized.aluminum, 'aluminum');
    const uniqueReclamation = this.deduplicateCategorizedItems(categorized.reclamation, 'reclamation');

    // Deduplikacja między importami - sprawdź co już jest w bazie
    const newLoose = await this.filterExistingLooseGlasses(tx, uniqueLoose);
    const newAluminum = await this.filterExistingAluminumGlasses(tx, uniqueAluminum);
    const newReclamation = await this.filterExistingReclamationGlasses(tx, uniqueReclamation);

    // Szyby luzem - tylko nowe
    if (newLoose.length > 0) {
      await tx.looseGlass.createMany({
        data: newLoose.map(item => ({
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

    // Szyby aluminiowe - tylko nowe
    if (newAluminum.length > 0) {
      await tx.aluminumGlass.createMany({
        data: newAluminum.map(item => ({
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

    // Szyby reklamacyjne - tylko nowe
    if (newReclamation.length > 0) {
      await tx.reclamationGlass.createMany({
        data: newReclamation.map(item => ({
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
