/**
 * OkucStockService - Business logic layer for stock/inventory management
 * Przeniesiono logike biznesowa z stockHandler.ts
 */

import { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';
import { ArticleReplacementService } from './ArticleReplacementService.js';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

// Typy dla importu
interface ImportStockItem {
  articleId: string;
  warehouseType: string;
  subWarehouse?: string;
  currentQuantity: number;
  minStock?: number;
  maxStock?: number;
}

interface ImportPreviewResult {
  new: Array<{
    articleId: string;
    warehouseType: string;
    subWarehouse?: string;
    currentQuantity: number;
    minStock?: number;
    maxStock?: number;
  }>;
  conflicts: Array<{
    articleId: string;
    warehouseType: string;
    subWarehouse?: string;
    existingData: {
      currentQuantity: number;
      minStock: number | null;
      maxStock: number | null;
    };
    newData: {
      currentQuantity: number;
      minStock?: number;
      maxStock?: number;
    };
  }>;
  errors: Array<{ row: number; error: string; articleId?: string }>;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ articleId: string; error: string }>;
}

interface SelectedConflict {
  articleId: string;
  warehouseType: string;
  subWarehouse?: string;
}

export class OkucStockService {
  private replacementService: ArticleReplacementService;

  constructor(private repository: OkucStockRepository) {
    this.replacementService = new ArticleReplacementService();
  }

  /**
   * Sprawdź i automatycznie przenieś zapotrzebowanie gdy stan artykułu = 0
   * Wywoływane po każdej zmianie stanu magazynowego
   */
  private async checkAndAutoTransfer(articleId: number): Promise<void> {
    try {
      const result = await this.replacementService.checkAndTransferIfStockZero(articleId);
      if (result && result.transferred > 0) {
        logger.info('Auto-transferred demand after stock change', {
          articleId,
          transferred: result.transferred,
        });
      }
    } catch (error) {
      // Nie przerywaj operacji głównej - tylko loguj błąd
      logger.warn('Failed to check auto-transfer', { articleId, error });
    }
  }

  /**
   * Pobierz liste wszystkich stanow magazynowych z opcjonalnymi filtrami
   */
  async getAllStock(filters: {
    articleId?: number;
    warehouseType?: string;
    subWarehouse?: string;
    belowMin?: boolean;
  }) {
    return this.repository.findAll(filters);
  }

  /**
   * Pobierz stan magazynowy po ID
   */
  async getStockById(id: number) {
    const stock = await this.repository.findById(id);
    if (!stock) {
      throw new NotFoundError('Stock');
    }
    return stock;
  }

  /**
   * Pobierz stan magazynowy po artykule
   */
  async getStockByArticle(articleId: number, warehouseType: string, subWarehouse?: string) {
    const stock = await this.repository.findByArticle(articleId, warehouseType, subWarehouse);
    if (!stock) {
      throw new NotFoundError('Stock');
    }
    return stock;
  }

  /**
   * Zaktualizuj stan magazynowy (z optimistic locking)
   */
  async updateStock(
    id: number,
    data: { quantity?: number; expectedVersion?: number },
    userId: number
  ) {
    const updateData: Partial<{ currentQuantity?: number; reservedQty?: number; minStock?: number; maxStock?: number; version?: number }> = {
      currentQuantity: data.quantity,
      version: data.expectedVersion,
    };

    const stock = await this.repository.update(id, updateData, userId);
    if (!stock) {
      throw new NotFoundError('Stock not found or version mismatch');
    }

    // Auto-transfer zapotrzebowania jeśli stan = 0 i artykuł jest wygaszany
    await this.checkAndAutoTransfer(stock.articleId);

    return stock;
  }

  /**
   * Koryguj ilosc na stanie (dodaj/odejmij)
   */
  async adjustStockQuantity(stockId: number, quantity: number, version: number, userId: number) {
    const stock = await this.repository.adjustQuantity(stockId, quantity, version, userId);
    if (!stock) {
      throw new NotFoundError('Stock not found or version mismatch');
    }

    // Auto-transfer zapotrzebowania jeśli stan = 0 i artykuł jest wygaszany
    await this.checkAndAutoTransfer(stock.articleId);

    return stock;
  }

  /**
   * Pobierz podsumowanie stanow magazynowych pogrupowane po magazynie
   */
  async getStockSummary(warehouseType?: string) {
    return this.repository.getSummary(warehouseType);
  }

  /**
   * Pobierz pozycje ponizej minimalnego stanu
   */
  async getStockBelowMinimum(warehouseType?: string) {
    return this.repository.findBelowMinimum(warehouseType);
  }

