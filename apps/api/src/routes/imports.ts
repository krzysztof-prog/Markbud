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

  // File upload
  fastify.post('/upload', handler.upload.bind(handler));

  // List imports
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/pending', handler.getPending.bind(handler));

  // Folder operations
  fastify.get('/list-folders', handler.listFolders.bind(handler));
  fastify.get('/scan-folder', handler.scanFolder.bind(handler));
  fastify.post('/folder', handler.importFolder.bind(handler));

  // Single import operations
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.get('/:id/preview', handler.getPreview.bind(handler));
  fastify.post('/:id/approve', handler.approve.bind(handler));
  fastify.post('/:id/reject', handler.reject.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
};
