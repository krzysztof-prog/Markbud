/**
 * OkucOrderImportService - Parsowanie i import zamówień OKUC z plików XLSX
 *
 * Format XLSX od dostawcy:
 * - Kolumna B: numer artykułu
 * - Kolumna C: opis artykułu
 * - Kolumna D: ilość i data wysyłki (np. "1 000 12.01.2026")
 * - Kolumna E: cena w EUR (np. "0,02 EUR")
 *
 * Business rules (decyzje użytkownika):
 * - Brakujące artykuły: pokazuj dialog z listą do akceptacji (opcja C)
 * - Każdy import = nowe zamówienie (opcja A)
 * - Cena z kolumny E aktualizuje OkucArticle.priceEur (opcja B)
 * - Data wysyłki + 1 dzień = expectedDeliveryDate (opcja A)
 * - Duplikaty artykułów = błąd (nie powinno się zdarzyć)
 */

import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import type { ImportOrderItem, ParsedOrderImport, ConfirmOrderImportInput } from '../../validators/okuc.js';

export class OkucOrderImportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parsuje plik XLSX i zwraca sparsowane dane wraz z listą brakujących artykułów
   */
  async parseXlsx(buffer: Buffer): Promise<ParsedOrderImport> {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS wymaga ArrayBuffer lub Buffer - użyj buffer.buffer dla kompatybilności
    await workbook.xlsx.load(buffer.buffer as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Plik XLSX nie zawiera żadnego arkusza');
    }

    const items: ImportOrderItem[] = [];
    const articleIds = new Set<string>();
    const duplicateArticles: string[] = [];
    const errors: string[] = [];

    // Iteruj po wierszach (pomijając nagłówek jeśli jest)
    let rowIndex = 0;
    worksheet.eachRow((row, rowNumber) => {
      rowIndex++;

      // Pomijamy pierwszy wiersz (nagłówek) lub puste wiersze
      if (rowNumber === 1) {
        const firstCell = row.getCell(2).text?.trim();
        // Sprawdź czy to nagłówek (nie jest liczbą)
        if (firstCell && !/^\d/.test(firstCell)) {
          return; // Pomijamy nagłówek
        }
      }

      // Kolumna B - numer artykułu
      const articleId = String(row.getCell(2).text || '').trim();
      if (!articleId) {
        return; // Pomijamy puste wiersze
      }

      // Sprawdź duplikaty
      if (articleIds.has(articleId)) {
        duplicateArticles.push(articleId);
      }
      articleIds.add(articleId);

      // Kolumna C - opis
      const description = String(row.getCell(3).text || '').trim();

      // Kolumna D - ilość i data wysyłki
      const colD = String(row.getCell(4).text || '').trim();
      const { quantity, shippingDate } = this.parseQuantityAndDate(colD, rowNumber);

      // Kolumna E - cena EUR
      const colE = String(row.getCell(5).text || '').trim();
      const priceEur = this.parsePriceEur(colE, rowNumber);

      if (quantity > 0 && shippingDate) {
        items.push({
          articleId,
          description: description || undefined,
          quantity,
          shippingDate,
          priceEur,
        });
      }
    });

    if (items.length === 0) {
      throw new Error('Plik XLSX nie zawiera żadnych poprawnych pozycji zamówienia');
    }

    // Sprawdź duplikaty - to jest błąd
    if (duplicateArticles.length > 0) {
      throw new Error(
        `Znaleziono duplikaty artykułów w pliku: ${duplicateArticles.join(', ')}. ` +
        'Każdy artykuł może wystąpić tylko raz w zamówieniu.'
      );
    }

    // Sprawdź które artykuły nie istnieją w bazie
    const existingArticles = await this.prisma.okucArticle.findMany({
      where: {
        articleId: { in: Array.from(articleIds) },
        deletedAt: null,
      },
      select: { articleId: true },
    });

    const existingIds = new Set(existingArticles.map((a) => a.articleId));
    const missingArticles = items
      .filter((item) => !existingIds.has(item.articleId))
      .map((item) => ({
        articleId: item.articleId,
        description: item.description,
      }));

    // Usuń duplikaty z listy brakujących
    const uniqueMissingArticles = Array.from(
      new Map(missingArticles.map((a) => [a.articleId, a])).values()
    );

    logger.info('Parsed OKUC order XLSX', {
      totalItems: items.length,
      missingArticles: uniqueMissingArticles.length,
    });

    return {
      items,
      missingArticles: uniqueMissingArticles,
      duplicateArticles: [],
    };
  }

  /**
   * Parsuje kolumnę D (ilość i data wysyłki)
   * Format: "1 000 12.01.2026" lub "1000 12.01.2026"
   */
  private parseQuantityAndDate(
    value: string,
    rowNumber: number
  ): { quantity: number; shippingDate: Date | null } {
    // Regex do wyciągnięcia liczby (może mieć spacje) i daty (DD.MM.YYYY)
    // Przykład: "1 000 12.01.2026"
    const dateMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) {
      logger.warn(`Wiersz ${rowNumber}: Nie znaleziono daty w kolumnie D: "${value}"`);
      return { quantity: 0, shippingDate: null };
    }

    const [, day, month, year] = dateMatch;
    const shippingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Wyciągnij ilość - wszystko przed datą
    const dateIndex = value.indexOf(dateMatch[0]);
    const quantityPart = value.substring(0, dateIndex).trim();

    // Usuń wszystkie spacje z ilości (format "1 000" -> "1000")
    const quantityStr = quantityPart.replace(/\s+/g, '');
    const quantity = parseInt(quantityStr, 10);

    if (isNaN(quantity) || quantity <= 0) {
      logger.warn(`Wiersz ${rowNumber}: Nieprawidłowa ilość w kolumnie D: "${quantityPart}"`);
      return { quantity: 0, shippingDate: null };
    }

    return { quantity, shippingDate };
  }

  /**
   * Parsuje kolumnę E (cena w EUR)
   * Format: "0,02 EUR" lub "0.02" lub "0,02"
   * Zwraca cenę w eurocentach (Int)
   */
  private parsePriceEur(value: string, rowNumber: number): number {
    // Usuń "EUR" i białe znaki
    let priceStr = value.replace(/EUR/gi, '').trim();

    // Zamień przecinek na kropkę (format europejski)
    priceStr = priceStr.replace(',', '.');

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      logger.warn(`Wiersz ${rowNumber}: Nieprawidłowa cena w kolumnie E: "${value}"`);
      return 0;
    }

    // Konwertuj na eurocenty (Int) - zaokrąglamy do najbliższego centa
    return Math.round(price * 100);
  }

  /**
   * Tworzy zamówienie po zatwierdzeniu przez użytkownika
   */
  async confirmImport(
    data: ConfirmOrderImportInput,
    userId: number
  ): Promise<{
    order: {
      id: number;
      orderNumber: string;
      itemsCount: number;
      expectedDeliveryDate: Date;
    };
    articlesCreated: number;
    pricesUpdated: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      let articlesCreated = 0;
      let pricesUpdated = 0;

      // 1. Utwórz brakujące artykuły jeśli użytkownik zatwierdził
      if (data.createMissingArticles && data.missingArticlesToCreate?.length) {
        for (const article of data.missingArticlesToCreate) {
          await tx.okucArticle.create({
            data: {
              articleId: article.articleId,
              name: article.name,
              usedInPvc: true, // Domyślnie PVC
              usedInAlu: false,
              orderClass: 'typical',
              sizeClass: 'standard',
              orderUnit: 'piece',
              leadTimeDays: 14,
              safetyDays: 3,
            },
          });
          articlesCreated++;
        }
        logger.info(`Created ${articlesCreated} missing articles`);
      }

      // 2. Pobierz ID artykułów z bazy
      const articleIds = data.items.map((item) => item.articleId);
      const articles = await tx.okucArticle.findMany({
        where: {
          articleId: { in: articleIds },
          deletedAt: null,
        },
        select: { id: true, articleId: true, priceEur: true },
      });

      const articleMap = new Map(articles.map((a) => [a.articleId, a]));

      // Sprawdź czy wszystkie artykuły istnieją
      const missingIds = articleIds.filter((id) => !articleMap.has(id));
      if (missingIds.length > 0) {
        throw new Error(
          `Nie znaleziono artykułów: ${missingIds.join(', ')}. ` +
          'Upewnij się, że zatwierdziłeś utworzenie brakujących artykułów.'
        );
      }

      // 3. Aktualizuj ceny artykułów
      for (const item of data.items) {
        const article = articleMap.get(item.articleId);
        if (article && item.priceEur > 0) {
          // Aktualizuj cenę jeśli się zmieniła
          if (article.priceEur !== item.priceEur) {
            await tx.okucArticle.update({
              where: { id: article.id },
              data: { priceEur: item.priceEur },
            });
            pricesUpdated++;
          }
        }
      }

      // 4. Generuj numer zamówienia
      const now = new Date();
      const year = now.getFullYear();
      const count = await tx.okucOrder.count({
        where: {
          createdAt: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });
      const orderNumber = `OKUC-${year}-${String(count + 1).padStart(4, '0')}`;

      // 5. Określ status zamówienia na podstawie daty dostawy
      // expectedDeliveryDate = shippingDate + 1 dzień
      const status = this.calculateOrderStatus(data.expectedDeliveryDate);

      // 6. Utwórz zamówienie
      const order = await tx.okucOrder.create({
        data: {
          orderNumber,
          basketType: 'typical_standard', // Domyślny typ koszyka
          status,
          expectedDeliveryDate: data.expectedDeliveryDate,
          createdById: userId,
          items: {
            create: data.items.map((item) => ({
              articleId: articleMap.get(item.articleId)!.id,
              orderedQty: item.quantity,
              unitPrice: item.priceEur,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      logger.info('Created OKUC order from import', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
        articlesCreated,
        pricesUpdated,
      });

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          itemsCount: order.items.length,
          expectedDeliveryDate: data.expectedDeliveryDate,
        },
        articlesCreated,
        pricesUpdated,
      };
    });
  }

  /**
   * Oblicza status zamówienia na podstawie daty dostawy
   */
  private calculateOrderStatus(expectedDeliveryDate: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deliveryDate = new Date(
      expectedDeliveryDate.getFullYear(),
      expectedDeliveryDate.getMonth(),
      expectedDeliveryDate.getDate()
    );

    // Jeśli dostawa już była lub jest dzisiaj - status 'in_transit'
    if (deliveryDate <= today) {
      return 'in_transit';
    }

    // Jeśli dostawa w ciągu 3 dni - 'confirmed'
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    if (deliveryDate <= threeDaysFromNow) {
      return 'confirmed';
    }

    // W przeciwnym razie - 'sent' (wysłano)
    return 'sent';
  }
}
