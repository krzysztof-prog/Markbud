import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { CsvParser } from '../services/parsers/csv-parser.js';
import { PdfParser } from '../services/parsers/pdf-parser.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/imports/upload - ręczny upload pliku
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku' });
      }

      const filename = data.filename;
      const buffer = await data.toBuffer();

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

      return reply.status(201).send(fileImport);
    } catch (error) {
      console.error('Upload error:', error);
      return reply.status(500).send({
        error: 'Błąd podczas przesyłania pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      });
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
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
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
    const { action = 'add_new' } = request.body;

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parseInt(id) },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    if (fileImport.status !== 'pending') {
      return reply.status(400).send({ error: 'Import już został przetworzony' });
    }

    // Oznacz jako przetwarzany
    await prisma.fileImport.update({
      where: { id: parseInt(id) },
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
        where: { id: parseInt(id) },
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
        where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
      data: { status: 'rejected' },
    });

    return fileImport;
  });

  // DELETE /api/imports/:id - usuń import z historii wraz z powiązanymi danymi
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const fileImport = await prisma.fileImport.findUnique({
      where: { id: parseInt(id) },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Import nie znaleziony' });
    }

    // Jeśli import był zatwierdzony i utworzył zlecenie, usuń je wraz z powiązanymi danymi
    if (fileImport.status === 'completed' && fileImport.metadata) {
      try {
        const metadata = JSON.parse(fileImport.metadata);
        if (metadata.orderId) {
          // Usuń zlecenie (kaskadowo usunie requirements i windows dzięki onDelete: Cascade w schemacie)
          await prisma.order.delete({
            where: { id: metadata.orderId },
          });
        }
      } catch (e) {
        // Ignoruj błędy parsowania metadanych
        console.error('Błąd parsowania metadanych importu:', e);
      }
    }

    // Usuń rekord importu
    await prisma.fileImport.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });
};
