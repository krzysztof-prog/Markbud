import type { FastifyPluginAsync } from 'fastify';
import { prisma, fileWatcher } from '../index.js';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { SettingsService } from '../services/settingsService.js';
import { SettingsHandler } from '../handlers/settingsHandler.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new SettingsRepository(prisma);
  const service = new SettingsService(repository);
  const handler = new SettingsHandler(service);

  // Core settings routes - delegate to handler
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:key', handler.getByKey.bind(handler));
  fastify.put('/:key', handler.upsertOne.bind(handler));
  fastify.put('/', handler.upsertMany.bind(handler));

  // Pallet types - delegate to handler
  fastify.get('/pallet-types', handler.getAllPalletTypes.bind(handler));
  fastify.post('/pallet-types', handler.createPalletType.bind(handler));
  fastify.put('/pallet-types/:id', handler.updatePalletType.bind(handler));
  fastify.delete('/pallet-types/:id', handler.deletePalletType.bind(handler));

  // Packing rules - delegate to handler
  fastify.get('/packing-rules', handler.getAllPackingRules.bind(handler));
  fastify.post('/packing-rules', handler.createPackingRule.bind(handler));
  fastify.put('/packing-rules/:id', handler.updatePackingRule.bind(handler));
  fastify.delete('/packing-rules/:id', handler.deletePackingRule.bind(handler));

  // GET /api/settings/browse-folders - przeglądaj foldery Windows
  fastify.get<{
    Querystring: { path?: string };
  }>('/browse-folders', async (request, reply) => {
    const requestedPath = request.query.path || '';

    // Jeśli pusta ścieżka - zwróć dyski Windows
    if (!requestedPath) {
      const drives: { name: string; path: string; type: 'drive' }[] = [];

      // Sprawdź dyski od A do Z
      for (let charCode = 65; charCode <= 90; charCode++) {
        const driveLetter = String.fromCharCode(charCode);
        const drivePath = `${driveLetter}:\\`;

        try {
          fs.accessSync(drivePath, fs.constants.R_OK);
          drives.push({
            name: `${driveLetter}:`,
            path: drivePath,
            type: 'drive',
          });
        } catch {
          // Dysk nie istnieje lub brak dostępu
        }
      }

      return {
        currentPath: '',
        parent: null,
        items: drives,
      };
    }

    // Normalizuj ścieżkę
    const normalizedPath = path.normalize(requestedPath);

    // Sprawdź czy ścieżka istnieje
    try {
      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        return reply.status(400).send({ error: 'Ścieżka nie jest folderem' });
      }
    } catch {
      return reply.status(404).send({ error: 'Folder nie istnieje' });
    }

    // Odczytaj zawartość folderu
    const items: { name: string; path: string; type: 'folder' | 'file' }[] = [];

    try {
      const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });

      for (const entry of entries) {
        // Pomijaj ukryte pliki/foldery (zaczynające się od .)
        if (entry.name.startsWith('.')) continue;

        // Pomijaj pliki systemowe Windows
        if (['$RECYCLE.BIN', 'System Volume Information', 'pagefile.sys', 'hiberfil.sys'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: path.join(normalizedPath, entry.name),
            type: 'folder',
          });
        }
      }

      // Sortuj foldery alfabetycznie
      items.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    } catch (error) {
      return reply.status(403).send({ error: 'Brak dostępu do folderu' });
    }

    // Oblicz ścieżkę rodzica
    const parentPath = path.dirname(normalizedPath);
    const hasParent = parentPath !== normalizedPath;

    return {
      currentPath: normalizedPath,
      parent: hasParent ? parentPath : null,
      items,
    };
  });

  // POST /api/settings/validate-folder - sprawdź czy folder istnieje
  fastify.post<{
    Body: { path: string };
  }>('/validate-folder', async (request, reply) => {
    const { path: folderPath } = request.body;

    if (!folderPath) {
      return reply.status(400).send({ error: 'Ścieżka jest wymagana', valid: false });
    }

    const normalizedPath = path.normalize(folderPath);

    try {
      const stats = fs.statSync(normalizedPath);

      if (!stats.isDirectory()) {
        return { valid: false, error: 'Ścieżka nie jest folderem' };
      }

      // Sprawdź uprawnienia do odczytu
      fs.accessSync(normalizedPath, fs.constants.R_OK);

      return { valid: true, path: normalizedPath };
    } catch {
      return { valid: false, error: 'Folder nie istnieje lub brak uprawnień' };
    }
  });

  // GET /api/settings/file-watcher/status - status i sciezki file watchera
  fastify.get('/file-watcher/status', async () => {
    if (!fileWatcher) {
      return {
        running: false,
        paths: null,
      };
    }

    const paths = await fileWatcher.getCurrentPaths();
    return {
      running: true,
      paths,
    };
  });

  // POST /api/settings/file-watcher/restart - restartuj file watcher
  fastify.post('/file-watcher/restart', async (request, reply) => {
    if (!fileWatcher) {
      return reply.status(503).send({ error: 'File watcher nie jest uruchomiony' });
    }

    try {
      await fileWatcher.restart();
      const paths = await fileWatcher.getCurrentPaths();
      return {
        success: true,
        message: 'File watcher zostal zrestartowany',
        paths,
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Blad podczas restartu file watchera',
        details: error instanceof Error ? error.message : 'Nieznany blad',
      });
    }
  });
};
