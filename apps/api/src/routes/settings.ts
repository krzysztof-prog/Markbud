import type { FastifyPluginAsync } from 'fastify';
import { prisma, fileWatcher } from '../index.js';
import * as fs from 'fs';
import * as path from 'path';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/settings - wszystkie ustawienia
  fastify.get('/', async () => {
    const settings = await prisma.setting.findMany();

    // Przekształć na obiekt
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }

    return settingsObj;
  });

  // GET /api/settings/:key - pojedyncze ustawienie
  fastify.get<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Ustawienie nie znalezione' });
    }

    return setting;
  });

  // PUT /api/settings/:key - aktualizuj ustawienie
  fastify.put<{
    Params: { key: string };
    Body: { value: string };
  }>('/:key', async (request) => {
    const { key } = request.params;
    const { value } = request.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return setting;
  });

  // PUT /api/settings - aktualizuj wiele ustawień
  fastify.put<{
    Body: Record<string, string>;
  }>('/', async (request) => {
    const settings = request.body;

    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    try {
      await prisma.$transaction(updates);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // GET /api/settings/pallet-types - typy palet
  fastify.get('/pallet-types', async () => {
    const palletTypes = await prisma.palletType.findMany({
      orderBy: { name: 'asc' },
    });
    return palletTypes;
  });

  // POST /api/settings/pallet-types - dodaj typ palety
  fastify.post<{
    Body: {
      name: string;
      lengthMm: number;
      loadDepthMm: number;
    };
  }>('/pallet-types', async (request, reply) => {
    const { name, lengthMm, loadDepthMm } = request.body;

    const palletType = await prisma.palletType.create({
      data: { name, lengthMm, loadDepthMm },
    });

    return reply.status(201).send(palletType);
  });

  // PUT /api/settings/pallet-types/:id - aktualizuj typ palety
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
      loadWidthMm?: number;
    };
  }>('/pallet-types/:id', async (request) => {
    const { id } = request.params;
    const data = request.body;

    const palletType = await prisma.palletType.update({
      where: { id: parseInt(id) },
      data,
    });

    return palletType;
  });

  // DELETE /api/settings/pallet-types/:id - usuń typ palety
  fastify.delete<{ Params: { id: string } }>('/pallet-types/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.palletType.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });

  // GET /api/settings/packing-rules - reguły pakowania
  fastify.get('/packing-rules', async () => {
    const rules = await prisma.packingRule.findMany({
      orderBy: { name: 'asc' },
    });
    return rules.map(rule => ({ ...rule, ruleConfig: JSON.parse(rule.ruleConfig) }));
  });

  // POST /api/settings/packing-rules - dodaj regułę pakowania
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      isActive?: boolean;
      ruleConfig: Record<string, unknown>;
    };
  }>('/packing-rules', async (request, reply) => {
    const { name, description, isActive, ruleConfig } = request.body;

    const rule = await prisma.packingRule.create({
      data: { name, description, isActive, ruleConfig: JSON.stringify(ruleConfig) },
    });

    return reply.status(201).send({ ...rule, ruleConfig: JSON.parse(rule.ruleConfig) });
  });

  // PUT /api/settings/packing-rules/:id - aktualizuj regułę
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      isActive?: boolean;
      ruleConfig?: Record<string, unknown>;
    };
  }>('/packing-rules/:id', async (request) => {
    const { id } = request.params;
    const { ruleConfig, ...data } = request.body;

    const updateData = ruleConfig
      ? { ...data, ruleConfig: JSON.stringify(ruleConfig) }
      : data;

    const rule = await prisma.packingRule.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return { ...rule, ruleConfig: JSON.parse(rule.ruleConfig) };
  });

  // DELETE /api/settings/packing-rules/:id - usuń regułę
  fastify.delete<{ Params: { id: string } }>('/packing-rules/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.packingRule.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });

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
