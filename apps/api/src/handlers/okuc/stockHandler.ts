/**
 * OkucStock Handler - HTTP request handling for stock/inventory management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';
import { updateStockSchema } from '../../validators/okuc.js';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number;
  };
}

const repository = new OkucStockRepository(prisma);

export const okucStockHandler = {
  /**
   * GET /api/okuc/stock
   * List all stock with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { articleId, warehouseType, subWarehouse, belowMin } = request.query as {
        articleId?: string;
        warehouseType?: string;
        subWarehouse?: string;
        belowMin?: string;
      };

      const filters = {
        articleId: articleId ? parseInt(articleId, 10) : undefined,
        warehouseType,
        subWarehouse,
        belowMin: belowMin !== undefined ? belowMin === 'true' : undefined,
      };

      const stocks = await repository.findAll(filters);

      return reply.status(200).send(stocks);
    } catch (error) {
      logger.error('Failed to list stock', { error });
      return reply.status(500).send({ error: 'Failed to list stock' });
    }
  },

  /**
   * GET /api/okuc/stock/:id
   * Get stock by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid stock ID' });
      }

      const stock = await repository.findById(id);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to get stock by ID', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get stock' });
    }
  },

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Get stock by article ID and warehouse type
   * Query params: warehouseType, subWarehouse
   */
  async getByArticle(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    try {
      const articleId = parseInt(request.params.articleId, 10);
      if (isNaN(articleId)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { warehouseType, subWarehouse } = request.query as {
        warehouseType?: string;
        subWarehouse?: string;
      };
      if (!warehouseType) {
        return reply.status(400).send({ error: 'warehouseType is required' });
      }

      const stock = await repository.findByArticle(articleId, warehouseType, subWarehouse);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to get stock by article', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get stock' });
    }
  },

  /**
   * PATCH /api/okuc/stock/:id
   * Update stock quantity (with optimistic locking)
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid stock ID' });
      }

      const validated = updateStockSchema.parse(request.body);

      // Extract userId from auth (assuming it's in request.user)
      const userId = (request as AuthenticatedRequest).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      // Map validated data to Prisma fields
      const updateData: Partial<{ currentQuantity?: number; reservedQty?: number; minStock?: number; maxStock?: number; version?: number }> = {
        currentQuantity: validated.quantity,
        version: validated.expectedVersion,
      };

      const stock = await repository.update(id, updateData, userId);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found or version mismatch' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to update stock', { error, id: request.params.id });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to update stock' });
    }
  },

  /**
   * POST /api/okuc/stock/adjust
   * Adjust stock quantity (add/subtract)
   */
  async adjust(request: FastifyRequest<{ Body: { stockId: number; quantity: number; version: number } }>, reply: FastifyReply) {
    try {
      const { stockId, quantity, version } = request.body;

      if (!stockId || quantity === undefined || version === undefined) {
        return reply.status(400).send({ error: 'stockId, quantity, and version are required' });
      }

      // Extract userId from auth
      const userId = (request as AuthenticatedRequest).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      const stock = await repository.adjustQuantity(stockId, quantity, version, userId);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found or version mismatch' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to adjust stock', { error });
      return reply.status(500).send({ error: 'Failed to adjust stock' });
    }
  },

  /**
   * GET /api/okuc/stock/summary
   * Get stock summary grouped by warehouse
   */
  async summary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as {
        warehouseType?: string;
      };

      const summary = await repository.getSummary(warehouseType);

      return reply.status(200).send(summary);
    } catch (error) {
      logger.error('Failed to get stock summary', { error });
      return reply.status(500).send({ error: 'Failed to get stock summary' });
    }
  },

  /**
   * GET /api/okuc/stock/below-minimum
   * Get stock items below minimum level
   */
  async belowMinimum(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as {
        warehouseType?: string;
      };

      const stocks = await repository.findBelowMinimum(warehouseType);

      return reply.status(200).send(stocks);
    } catch (error) {
      logger.error('Failed to get stock below minimum', { error });
      return reply.status(500).send({ error: 'Failed to get stock below minimum' });
    }
  },

  /**
   * POST /api/okuc/stock/import/preview
   * Preview stock import from CSV file
   * Format: Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
   */
  async importPreview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku CSV' });
      }

      const buffer = await data.toBuffer();
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
          warehouseType: string;
          subWarehouse?: string;
          currentQuantity: number;
          minStock?: number;
          maxStock?: number;
        }>,
        conflicts: [] as Array<{
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
        }>,
        errors: [] as Array<{ row: number; error: string; articleId?: string }>,
      };

      // Parse CSV rows (skip header)
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

          // Parse warehouse type
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

          // Validate quantity
          if (isNaN(currentQuantity) || currentQuantity < 0) {
            results.errors.push({
              row: i + 1,
              error: 'Nieprawidlowa ilosc (musi byc liczba >= 0)',
              articleId,
            });
            continue;
          }

          // Parse subWarehouse
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
              subWarehouseValue = subWarehouse; // Keep as is if not empty
            }
          }

          // Check if article exists
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

          // Check if stock already exists
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
            // Conflict - stock already exists
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
            // New stock entry
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

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to preview stock CSV', { error });
      return reply.status(500).send({ error: 'Blad podgladu importu stanu' });
    }
  },

  /**
   * POST /api/okuc/stock/import
   * Import stock with conflict resolution
   */
  async importStock(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as {
        items: Array<{
          articleId: string;
          warehouseType: string;
          subWarehouse?: string;
          currentQuantity: number;
          minStock?: number;
          maxStock?: number;
        }>;
        conflictResolution: 'skip' | 'overwrite' | 'selective';
        selectedConflicts?: Array<{ articleId: string; warehouseType: string; subWarehouse?: string }>;
      };
      const { items, conflictResolution, selectedConflicts = [] } = body;

      if (!items || items.length === 0) {
        return reply.status(400).send({ error: 'Brak pozycji do importu' });
      }

      const userId = (request as AuthenticatedRequest).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Uzytkownik nie zalogowany' });
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ articleId: string; error: string }>,
      };

      for (const item of items) {
        try {
          // Validate required fields
          if (!item.articleId || !item.warehouseType || item.currentQuantity === undefined) {
            results.errors.push({
              articleId: item.articleId || 'UNKNOWN',
              error: 'Brak numeru artykulu, typu magazynu lub stanu',
            });
            continue;
          }

          // Find article
          const article = await prisma.okucArticle.findFirst({
            where: { articleId: item.articleId, deletedAt: null },
          });

          if (!article) {
            results.errors.push({
              articleId: item.articleId,
              error: 'Artykul nie istnieje',
            });
            continue;
          }

          // Check if stock exists
          const existingStock = await prisma.okucStock.findFirst({
            where: {
              articleId: article.id,
              warehouseType: item.warehouseType,
              subWarehouse: item.subWarehouse || null,
            },
          });

          if (existingStock) {
            // Handle conflict
            if (conflictResolution === 'skip') {
              results.skipped++;
              continue;
            } else if (conflictResolution === 'selective') {
              // Check if this conflict was selected
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
            // conflictResolution === 'overwrite' or selective with selection -> update

            await prisma.okucStock.update({
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
            // Create new stock entry
            await prisma.okucStock.create({
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

      logger.info('Stock import completed', results);

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to import stock', { error });
      return reply.status(500).send({ error: 'Blad importu stanu' });
    }
  },

  /**
   * GET /api/okuc/stock/export
   * Export stock to CSV (semicolon separated for Polish Excel)
   */
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType, belowMin } = request.query as {
        warehouseType?: string;
        belowMin?: string;
      };

      const filters = {
        warehouseType,
        belowMin: belowMin !== undefined ? belowMin === 'true' : undefined,
      };

      const stocks = await repository.findAll(filters);

      // Nagłówki CSV po polsku, separator średnik
      const headers = [
        'Numer artykulu',
        'Nazwa artykulu',
        'Magazyn',
        'Typ magazynu',
        'Podmagazyn',
        'Stan aktualny',
        'Zarezerwowane',
        'Dostepne',
        'Stan minimalny',
        'Stan maksymalny',
        'Ponizej minimum',
      ];

      const rows = stocks.map((stock) => {
        const article = stock.article;
        const location = (article as { location?: { name: string } | null }).location;
        const available = stock.currentQuantity - stock.reservedQty;
        const belowMinimum = stock.minStock !== null && stock.currentQuantity < stock.minStock;

        return [
          article.articleId,
          (article.name || '').replace(/;/g, ','),
          location?.name || '',
          stock.warehouseType === 'pvc' ? 'PVC' : 'ALU',
          stock.subWarehouse === 'production' ? 'Produkcja' :
            stock.subWarehouse === 'buffer' ? 'Bufor' :
            stock.subWarehouse === 'gabaraty' ? 'Gabaraty' : '',
          stock.currentQuantity,
          stock.reservedQty,
          available,
          stock.minStock ?? '',
          stock.maxStock ?? '',
          belowMinimum ? 'TAK' : 'NIE',
        ];
      });

      const csv = [
        headers.join(';'),
        ...rows.map((row) => row.join(';')),
      ].join('\n');

      // Generuj nazwę pliku z datą
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const filename = `stan-magazynu-okuc-${dateStr}.csv`;

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      // BOM dla poprawnego kodowania polskich znaków w Excel
      return reply.send('\uFEFF' + csv);
    } catch (error) {
      logger.error('Failed to export stock to CSV', { error });
      return reply.status(500).send({ error: 'Failed to export stock' });
    }
  },

  /**
   * GET /api/okuc/stock/history/:articleId
   * Get stock history for an article
   */
  async getHistory(
    request: FastifyRequest<{
      Params: { articleId: string };
      Querystring: {
        warehouseType?: string;
        subWarehouse?: string;
        eventType?: string;
        isManualEdit?: string;
        fromDate?: string;
        toDate?: string;
        recordedById?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const articleId = parseInt(request.params.articleId, 10);
      if (isNaN(articleId)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { warehouseType, subWarehouse, eventType, isManualEdit, fromDate, toDate, recordedById } = request.query;

      const filters = {
        articleId,
        warehouseType,
        subWarehouse,
        eventType,
        isManualEdit: isManualEdit !== undefined ? isManualEdit === 'true' : undefined,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        recordedById: recordedById ? parseInt(recordedById, 10) : undefined,
      };

      const history = await repository.getHistory(filters);

      return reply.status(200).send(history);
    } catch (error) {
      logger.error('Failed to get stock history', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get stock history' });
    }
  },
};
