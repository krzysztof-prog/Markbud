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
    const buffer = await data.toBuffer();

    try {
      const result = await this.service.uploadFile(filename, buffer);

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
      Body: { folderPath: string; deliveryNumber: 'I' | 'II' | 'III' };
    }>,
    reply: FastifyReply
  ) {
    const validated = folderImportSchema.parse(request.body);
    const result = await this.service.importFromFolder(validated.folderPath, validated.deliveryNumber);
    return reply.status(200).send({ success: true, ...result });
  }

  /**
   * GET /api/imports/list-folders - list folders with dates in names
   */
  async listFolders(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const result = await this.service.listFolders();

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
    request: FastifyRequest<{ Querystring: { folderPath: string } }>,
    reply: FastifyReply
  ) {
    const validated = scanFolderQuerySchema.parse(request.query);
    const result = await this.service.scanFolder(validated.folderPath);
    return reply.send(result);
  }
}
