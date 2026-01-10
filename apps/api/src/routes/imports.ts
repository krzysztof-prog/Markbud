/**
 * Import Routes - Route definitions only
 *
 * Delegates all logic to ImportHandler following layered architecture:
 * Route -> Handler -> Service -> Repository
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ImportRepository } from '../repositories/ImportRepository.js';
import { ImportService } from '../services/importService.js';
import { ImportHandler } from '../handlers/importHandler.js';


export const importRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const importRepository = new ImportRepository(prisma);
  const importService = new ImportService(importRepository);
  const handler = new ImportHandler(importService);

  // File upload - all require authentication
  fastify.post<{ Body: { file: Buffer } }>('/upload', handler.upload.bind(handler));

  // List imports
  fastify.get<{ Querystring: { status?: string } }>('/', handler.getAll.bind(handler));
  fastify.get('/pending', handler.getPending.bind(handler));

  // Folder operations
  fastify.get<{ Querystring: { userId?: number } }>('/list-folders', handler.listFolders.bind(handler));
  fastify.get<{ Querystring: { folderPath: string; userId?: number } }>('/scan-folder', handler.scanFolder.bind(handler));
  fastify.post<{ Body: { folderPath: string; deliveryNumber: 'I' | 'II' | 'III'; userId?: number } }>('/folder', handler.importFolder.bind(handler));
  fastify.post<{ Body: { folderPath: string; userId?: number } }>('/archive-folder', handler.archiveFolder.bind(handler));
  fastify.delete<{ Body: { folderPath: string; userId?: number } }>('/delete-folder', handler.deleteFolder.bind(handler));

  // Preview and process by filepath (with variant conflict detection)
  fastify.get<{ Querystring: { filepath: string } }>('/preview', handler.previewByFilepath.bind(handler));
  fastify.post<{
    Body: {
      filepath: string;
      deliveryNumber?: 'I' | 'II' | 'III';
      resolution?: {
        type: 'merge' | 'replace' | 'use_latest' | 'keep_both' | 'cancel';
        targetOrderNumber?: string;
        deleteOlder?: boolean;
      };
    };
  }>('/process', handler.processImport.bind(handler));

  // Bulk operations
  fastify.post<{ Body: { ids: number[]; action: 'approve' | 'reject' } }>('/bulk', handler.bulkAction.bind(handler));

  // Single import operations
  fastify.get<{ Params: { id: string } }>('/:id', handler.getById.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id/preview', handler.getPreview.bind(handler));
  fastify.post<{ Params: { id: string }; Body: { action?: 'overwrite' | 'add_new'; replaceBase?: boolean } }>('/:id/approve', handler.approve.bind(handler));
  fastify.post<{ Params: { id: string } }>('/:id/reject', handler.reject.bind(handler));
  fastify.delete<{ Params: { id: string } }>('/:id', handler.delete.bind(handler));
};
