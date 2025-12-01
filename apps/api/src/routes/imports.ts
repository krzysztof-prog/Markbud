import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { CsvParser } from '../services/parsers/csv-parser.js';
import { PdfParser } from '../services/parsers/pdf-parser.js';
import { writeFile, mkdir, readdir, copyFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { parseIntParam } from '../utils/errors.js';
import { emitDeliveryCreated, emitOrderUpdated } from '../services/event-emitter.js';

/**
 * Rekursywnie przeszukuje folder w poszukiwaniu plików CSV z "uzyte" lub "bele" w nazwie
 * @param dirPath Ścieżka do folderu
 * @param maxDepth Maksymalna głębokość rekursji (domyślnie 3)
 * @returns Tablica obiektów z informacją o plikach CSV
 */
async function findCsvFilesRecursively(
  dirPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<Array<{ filepath: string; filename: string; relativePath: string }>> {
  const results: Array<{ filepath: string; filename: string; relativePath: string }> = [];

  if (currentDepth > maxDepth) {
    return results;
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Rekursywnie przeszukaj podfolder
        const subResults = await findCsvFilesRecursively(fullPath, maxDepth, currentDepth + 1);
        results.push(...subResults);
      } else if (entry.isFile()) {
        // Sprawdź czy to plik CSV z "uzyte" lub "bele" w nazwie
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'))) {
          const relativePath = path.relative(dirPath, fullPath);
          results.push({
            filepath: fullPath,
            filename: entry.name,
            relativePath,
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Błąd podczas skanowania ${dirPath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
  }

  return results;
}

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/imports/upload - ręczny upload pliku
  fastify.post<{
    Body: { file: Buffer };
  }>('/upload', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        reply.status(400);
        return { error: 'Brak pliku' };
      }

      const filename = data.filename;
      const buffer = await data.toBuffer();

      // Sprawdź rozmiar pliku (maks 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.length > maxSize) {
        reply.status(413);
        return {
          error: 'Plik jest zbyt duży',
          details: `Maksymalny rozmiar to 10MB, a plik ma ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
          maxSize,
          fileSize: buffer.length,
        };
      }

      // Określ typ pliku na podstawie nazwy
      let fileType = 'unknown';
      const lowerFilename = filename.toLowerCase();

      if (lowerFilename.includes('uzyte') || lowerFilename.includes('bele') || lowerFilename.endsWith('.csv')) {
        fileType = 'uzyte_bele';
      } else if (lowerFilename.endsWith('.pdf')) {
        fileType = 'ceny_pdf';
      }

      // Utwórz folder uploads jeśli nie istnieje
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Zapisz plik z unikalną nazwą
      const timestamp = Date.now();
      const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filepath = path.join(uploadsDir, safeFilename);

      await writeFile(filepath, buffer);

      // Utwórz rekord w bazie
      const fileImport = await prisma.fileImport.create({
        data: {
          filename,
          filepath,
          fileType,
          status: 'pending',
        },
      });

      reply.status(201);
      return fileImport;
    } catch (error) {
      console.error('Upload error:', error);
      reply.status(500);
      return {
        error: 'Błąd podczas przesyłania pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      };
    }
  });

  // GET /api/imports - lista oczekujących importów
  fastify.get<{
    Querystring: { status?: string };
  }>('/', async (request) => {
    const { status } = request.query;

    const imports = await prisma.fileImport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return imports;
  });

  // GET /api/imports/pending - oczekujące importy (do dashboardu)
  fastify.get('/pending', async () => {
    const imports = await prisma.fileImport.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return imports;
  });

  // GET /api/imports/:id - szczegóły importu
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parseIntParam(id, 'id') },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    return fileImport;
  });

  // GET /api/imports/:id/preview - podgląd zawartości pliku
  fastify.get<{ Params: { id: string } }>('/:id/preview', async (request, reply) => {
    const { id } = request.params;

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parseIntParam(id, 'id') },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    try {
      if (fileImport.fileType === 'uzyte_bele') {
        const parser = new CsvParser();
        const preview = await parser.previewUzyteBele(fileImport.filepath);
        return preview;
      }

      if (fileImport.fileType === 'ceny_pdf') {
        const parser = new PdfParser();
        const preview = await parser.previewCenyPdf(fileImport.filepath);
        return preview;
      }

      return { message: 'Podgląd dla tego typu pliku nie jest jeszcze dostępny' };
    } catch (error) {
      return reply.status(500).send({
        error: 'Błąd podczas parsowania pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  });

  // POST /api/imports/:id/approve - zatwierdź import
  fastify.post<{
    Params: { id: string };
    Body: { action?: 'overwrite' | 'add_new' };
  }>('/:id/approve', async (request, reply) => {
    const { id } = request.params;
    const parsedId = parseIntParam(id, 'id');
    const { action = 'add_new' } = request.body;

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parsedId },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    if (fileImport.status !== 'pending') {
      return reply.status(400).send({ error: 'Import już został przetworzony' });
    }

    // Oznacz jako przetwarzany
    await prisma.fileImport.update({
      where: { id: parsedId },
      data: { status: 'processing' },
    });

    try {
      let result;

      if (fileImport.fileType === 'uzyte_bele') {
        const parser = new CsvParser();
        result = await parser.processUzyteBele(fileImport.filepath, action);
      } else if (fileImport.fileType === 'ceny_pdf') {
        const parser = new PdfParser();
        result = await parser.processCenyPdf(fileImport.filepath);
      } else {
        throw new Error('Nieobsługiwany typ pliku');
      }

      // Oznacz jako zakończony
      await prisma.fileImport.update({
        where: { id: parsedId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify(result),
        },
      });

      return { success: true, result };
    } catch (error) {
      // Oznacz jako błąd
      await prisma.fileImport.update({
        where: { id: parsedId },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Nieznany błąd',
        },
      });

      return reply.status(500).send({
        error: 'Błąd podczas przetwarzania pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  });

  // POST /api/imports/:id/reject - odrzuć import
  fastify.post<{ Params: { id: string } }>('/:id/reject', async (request, reply) => {
    const { id } = request.params;

    const fileImport = await prisma.fileImport.update({
      where: { id: parseIntParam(id, 'id') },
      data: { status: 'rejected' },
    });

    return fileImport;
  });

  // DELETE /api/imports/:id - usuń import z historii wraz z powiązanymi danymi
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const parsedId = parseIntParam(id, 'id');

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parsedId },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    // Jeśli import był zatwierdzony i utworzył zlecenie, usuń je wraz z powiązanymi danymi
    if (fileImport.status === 'completed' && fileImport.metadata) {
      try {
        const metadata = JSON.parse(fileImport.metadata);
        if (metadata.orderId) {
          // Sprawdź czy zlecenie istnieje przed usunięciem
          const orderExists = await prisma.order.findUnique({
            where: { id: metadata.orderId },
            select: { id: true },
          });

          if (orderExists) {
            // Usuń zlecenie (kaskadowo usunie requirements i windows dzięki onDelete: Cascade w schemacie)
            await prisma.order.delete({
              where: { id: metadata.orderId },
            });
            logger.info(`Usunięto zlecenie ${metadata.orderId} powiązane z importem ${parsedId}`);
          }
        }
      } catch (e) {
        // Loguj błędy parsowania metadanych, ale kontynuuj usuwanie importu
        logger.error('Błąd podczas usuwania powiązanego zlecenia:', e);
        // Nie przerywamy - import i tak zostanie usunięty
      }
    }

    // Usuń rekord importu
    await prisma.fileImport.delete({
      where: { id: parsedId },
    });

    return reply.status(204).send();
  });

  // POST /api/imports/folder - import wszystkich CSV z folderu z datą w nazwie
  // Format daty w nazwie folderu: DD.MM.YYYY (np. "01.12.2025" lub "Dostawa 01.12.2025")
  fastify.post<{
    Body: {
      folderPath: string;
      deliveryNumber: 'I' | 'II' | 'III';
    };
  }>('/folder', async (request, reply) => {
    const { folderPath, deliveryNumber } = request.body;

    if (!folderPath || !deliveryNumber) {
      return reply.status(400).send({
        error: 'Brakuje wymaganych pól',
        details: 'Wymagane: folderPath i deliveryNumber (I, II lub III)',
      });
    }

    if (!['I', 'II', 'III'].includes(deliveryNumber)) {
      return reply.status(400).send({
        error: 'Nieprawidłowy numer dostawy',
        details: 'Dozwolone wartości: I, II, III',
      });
    }

    // Sprawdź czy folder istnieje
    if (!existsSync(folderPath)) {
      return reply.status(404).send({
        error: 'Folder nie istnieje',
        details: `Nie znaleziono folderu: ${folderPath}`,
      });
    }

    // Sprawdź czy to faktycznie folder
    const stats = statSync(folderPath);
    if (!stats.isDirectory()) {
      return reply.status(400).send({
        error: 'Ścieżka nie jest folderem',
        details: `Podana ścieżka nie jest folderem: ${folderPath}`,
      });
    }

    // Wyciągnij datę z nazwy folderu (format DD.MM.YYYY)
    const folderName = path.basename(folderPath);
    const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    if (!dateMatch) {
      return reply.status(400).send({
        error: 'Brak daty w nazwie folderu',
        details: `Nie znaleziono daty w formacie DD.MM.YYYY w nazwie folderu: ${folderName}`,
      });
    }

    const [, day, month, year] = dateMatch;
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Walidacja daty
    if (isNaN(deliveryDate.getTime())) {
      return reply.status(400).send({
        error: 'Nieprawidłowa data',
        details: `Data ${day}.${month}.${year} jest nieprawidłowa`,
      });
    }

    // Znajdź wszystkie pliki CSV w folderze i podfolderach (rekursywnie)
    const csvFilesData = await findCsvFilesRecursively(folderPath, 3);

    if (csvFilesData.length === 0) {
      return reply.status(400).send({
        error: 'Brak plików CSV',
        details: 'Nie znaleziono plików CSV z "uzyte" lub "bele" w nazwie (przeszukano również podfoldery)',
      });
    }

    // Znajdź lub utwórz dostawę z tą datą i numerem
    let delivery = await prisma.delivery.findFirst({
      where: {
        deliveryDate: {
          gte: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()),
          lt: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate() + 1),
        },
        deliveryNumber,
      },
    });

    const deliveryCreated = !delivery;

    if (!delivery) {
      delivery = await prisma.delivery.create({
        data: {
          deliveryDate,
          deliveryNumber,
          status: 'planned',
        },
      });
      logger.info(`Utworzono nową dostawę ${deliveryNumber} na ${day}.${month}.${year}`);
      emitDeliveryCreated(delivery);
    }

    // Utwórz folder uploads jeśli nie istnieje
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Przetwórz każdy plik CSV
    const results: Array<{
      filename: string;
      relativePath: string;
      success: boolean;
      orderId?: number;
      orderNumber?: string;
      error?: string;
    }> = [];

    const parser = new CsvParser();

    for (const csvFileData of csvFilesData) {
      try {
        // Skopiuj plik do uploads z timestampem
        const timestamp = Date.now();
        const safeFilename = `${timestamp}_${csvFileData.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const destPath = path.join(uploadsDir, safeFilename);

        await copyFile(csvFileData.filepath, destPath);

        // Utwórz rekord importu z informacją o względnej ścieżce
        const fileImport = await prisma.fileImport.create({
          data: {
            filename: `${csvFileData.relativePath}`,
            filepath: destPath,
            fileType: 'uzyte_bele',
            status: 'processing',
          },
        });

        // Przetwórz plik
        const result = await parser.processUzyteBele(destPath, 'add_new');

        // Zaktualizuj import jako completed
        await prisma.fileImport.update({
          where: { id: fileImport.id },
          data: {
            status: 'completed',
            processedAt: new Date(),
            metadata: JSON.stringify(result),
          },
        });

        // Pobierz numer zlecenia
        const order = await prisma.order.findUnique({
          where: { id: result.orderId },
          select: { orderNumber: true },
        });

        // Dodaj zlecenie do dostawy (jeśli jeszcze nie jest dodane)
        const existingDeliveryOrder = await prisma.deliveryOrder.findUnique({
          where: {
            deliveryId_orderId: {
              deliveryId: delivery.id,
              orderId: result.orderId,
            },
          },
        });

        if (!existingDeliveryOrder) {
          // Pobierz maksymalną pozycję
          const maxPosition = await prisma.deliveryOrder.aggregate({
            where: { deliveryId: delivery.id },
            _max: { position: true },
          });

          await prisma.deliveryOrder.create({
            data: {
              deliveryId: delivery.id,
              orderId: result.orderId,
              position: (maxPosition._max.position || 0) + 1,
            },
          });

          emitOrderUpdated({ id: result.orderId });
        }

        results.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          success: true,
          orderId: result.orderId,
          orderNumber: order?.orderNumber,
        });

        logger.info(`Zaimportowano ${csvFileData.relativePath} → zlecenie ${order?.orderNumber}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
        results.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          success: false,
          error: errorMessage,
        });
        logger.error(`Błąd importu ${csvFileData.relativePath}: ${errorMessage}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return reply.status(200).send({
      success: true,
      delivery: {
        id: delivery.id,
        deliveryDate: delivery.deliveryDate,
        deliveryNumber: delivery.deliveryNumber,
        created: deliveryCreated,
      },
      summary: {
        totalFiles: csvFilesData.length,
        successCount,
        failCount,
      },
      results,
    });
  });

  // GET /api/imports/list-folders - lista folderów z datami w nazwie
  fastify.get('/list-folders', async (request, reply) => {
    // Domyślna ścieżka bazowa (można ją skonfigurować w .env)
    const basePath = process.env.IMPORTS_BASE_PATH || 'C:\\Dostawy';

    if (!existsSync(basePath)) {
      return reply.status(404).send({
        error: 'Folder bazowy nie istnieje',
        details: `Skonfiguruj IMPORTS_BASE_PATH w .env lub utwórz folder: ${basePath}`,
        basePath,
        folders: []
      });
    }

    try {
      const entries = await readdir(basePath, { withFileTypes: true });
      const folders = entries
        .filter(entry => entry.isDirectory())
        .map(entry => {
          const folderName = entry.name;
          const fullPath = path.join(basePath, folderName);
          const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

          return {
            name: folderName,
            path: fullPath,
            hasDate: !!dateMatch,
            date: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
          };
        })
        .filter(folder => folder.hasDate) // Tylko foldery z datą
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // Sortuj od najnowszych

      return {
        basePath,
        folders,
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Błąd odczytu folderów',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
        basePath,
        folders: []
      });
    }
  });

  // GET /api/imports/scan-folder - skanuj folder i zwróć info o plikach CSV
  fastify.get<{
    Querystring: { folderPath: string };
  }>('/scan-folder', async (request, reply) => {
    const { folderPath } = request.query;

    if (!folderPath) {
      return reply.status(400).send({ error: 'Brak parametru folderPath' });
    }

    if (!existsSync(folderPath)) {
      return reply.status(404).send({ error: 'Folder nie istnieje' });
    }

    const stats = statSync(folderPath);
    if (!stats.isDirectory()) {
      return reply.status(400).send({ error: 'Ścieżka nie jest folderem' });
    }

    // Wyciągnij datę z nazwy folderu
    const folderName = path.basename(folderPath);
    const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    let detectedDate: string | null = null;
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      detectedDate = `${year}-${month}-${day}`;
    }

    // Znajdź pliki CSV rekursywnie (maksymalnie 3 poziomy głębokości)
    const csvFilesData = await findCsvFilesRecursively(folderPath, 3);

    // Pobierz podgląd każdego pliku
    const parser = new CsvParser();
    const previews: Array<{
      filename: string;
      relativePath: string;
      orderNumber: string;
      requirementsCount: number;
      windowsCount: number;
    }> = [];

    for (const csvFileData of csvFilesData) {
      try {
        const preview = await parser.previewUzyteBele(csvFileData.filepath);
        previews.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          orderNumber: preview.orderNumber,
          requirementsCount: preview.requirements.length,
          windowsCount: preview.windows.length,
        });
      } catch {
        previews.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          orderNumber: 'BŁĄD',
          requirementsCount: 0,
          windowsCount: 0,
        });
      }
    }

    // Sprawdź czy istnieje dostawa na tę datę
    let existingDeliveries: Array<{ id: number; deliveryNumber: string | null }> = [];
    if (detectedDate) {
      const dateObj = new Date(detectedDate);
      existingDeliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: {
            gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
            lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
          },
        },
        select: { id: true, deliveryNumber: true },
      });
    }

    return {
      folderName,
      detectedDate,
      csvFiles: previews,
      existingDeliveries,
    };
  });
};
