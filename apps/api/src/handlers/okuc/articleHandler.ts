/**
 * OkucArticle Handler - HTTP request handling for article management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import {
  createArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '../../validators/okuc.js';

const repository = new OkucArticleRepository(prisma);

export const okucArticleHandler = {
  /**
   * GET /api/okuc/articles
   * List all articles with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { usedInPvc, usedInAlu, orderClass, sizeClass, isActive } = request.query as {
        usedInPvc?: string;
        usedInAlu?: string;
        orderClass?: string;
        sizeClass?: string;
        isActive?: string;
      };

      const filters = {
        usedInPvc: usedInPvc !== undefined ? usedInPvc === 'true' : undefined,
        usedInAlu: usedInAlu !== undefined ? usedInAlu === 'true' : undefined,
        orderClass,
        sizeClass,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const articles = await repository.findAll(filters);

      return reply.status(200).send(articles);
    } catch (error) {
      logger.error('Failed to list articles', { error });
      return reply.status(500).send({ error: 'Failed to list articles' });
    }
  },

  /**
   * GET /api/okuc/articles/:id
   * Get article by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const article = await repository.findById(id);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to get article by ID', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get article' });
    }
  },

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Get article by articleId (e.g., "A123")
   */
  async getByArticleId(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    try {
      const { articleId } = request.params;

      const article = await repository.findByArticleId(articleId);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to get article by articleId', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get article' });
    }
  },

  /**
   * POST /api/okuc/articles
   * Create a new article
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const validated = createArticleSchema.parse(request.body);

      const article = await repository.create(validated as CreateArticleInput);

      return reply.status(201).send(article);
    } catch (error) {
      logger.error('Failed to create article', { error });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to create article' });
    }
  },

  /**
   * PATCH /api/okuc/articles/:id
   * Update an article
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const validated = updateArticleSchema.parse(request.body);

      const article = await repository.update(id, validated as UpdateArticleInput);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to update article', { error, id: request.params.id });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to update article' });
    }
  },

  /**
   * DELETE /api/okuc/articles/:id
   * Delete an article
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const deleted = await repository.delete(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      logger.error('Failed to delete article', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to delete article' });
    }
  },

  /**
   * POST /api/okuc/articles/:id/aliases
   * Add an alias to an article
   */
  async addAlias(request: FastifyRequest<{ Params: { id: string }; Body: { aliasNumber: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { aliasNumber } = request.body;
      if (!aliasNumber || typeof aliasNumber !== 'string') {
        return reply.status(400).send({ error: 'aliasNumber is required' });
      }

      const alias = await repository.addAlias(id, aliasNumber);

      return reply.status(201).send(alias);
    } catch (error) {
      logger.error('Failed to add alias', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to add alias' });
    }
  },

  /**
   * GET /api/okuc/articles/:id/aliases
   * Get all aliases for an article
   */
  async getAliases(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const aliases = await repository.getAliases(id);

      return reply.status(200).send(aliases);
    } catch (error) {
      logger.error('Failed to get aliases', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get aliases' });
    }
  },

  /**
   * POST /api/okuc/articles/import/preview
   * Preview CSV import - parse and detect conflicts
   * Format CSV: Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
   */
  async importPreview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku CSV' });
      }

      const buffer = await data.toBuffer();
      // Support both UTF-8 and Windows-1250 encoding
      let csvContent = buffer.toString('utf-8');
      // Remove BOM if present
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }

      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return reply.status(400).send({ error: 'Plik CSV jest pusty lub zawiera tylko naglowek' });
      }

      const results = {
        new: [] as Array<{
          articleId: string;
          name: string;
          usedInPvc: boolean;
          usedInAlu: boolean;
          orderClass: 'typical' | 'atypical';
          sizeClass: 'standard' | 'gabarat';
          warehouseType: string;
        }>,
        conflicts: [] as Array<{
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
        }>,
        errors: [] as Array<{ row: number; error: string; articleId?: string }>,
      };

      // Parse CSV rows (skip header)
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

          // Parse boolean fields - "Tak"/"Nie" or "true"/"false"
          const parseBool = (val: string): boolean => {
            const lower = val?.toLowerCase().trim();
            return lower === 'tak' || lower === 'true' || lower === '1';
          };

          const usedInPvc = parseBool(values[2]);
          const usedInAlu = parseBool(values[3]);

          // Parse order class - "Typowy"/"Atypowy" or "typical"/"atypical"
          const parseOrderClass = (val: string): 'typical' | 'atypical' => {
            const lower = val?.toLowerCase().trim();
            if (lower === 'atypowy' || lower === 'atypical') return 'atypical';
            return 'typical';
          };

          // Parse size class - "Standard"/"Gabarat" or "standard"/"gabarat"
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

          // Check if article already exists
          const existing = await repository.findByArticleId(articleId);

          if (existing) {
            // Conflict - article already exists
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
            // New article
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

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to preview articles CSV', { error });
      return reply.status(500).send({ error: 'Blad podgladu importu artykulu' });
    }
  },

  /**
   * POST /api/okuc/articles/import
   * Import articles with conflict resolution
   */
  async importArticles(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Wyodrebnij dane z body (walidowane przez schema w route)
      const body = request.body as {
        items: Array<{
          articleId: string;
          name: string;
          usedInPvc?: boolean;
          usedInAlu?: boolean;
          orderClass?: 'typical' | 'atypical';
          sizeClass?: 'standard' | 'gabarat';
          warehouseType?: string;
        }>;
        conflictResolution: 'skip' | 'overwrite' | 'selective';
        selectedConflicts?: string[];
      };
      const { items, conflictResolution, selectedConflicts = [] } = body;

      if (!items || items.length === 0) {
        return reply.status(400).send({ error: 'Brak artykulow do importu' });
      }

      // Pobierz wszystkie lokalizacje do mapowania nazw na ID
      const locations = await prisma.okucLocation.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      });
      const locationMap = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ articleId: string; error: string }>,
      };

      for (const item of items) {
        try {
          // Validate required fields
          if (!item.articleId || !item.name) {
            results.errors.push({
              articleId: item.articleId || 'UNKNOWN',
              error: 'Brak numeru artykulu lub nazwy',
            });
            continue;
          }

          // Znajdź locationId po nazwie magazynu (jeśli podano)
          let locationId: number | null = null;
          if (item.warehouseType) {
            const foundLocationId = locationMap.get(item.warehouseType.toLowerCase());
            if (foundLocationId) {
              locationId = foundLocationId;
            }
          }

          // Check if article exists
          const existing = await repository.findByArticleId(item.articleId);

          if (existing) {
            // Handle conflict based on resolution strategy
            if (conflictResolution === 'skip') {
              results.skipped++;
              continue;
            } else if (conflictResolution === 'selective') {
              // Only overwrite if explicitly selected
              if (!selectedConflicts.includes(item.articleId)) {
                results.skipped++;
                continue;
              }
            }
            // conflictResolution === 'overwrite' or selective with selection -> update

            await repository.update(existing.id, {
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
            // Create new article
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

            await repository.create(createData);
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

      logger.info('Import completed', results);

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to import articles', { error });
      return reply.status(500).send({ error: 'Blad importu artykulow' });
    }
  },

  /**
   * @deprecated Use importPreview and importArticles instead
   * POST /api/okuc/articles/import (legacy - CSV file upload)
   * Import articles from CSV file
   */
  async importCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku CSV' });
      }

      const buffer = await data.toBuffer();
      const csvContent = buffer.toString('utf-8');

      // Parse CSV - format: articleId,name,description,usedInPvc,usedInAlu,orderClass,sizeClass,orderUnit,packagingSizes,preferredSize,supplierCode,leadTimeDays,safetyDays
      const lines = csvContent.split('\n').filter(line => line.trim());
      // Skip header row
      const _headers = lines[0].split(',').map(h => h.trim());

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string; articleId?: string }>,
      };

      // Process each row (skip header)
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

          // Validate with Zod
          const validated = createArticleSchema.parse(articleData);

          // Check if article already exists
          const existing = await repository.findByArticleId(validated.articleId);

          if (existing) {
            // Update existing article
            await repository.update(existing.id, validated);
          } else {
            // Create new article
            await repository.create(validated as CreateArticleInput);
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

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to import articles CSV', { error });
      return reply.status(500).send({ error: 'Failed to import articles' });
    }
  },

  /**
   * GET /api/okuc/articles/pending-review
   * List all articles awaiting orderClass verification
   */
  async listPendingReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const articles = await prisma.okucArticle.findMany({
        where: {
          orderClass: 'pending_review',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.status(200).send(articles);
    } catch (error) {
      logger.error('Failed to list pending review articles', { error });
      return reply.status(500).send({ error: 'Failed to list pending review articles' });
    }
  },

  /**
   * POST /api/okuc/articles/batch-update-order-class
   * Update orderClass for multiple articles at once
   * Body: { articles: [{ id: number, orderClass: 'typical' | 'atypical' }] }
   */
  async batchUpdateOrderClass(
    request: FastifyRequest<{
      Body: { articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }> };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { articles } = request.body;

      if (!articles || !Array.isArray(articles) || articles.length === 0) {
        return reply.status(400).send({ error: 'Brak artykulow do aktualizacji' });
      }

      const results = {
        updated: 0,
        failed: 0,
        errors: [] as Array<{ id: number; error: string }>,
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

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to batch update orderClass', { error });
      return reply.status(500).send({ error: 'Failed to batch update orderClass' });
    }
  },

  /**
   * GET /api/okuc/articles/export
   * Export articles to CSV file
   */
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as { warehouseType?: 'pvc' | 'alu' };

      const filters = warehouseType === 'pvc'
        ? { usedInPvc: true }
        : warehouseType === 'alu'
        ? { usedInAlu: true }
        : {};

      const articles = await repository.findAll(filters);

      // Generate CSV with semicolon separator (Polish Excel compatibility)
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
        (article.description || '').replace(/;/g, ','), // Escape semicolons in description
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
        'TAK', // isActive is always true for non-deleted articles
        (article as { location?: { name: string } | null }).location?.name || '',
      ]);

      const csv = [
        headers.join(';'),
        ...rows.map(row => row.join(';')),
      ].join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `okuc_articles_${warehouseType || 'all'}_${timestamp}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    } catch (error) {
      logger.error('Failed to export articles CSV', { error });
      return reply.status(500).send({ error: 'Failed to export articles' });
    }
  },
};
