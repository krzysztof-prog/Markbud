/**
 * Import Routes - Route definitions only
 *
 * Delegates all logic to ImportHandler following layered architecture:
 * Route -> Handler -> Service -> Repository
 */

import type { FastifyPluginAsync, RouteShorthandOptions } from 'fastify';
import { prisma } from '../index.js';
import { ImportRepository } from '../repositories/ImportRepository.js';
import { ImportService } from '../services/importService.js';
import { ImportHandler } from '../handlers/importHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const importRepository = new ImportRepository(prisma);
  const importService = new ImportService(importRepository);
  const handler = new ImportHandler(importService);

  // File upload - all require authentication
  fastify.post<{ Body: { file: Buffer } }>('/upload', { preHandler: verifyAuth }, handler.upload.bind(handler));

  // List imports
  fastify.get<{ Querystring: { status?: string } }>('/', { preHandler: verifyAuth }, handler.getAll.bind(handler));
  fastify.get('/pending', { preHandler: verifyAuth }, handler.getPending.bind(handler));

  // Folder operations
  fastify.get<{ Querystring: { userId?: number } }>('/list-folders', { preHandler: verifyAuth }, handler.listFolders.bind(handler));
  fastify.get<{ Querystring: { folderPath: string; userId?: number } }>('/scan-folder', { preHandler: verifyAuth }, handler.scanFolder.bind(handler));
  fastify.post<{ Body: { folderPath: string; deliveryNumber: 'I' | 'II' | 'III'; userId?: number } }>('/folder', { preHandler: verifyAuth }, handler.importFolder.bind(handler));
  fastify.post<{ Body: { folderPath: string; userId?: number } }>('/archive-folder', { preHandler: verifyAuth }, handler.archiveFolder.bind(handler));
  fastify.delete<{ Body: { folderPath: string; userId?: number } }>('/delete-folder', { preHandler: verifyAuth }, handler.deleteFolder.bind(handler));

  // Preview and process by filepath (with variant conflict detection)
  fastify.get<{ Querystring: { filepath: string } }>('/preview', { preHandler: verifyAuth }, handler.previewByFilepath.bind(handler));
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
  }>('/process', { preHandler: verifyAuth }, handler.processImport.bind(handler));

  // Bulk operations
  fastify.post<{ Body: { ids: number[]; action: 'approve' | 'reject' } }>('/bulk', { preHandler: verifyAuth }, handler.bulkAction.bind(handler));

  // Single import operations
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: verifyAuth }, handler.getById.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id/preview', { preHandler: verifyAuth }, handler.getPreview.bind(handler));
  fastify.post<{ Params: { id: string }; Body: { action?: 'overwrite' | 'add_new'; replaceBase?: boolean } }>('/:id/approve', { preHandler: verifyAuth }, handler.approve.bind(handler));
  fastify.post<{ Params: { id: string } }>('/:id/reject', { preHandler: verifyAuth }, handler.reject.bind(handler));
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: verifyAuth }, handler.delete.bind(handler));
};
