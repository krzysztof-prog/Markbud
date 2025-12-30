/**
 * Import Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ImportService } from '../services/importService.js';
import {
  importParamsSchema,
  importQuerySchema,
  approveImportSchema,
  folderImportSchema,
  scanFolderQuerySchema,
  previewByFilepathQuerySchema,
  processImportSchema,
} from '../validators/import.js';
import { parseIntParam } from '../utils/errors.js';

export class ImportHandler {
  constructor(private service: ImportService) {}

  /**
   * POST /api/imports/upload - upload a file
   */
  async upload(
    request: FastifyRequest<{ Body: { file: Buffer } }>,
    reply: FastifyReply
  ) {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'Brak pliku' });
    }

    const filename = data.filename;
    const mimeType = data.mimetype;
    const buffer = await data.toBuffer();

    try {
      const result = await this.service.uploadFile(filename, buffer, mimeType);

      reply.status(201);

      if (result.autoImportStatus === 'success') {
        return {
          ...result.fileImport,
          autoImportStatus: result.autoImportStatus,
          result: result.result,
        };
      } else if (result.autoImportStatus) {
        return {
          ...result.fileImport,
          autoImportStatus: result.autoImportStatus,
          autoImportError: result.autoImportError,
        };
      }

      return result.fileImport;
    } catch (error) {
      if (error instanceof Error && error.message.includes('zbyt duzy')) {
        return reply.status(413).send({
          error: 'Plik jest zbyt duzy',
          details: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/imports - list imports with optional status filter
   */
  async getAll(
    request: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply
  ) {
    const validated = importQuerySchema.parse(request.query);
    const imports = await this.service.getAllImports(validated.status);
    return reply.send(imports);
  }

  /**
   * GET /api/imports/pending - get pending imports
   */
  async getPending(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const imports = await this.service.getPendingImports();
    return reply.send(imports);
  }

  /**
   * GET /api/imports/:id - get import by ID
   */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = importParamsSchema.parse(request.params);
    const fileImport = await this.service.getImportById(parseInt(id, 10));
    return reply.send(fileImport);
  }

  /**
   * GET /api/imports/:id/preview - preview file contents
   */
  async getPreview(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = importParamsSchema.parse(request.params);
    const preview = await this.service.getPreview(parseInt(id, 10));
    return reply.send(preview);
  }

  /**
   * POST /api/imports/:id/approve - approve and process import
   */
  async approve(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { action?: 'overwrite' | 'add_new'; replaceBase?: boolean };
    }>,
    reply: FastifyReply
  ) {
    const { id } = importParamsSchema.parse(request.params);
    const { action, replaceBase } = approveImportSchema.parse(request.body);

    const result = await this.service.approveImport(parseInt(id, 10), action, replaceBase);
    return reply.send(result);
  }

  /**
   * POST /api/imports/:id/reject - reject import
   */
  async reject(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = importParamsSchema.parse(request.params);
    const fileImport = await this.service.rejectImport(parseInt(id, 10));
    return reply.send(fileImport);
  }

  /**
   * DELETE /api/imports/:id - delete import and associated data
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = importParamsSchema.parse(request.params);
    await this.service.deleteImport(parseInt(id, 10));
    return reply.status(204).send();
  }

  /**
   * POST /api/imports/folder - import all CSV from folder with date in name
   */
  async importFolder(
    request: FastifyRequest<{
      Body: { folderPath: string; deliveryNumber: 'I' | 'II' | 'III'; userId?: number };
    }>,
    reply: FastifyReply
  ) {
    const validated = folderImportSchema.parse(request.body);
    // Use provided userId or default to 1 (system user)
    // TODO: Replace with actual authenticated user ID when auth is implemented
    const userId = validated.userId || 1;
    const result = await this.service.importFromFolder(validated.folderPath, validated.deliveryNumber, userId);
    return reply.status(200).send({ success: true, ...result });
  }

  /**
   * GET /api/imports/list-folders - list folders with dates in names
   */
  async listFolders(
    request: FastifyRequest<{ Querystring: { userId?: number } }>,
    reply: FastifyReply
  ) {
    const userId = request.query.userId;
    const result = await this.service.listFolders(userId);

    if ('error' in result && result.error === 'Folder bazowy nie istnieje') {
      return reply.status(404).send(result);
    }

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.send(result);
  }

  /**
   * GET /api/imports/scan-folder - scan folder and return info about CSV files
   */
  async scanFolder(
    request: FastifyRequest<{ Querystring: { folderPath: string; userId?: number } }>,
    reply: FastifyReply
  ) {
    const validated = scanFolderQuerySchema.parse(request.query);
    const userId = request.query.userId;
    const result = await this.service.scanFolder(validated.folderPath, userId);
    return reply.send(result);
  }

  /**
   * POST /api/imports/archive-folder - archive a folder to the archiwum subdirectory
   */
  async archiveFolder(
    request: FastifyRequest<{ Body: { folderPath: string; userId?: number } }>,
    reply: FastifyReply
  ) {
    const { folderPath, userId } = request.body;
    const archivedPath = await this.service.archiveFolder(folderPath, userId);
    return reply.send({ success: true, archivedPath });
  }

  /**
   * DELETE /api/imports/delete-folder - delete a folder permanently
   */
  async deleteFolder(
    request: FastifyRequest<{ Body: { folderPath: string; userId?: number } }>,
    reply: FastifyReply
  ) {
    const { folderPath, userId } = request.body;
    await this.service.deleteFolder(folderPath, userId);
    return reply.send({ success: true });
  }

  /**
   * GET /api/imports/preview - preview file by filepath with variant conflict detection
   */
  async previewByFilepath(
    request: FastifyRequest<{ Querystring: { filepath: string } }>,
    reply: FastifyReply
  ) {
    const validated = previewByFilepathQuerySchema.parse(request.query);
    const result = await this.service.previewByFilepath(validated.filepath);
    return reply.send(result);
  }

  /**
   * POST /api/imports/process - process import with optional variant resolution
   */
  async processImport(
    request: FastifyRequest<{
      Body: {
        filepath: string;
        deliveryNumber?: 'I' | 'II' | 'III';
        resolution?: {
          type: 'merge' | 'replace' | 'use_latest' | 'keep_both' | 'cancel';
          targetOrderNumber?: string;
          deleteOlder?: boolean;
        };
      };
    }>,
    reply: FastifyReply
  ) {
    const validated = processImportSchema.parse(request.body);
    const result = await this.service.processImport(
      validated.filepath,
      validated.deliveryNumber,
      validated.resolution
    );
    return reply.status(200).send(result);
  }

  /**
   * POST /api/imports/bulk - perform bulk action on multiple imports
   * Domyślna akcja dla PDF z błędem order_not_found: zapisz cenę do pending_order_prices
   */
  async bulkAction(
    request: FastifyRequest<{
      Body: { ids: number[]; action: 'approve' | 'reject' };
    }>,
    reply: FastifyReply
  ) {
    const { ids, action } = request.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: 'Brak ID do przetworzenia' });
    }

    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    for (const id of ids) {
      try {
        if (action === 'approve') {
          await this.service.approveImport(id, 'add_new');
          results.push({ id, success: true });
        } else if (action === 'reject') {
          await this.service.rejectImport(id);
          results.push({ id, success: true });
        }
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Nieznany błąd',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return reply.send({
      success: failCount === 0,
      summary: {
        total: ids.length,
        successCount,
        failCount,
      },
      results,
    });
  }
}
