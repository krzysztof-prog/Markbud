/**
 * OkucArticleService - Business logic layer for article management
 * Przeniesiono logike biznesowa z articleHandler.ts
 */

import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import {
  createArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '../../validators/okuc.js';

// Typy dla importu
interface ImportArticleItem {
  articleId: string;
  name: string;
  usedInPvc?: boolean;
  usedInAlu?: boolean;
  orderClass?: 'typical' | 'atypical';
  sizeClass?: 'standard' | 'gabarat';
  warehouseType?: string;
}

interface ImportPreviewResult {
  new: Array<{
    articleId: string;
    name: string;
    usedInPvc: boolean;
    usedInAlu: boolean;
    orderClass: 'typical' | 'atypical';
    sizeClass: 'standard' | 'gabarat';
    warehouseType: string;
  }>;
  conflicts: Array<{
    articleId: string;
    existingData: {
      name: string;
      usedInPvc: boolean;
      usedInAlu: boolean;
      orderClass: string;
      sizeClass: string;
    };
    newData: {
      name: string;
      usedInPvc: boolean;
      usedInAlu: boolean;
      orderClass: string;
      sizeClass: string;
      warehouseType: string;
    };
  }>;
  errors: Array<{ row: number; error: string; articleId?: string }>;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ articleId: string; error: string }>;
}

interface BatchUpdateResult {
  updated: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}

export class OkucArticleService {
  constructor(private repository: OkucArticleRepository) {}

  /**
   * Pobierz liste wszystkich artykulow z opcjonalnymi filtrami
   */
  async getAllArticles(filters: {
    usedInPvc?: boolean;
    usedInAlu?: boolean;
    orderClass?: string;
    sizeClass?: string;
    isActive?: boolean;
  }) {
    return this.repository.findAll(filters);
  }

  /**
   * Pobierz artykul po ID
   */
  async getArticleById(id: number) {
    const article = await this.repository.findById(id);
    if (!article) {
      throw new NotFoundError('Article');
    }
    return article;
  }

  /**
   * Pobierz artykul po articleId (np. "A123")
   */
  async getArticleByArticleId(articleId: string) {
    const article = await this.repository.findByArticleId(articleId);
    if (!article) {
      throw new NotFoundError('Article');
    }
    return article;
  }

  /**
   * Stworz nowy artykul
   */
  async createArticle(data: CreateArticleInput) {
    const validated = createArticleSchema.parse(data);
    return this.repository.create(validated as CreateArticleInput);
  }

  /**
   * Zaktualizuj artykul
   */
  async updateArticle(id: number, data: UpdateArticleInput) {
    const article = await this.repository.update(id, data);
    if (!article) {
      throw new NotFoundError('Article');
    }
    return article;
  }