  /**
   * Podglad importu CSV - parsuj i wykryj konflikty
   * Format: Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
   */
  async previewImport(csvContent: string): Promise<ImportPreviewResult> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new ValidationError('Plik CSV jest pusty lub zawiera tylko naglowek');
    }

    const results: ImportPreviewResult = {
      new: [],
      conflicts: [],
      errors: [],
    };

    // Parsuj wiersze CSV (pomin naglowek)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());

      try {
        // Format: Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
        if (values.length < 4) {
          results.errors.push({
            row: i + 1,
            error: 'Nieprawidlowa liczba kolumn (oczekiwano min. 4)',
            articleId: values[0] || undefined,
          });
          continue;
        }

        const articleId = values[0];
        const warehouseTypeRaw = values[1]?.toLowerCase().trim();
        const subWarehouse = values[2]?.trim();
        const currentQuantity = parseInt(values[3], 10);
        const minStock = values[4] ? parseInt(values[4], 10) : undefined;
        const maxStock = values[5] ? parseInt(values[5], 10) : undefined;

        if (!articleId) {
          results.errors.push({
            row: i + 1,
            error: 'Brak numeru artykulu',
          });
          continue;
        }

        // Parsuj typ magazynu
        let warehouseType: string;
        if (warehouseTypeRaw === 'pvc') {
          warehouseType = 'pvc';
        } else if (warehouseTypeRaw === 'alu') {
          warehouseType = 'alu';
        } else {
          results.errors.push({
            row: i + 1,
            error: `Nieprawidlowy typ magazynu: ${warehouseTypeRaw} (oczekiwano: PVC lub ALU)`,
            articleId,
          });
          continue;
        }

        // Waliduj ilosc
        if (isNaN(currentQuantity) || currentQuantity < 0) {
          results.errors.push({
            row: i + 1,
            error: 'Nieprawidlowa ilosc (musi byc liczba >= 0)',
            articleId,
          });
          continue;
        }

        // Parsuj podmagazyn
        let subWarehouseValue: string | undefined;
        if (subWarehouse) {
          const lower = subWarehouse.toLowerCase();
          if (lower === 'produkcja') {
            subWarehouseValue = 'production';
          } else if (lower === 'bufor') {
            subWarehouseValue = 'buffer';
          } else if (lower === 'gabaraty') {
            subWarehouseValue = 'gabaraty';
          } else if (lower !== '') {
            subWarehouseValue = subWarehouse; // Zachowaj jak jest jesli niepuste
          }
        }

        // Sprawdz czy artykul istnieje
        const article = await prisma.okucArticle.findFirst({
          where: { articleId, deletedAt: null },
        });

        if (!article) {
          results.errors.push({
            row: i + 1,
            error: 'Artykul nie istnieje w bazie',
            articleId,
          });
          continue;
        }

        // Sprawdz czy stan magazynowy juz istnieje
        const existingStock = await prisma.okucStock.findFirst({
          where: {
            articleId: article.id,
            warehouseType,
            subWarehouse: subWarehouseValue || null,
          },
        });

        const newData = {
          articleId,
          warehouseType,
          subWarehouse: subWarehouseValue,
          currentQuantity,
          minStock,
          maxStock,
        };

        if (existingStock) {
          // Konflikt - stan juz istnieje
          results.conflicts.push({
            articleId,
            warehouseType,
            subWarehouse: subWarehouseValue,
            existingData: {
              currentQuantity: existingStock.currentQuantity,
              minStock: existingStock.minStock,
              maxStock: existingStock.maxStock,
            },
            newData: {
              currentQuantity,
              minStock,
              maxStock,
            },
          });
        } else {
          // Nowa pozycja stanu
          results.new.push(newData);
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Nieznany blad',
          articleId: values[0] || undefined,
        });
      }
    }

    logger.info('Stock import preview completed', {
      new: results.new.length,
      conflicts: results.conflicts.length,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Importuj stany magazynowe z rozwiazywaniem konfliktow
   * Cala operacja wykonywana w transakcji dla unikniecia race conditions
   */
  async importStock(
    items: ImportStockItem[],
    conflictResolution: 'skip' | 'overwrite' | 'selective',
    selectedConflicts: SelectedConflict[] = [],
    userId: number
  ): Promise<ImportResult> {
    if (!items || items.length === 0) {
      throw new ValidationError('Brak pozycji do importu');
    }

    const results: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Wykonaj caly import w transakcji aby uniknac race conditions
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        try {
          // Walidacja wymaganych pol
          if (!item.articleId || !item.warehouseType || item.currentQuantity === undefined) {
            results.errors.push({
              articleId: item.articleId || 'UNKNOWN',
              error: 'Brak numeru artykulu, typu magazynu lub stanu',
            });
            continue;
          }

          // Znajdz artykul
          const article = await tx.okucArticle.findFirst({
            where: { articleId: item.articleId, deletedAt: null },
          });

          if (!article) {
            results.errors.push({
              articleId: item.articleId,
              error: 'Artykul nie istnieje',
            });
            continue;
          }

          // Uzyj upsert zamiast check-then-update dla unikniecia race condition
          const existingStock = await tx.okucStock.findFirst({
            where: {
              articleId: article.id,
              warehouseType: item.warehouseType,
              subWarehouse: item.subWarehouse || null,
            },
          });

          if (existingStock) {
            // Obsluz konflikt
            if (conflictResolution === 'skip') {
              results.skipped++;
              continue;
            } else if (conflictResolution === 'selective') {
              // Sprawdz czy ten konflikt zostal wybrany
              const isSelected = selectedConflicts.some(
                (c) =>
                  c.articleId === item.articleId &&
                  c.warehouseType === item.warehouseType &&
                  (c.subWarehouse || null) === (item.subWarehouse || null)
              );
              if (!isSelected) {
                results.skipped++;
                continue;
              }
            }
            // conflictResolution === 'overwrite' lub selective z wyborem -> aktualizuj

            await tx.okucStock.update({
              where: { id: existingStock.id },
              data: {
                currentQuantity: item.currentQuantity,
                minStock: item.minStock ?? existingStock.minStock,
                maxStock: item.maxStock ?? existingStock.maxStock,
                version: { increment: 1 },
                updatedById: userId,
              },
            });

            results.imported++;
          } else {
            // Stworz nowa pozycje stanu
            await tx.okucStock.create({
              data: {
                articleId: article.id,
                warehouseType: item.warehouseType,
                subWarehouse: item.subWarehouse || null,
                currentQuantity: item.currentQuantity,
                reservedQty: 0,
                minStock: item.minStock || null,
                maxStock: item.maxStock || null,
                version: 0,
                updatedById: userId,
              },
            });

            results.imported++;
          }
        } catch (error) {
          results.errors.push({
            articleId: item.articleId || 'UNKNOWN',
            error: error instanceof Error ? error.message : 'Nieznany blad',
          });
          logger.warn('Failed to import stock item', { articleId: item.articleId, error });
        }
      }
    }, {
      timeout: 60000, // 60s timeout dla duzych importow
    });

    logger.info('Stock import completed', { imported: results.imported, skipped: results.skipped, errors: results.errors.length });
    return results;
  }

  /**
   * Eksportuj stany magazynowe do CSV
   */
  async exportStockToCsv(filters: { warehouseType?: string; belowMin?: boolean }): Promise<string> {
    const stocks = await this.repository.findAll(filters);

    // Naglowki CSV po polsku, separator srednik
    const headers = [
      'Numer artykulu',
      'Nazwa artykulu',
      'Magazyn',
      'Typ magazynu',
      'Podmagazyn',
      'Stan aktualny',
      'Stan poczatkowy',
      'Zuzycie od remanentu',
      'Ilosc niepewna',
      'Zarezerwowane',
      'Dostepne',
      'Stan minimalny',
      'Stan maksymalny',
      'Ponizej minimum',
    ];

    const rows = stocks.map((stock) => {
      const article = stock.article;
      if (!article) {
        return null; // Pomiń rekordy bez artykułu
      }
      const location = (article as { location?: { name: string } | null }).location;
      const available = stock.currentQuantity - stock.reservedQty;
      const belowMinimum = stock.minStock !== null && stock.currentQuantity < stock.minStock;
      // Zuzycie od remanentu = stan poczatkowy - stan aktualny (jesli stan poczatkowy jest ustawiony)
      const consumedSinceInitial = stock.initialQuantity !== null
        ? stock.initialQuantity - stock.currentQuantity
        : null;

      return [
        article.articleId,
        (article.name || '').replace(/;/g, ','),
        location?.name || '',
        stock.warehouseType === 'pvc' ? 'PVC' : 'ALU',
        stock.subWarehouse === 'production' ? 'Produkcja' :
          stock.subWarehouse === 'buffer' ? 'Bufor' :
            stock.subWarehouse === 'gabaraty' ? 'Gabaraty' : '',
        stock.currentQuantity,
        stock.initialQuantity ?? '',
        consumedSinceInitial ?? '',
        stock.isQuantityUncertain ? 'TAK' : 'NIE',
        stock.reservedQty,
        available,
        stock.minStock ?? '',
        stock.maxStock ?? '',
        belowMinimum ? 'TAK' : 'NIE',
      ];
    });

    const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);

    const csv = [
      headers.join(';'),
      ...validRows.map((row) => row.join(';')),
    ].join('\n');

    return csv;
  }

  /**
   * Pobierz historie zmian stanu dla artykulu
   */
  async getStockHistory(filters: {
    articleId: number;
    warehouseType?: string;
    subWarehouse?: string;
    eventType?: string;
    isManualEdit?: boolean;
    fromDate?: Date;
    toDate?: Date;
    recordedById?: number;
  }) {
    return this.repository.getHistory(filters);
  }
}