  /**
   * Usun artykul
   */
  async deleteArticle(id: number) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Article');
    }
    return deleted;
  }

  /**
   * Dodaj alias do artykulu
   */
  async addAlias(articleId: number, aliasNumber: string) {
    // Sprawdz czy artykul istnieje
    const article = await this.repository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article');
    }
    return this.repository.addAlias(articleId, aliasNumber);
  }

  /**
   * Pobierz aliasy dla artykulu
   */
  async getAliases(articleId: number) {
    return this.repository.getAliases(articleId);
  }

  /**
   * Podglad importu CSV - parsuj i wykryj konflikty
   * Format CSV: Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
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
        // Format: Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
        if (values.length < 6) {
          results.errors.push({
            row: i + 1,
            error: 'Nieprawidlowa liczba kolumn (oczekiwano min. 6)',
            articleId: values[0] || undefined,
          });
          continue;
        }

        const articleId = values[0];
        const name = values[1];

        if (!articleId || !name) {
          results.errors.push({
            row: i + 1,
            error: 'Brak numeru artykulu lub nazwy',
            articleId: articleId || undefined,
          });
          continue;
        }

        // Parsuj pola boolean - "Tak"/"Nie" lub "true"/"false"
        const parseBool = (val: string): boolean => {
          const lower = val?.toLowerCase().trim();
          return lower === 'tak' || lower === 'true' || lower === '1';
        };

        const usedInPvc = parseBool(values[2]);
        const usedInAlu = parseBool(values[3]);

        // Parsuj order class - "Typowy"/"Atypowy" lub "typical"/"atypical"
        const parseOrderClass = (val: string): 'typical' | 'atypical' => {
          const lower = val?.toLowerCase().trim();
          if (lower === 'atypowy' || lower === 'atypical') return 'atypical';
          return 'typical';
        };

        // Parsuj size class - "Standard"/"Gabarat" lub "standard"/"gabarat"
        const parseSizeClass = (val: string): 'standard' | 'gabarat' => {
          const lower = val?.toLowerCase().trim();
          if (lower === 'gabarat' || lower === 'gabaryt') return 'gabarat';
          return 'standard';
        };

        const orderClass = parseOrderClass(values[4]);
        const sizeClass = parseSizeClass(values[5]);
        const warehouseType = values[6]?.trim() || '';

        const newData = {
          articleId,
          name,
          usedInPvc,
          usedInAlu,
          orderClass,
          sizeClass,
          warehouseType,
        };

        // Sprawdz czy artykul juz istnieje
        const existing = await this.repository.findByArticleId(articleId);

        if (existing) {
          // Konflikt - artykul juz istnieje
          results.conflicts.push({
            articleId,
            existingData: {
              name: existing.name,
              usedInPvc: existing.usedInPvc,
              usedInAlu: existing.usedInAlu,
              orderClass: existing.orderClass,
              sizeClass: existing.sizeClass,
            },
            newData,
          });
        } else {
          // Nowy artykul
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

    logger.info('Import preview completed', {
      new: results.new.length,
      conflicts: results.conflicts.length,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Importuj artykuly z rozwiazywaniem konfliktow
   */
  async importArticles(
    items: ImportArticleItem[],
    conflictResolution: 'skip' | 'overwrite' | 'selective',
    selectedConflicts: string[] = []
  ): Promise<ImportResult> {
    if (!items || items.length === 0) {
      throw new ValidationError('Brak artykulow do importu');
    }

    // Pobierz wszystkie lokalizacje do mapowania nazw na ID
    const locations = await prisma.okucLocation.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

    const results: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const item of items) {
      try {
        // Walidacja wymaganych pol
        if (!item.articleId || !item.name) {
          results.errors.push({
            articleId: item.articleId || 'UNKNOWN',
            error: 'Brak numeru artykulu lub nazwy',
          });
          continue;
        }

        // Znajdz locationId po nazwie magazynu (jesli podano)
        let locationId: number | null = null;
        if (item.warehouseType) {
          const foundLocationId = locationMap.get(item.warehouseType.toLowerCase());
          if (foundLocationId) {
            locationId = foundLocationId;
          }
        }

        // Sprawdz czy artykul istnieje
        const existing = await this.repository.findByArticleId(item.articleId);

        if (existing) {
          // Obsluz konflikt na podstawie strategii rozwiazywania
          if (conflictResolution === 'skip') {
            results.skipped++;
            continue;
          } else if (conflictResolution === 'selective') {
            // Nadpisz tylko jesli jawnie wybrano
            if (!selectedConflicts.includes(item.articleId)) {
              results.skipped++;
              continue;
            }
          }
          // conflictResolution === 'overwrite' lub selective z wyborem -> aktualizuj

          await this.repository.update(existing.id, {
            name: item.name,
            usedInPvc: item.usedInPvc ?? existing.usedInPvc,
            usedInAlu: item.usedInAlu ?? existing.usedInAlu,
            orderClass: item.orderClass ?? existing.orderClass,
            sizeClass: item.sizeClass ?? existing.sizeClass,
            ...(locationId
              ? { location: { connect: { id: locationId } } }
              : existing.locationId
                ? { location: { connect: { id: existing.locationId } } }
                : {}),
          });

          results.imported++;
        } else {
          // Stworz nowy artykul
          const articleData = createArticleSchema.parse({
            articleId: item.articleId,
            name: item.name,
            usedInPvc: item.usedInPvc ?? false,
            usedInAlu: item.usedInAlu ?? false,
            orderClass: item.orderClass ?? 'typical',
            sizeClass: item.sizeClass ?? 'standard',
          });

          // Dodaj locationId do danych tworzenia
          const createData = {
            ...articleData,
            locationId,
          } as CreateArticleInput;

          await this.repository.create(createData);
          results.imported++;
        }
      } catch (error) {
        results.errors.push({
          articleId: item.articleId || 'UNKNOWN',
          error: error instanceof Error ? error.message : 'Nieznany blad',
        });
        logger.warn('Failed to import article', { articleId: item.articleId, error });
      }
    }

    logger.info('Import completed', { imported: results.imported, skipped: results.skipped, errors: results.errors.length });
    return results;
  }

  /**
   * Pobierz artykuly oczekujace na weryfikacje orderClass
   */
  async getArticlesPendingReview() {
    return prisma.okucArticle.findMany({
      where: {
        orderClass: 'pending_review',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Zbiorowa aktualizacja orderClass dla wielu artykulow
   */
  async batchUpdateOrderClass(
    articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }>
  ): Promise<BatchUpdateResult> {
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      throw new ValidationError('Brak artykulow do aktualizacji');
    }

    const results: BatchUpdateResult = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Aktualizuj kazdy artykul
    for (const item of articles) {
      try {
        if (!item.id || !['typical', 'atypical'].includes(item.orderClass)) {
          results.failed++;
          results.errors.push({ id: item.id, error: 'Nieprawidlowe dane' });
          continue;
        }

        await prisma.okucArticle.update({
          where: { id: item.id },
          data: { orderClass: item.orderClass },
        });

        results.updated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(`Batch update orderClass: ${results.updated} updated, ${results.failed} failed`);
    return results;
  }

  /**
   * Eksportuj artykuly do CSV
   */
  async exportArticlesToCsv(warehouseType?: 'pvc' | 'alu'): Promise<string> {
    const filters = warehouseType === 'pvc'
      ? { usedInPvc: true }
      : warehouseType === 'alu'
        ? { usedInAlu: true }
        : {};

    const articles = await this.repository.findAll(filters);

    // Generuj CSV z separatorem srednika (kompatybilnosc z polskim Excel)
    const headers = [
      'Numer artykulu',
      'Nazwa',
      'Opis',
      'PVC',
      'ALU',
      'Typ zamowienia',
      'Klasa wielkosci',
      'Jednostka',
      'Opakowania',
      'Preferowane opakowanie',
      'Kod dostawcy',
      'Czas dostawy dni',
      'Dni zapasu',
      'Aktywny',
      'Magazyn',
    ];

    const rows = articles.map(article => [
      article.articleId,
      article.name,
      (article.description || '').replace(/;/g, ','), // Escape srednikikow w opisie
      article.usedInPvc ? 'TAK' : 'NIE',
      article.usedInAlu ? 'TAK' : 'NIE',
      article.orderClass === 'typical' ? 'typowy' : 'atypowy',
      article.sizeClass === 'standard' ? 'standard' : 'gabarat',
      article.orderUnit === 'piece' ? 'sztuka' : 'paczka',
      article.packagingSizes || '',
      article.preferredSize || '',
      article.supplierCode || '',
      article.leadTimeDays,
      article.safetyDays,
      'TAK', // isActive jest zawsze true dla nieusuniętych artykulow
      (article as { location?: { name: string } | null }).location?.name || '',
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    return csv;
  }

  /**
   * Legacy import CSV (deprecated)
   * @deprecated Uzyj previewImport i importArticles zamiast tego
   */
  async importCsvLegacy(csvContent: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; articleId?: string }>;
  }> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    // Pomin naglowek
    const _headers = lines[0].split(',').map(h => h.trim());

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; articleId?: string }>,
    };

    // Przetwarzaj kazdy wiersz (pomin naglowek)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      try {
        const articleData = {
          articleId: values[0],
          name: values[1],
          description: values[2] || undefined,
          usedInPvc: values[3]?.toLowerCase() === 'true',
          usedInAlu: values[4]?.toLowerCase() === 'true',
          orderClass: values[5] as 'typical' | 'atypical',
          sizeClass: values[6] as 'standard' | 'gabarat',
          orderUnit: values[7] as 'piece' | 'pack',
          packagingSizes: values[8] || undefined,
          preferredSize: values[9] ? parseInt(values[9], 10) : undefined,
          supplierCode: values[10] || undefined,
          leadTimeDays: values[11] ? parseInt(values[11], 10) : 14,
          safetyDays: values[12] ? parseInt(values[12], 10) : 3,
        };

        // Waliduj z Zod
        const validated = createArticleSchema.parse(articleData);

        // Sprawdz czy artykul juz istnieje
        const existing = await this.repository.findByArticleId(validated.articleId);

        if (existing) {
          // Aktualizuj istniejacy artykul
          await this.repository.update(existing.id, validated);
        } else {
          // Stworz nowy artykul
          await this.repository.create(validated as CreateArticleInput);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          articleId: values[0],
        });
        logger.warn('Failed to import article row', { row: i + 1, error, values });
      }
    }

    return results;
  }
}
