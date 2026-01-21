/**
 * Production Report Handler - Request/Response handling
 * Moduł zestawień miesięcznych produkcji
 *
 * Handler obsługuje:
 * - Pobieranie raportów produkcyjnych (getReport, getSummary)
 * - Aktualizację pozycji (ilości, RW checkboxy)
 * - Aktualizację danych faktur
 * - Aktualizację nietypówek
 * - Zamykanie/otwieranie miesięcy
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { productionReportService } from '../services/productionReportService.js';
import { productionReportPdfService } from '../services/productionReportPdfService.js';
import {
  productionReportParamsSchema,
  updateReportItemSchema,
  updateInvoiceSchema,
  updateAtypicalSchema,
} from '../validators/production-reports.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

// ForbiddenError - użyty gdy system będzie miał pełną autoryzację (checkRole)
void ForbiddenError;

// Role z dostępem do edycji raportów
const MANAGER_ROLES = ['manager', 'admin'];
const INVOICE_ROLES = ['manager', 'admin', 'accountant'];

// ============================================================================
// HELPERY DO SPRAWDZANIA UPRAWNIEŃ
// ============================================================================

/**
 * Sprawdza czy użytkownik ma wymaganą rolę
 * W systemie single-user tymczasowo przepuszcza wszystkich
 */
function checkRole(_request: FastifyRequest, _allowedRoles: string[]): void {
  // TEMPORARY: Single-user system - pomijamy sprawdzanie ról
  // Gdy system będzie miał pełną autoryzację, odkomentować poniższy kod:
  /*
  const userRole = (request as unknown as { user?: { role?: string } }).user?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new ForbiddenError('Brak uprawnień do wykonania tej operacji');
  }
  */
  return;
}

/**
 * Pobiera userId z requestu (dla audytu)
 */
function getUserId(request: FastifyRequest): number {
  const userId = (request as unknown as { user?: { userId?: number } }).user?.userId;
  return typeof userId === 'number' ? userId : 1; // domyślnie 1 dla single-user
}

/**
 * Parsuje orderId z parametrów i waliduje
 */
function parseOrderId(orderId: string): number {
  const parsed = parseInt(orderId, 10);
  if (isNaN(parsed)) {
    throw new ValidationError('orderId musi być liczbą całkowitą');
  }
  return parsed;
}

// ============================================================================
// HANDLER
// ============================================================================

export const productionReportHandler = {
  /**
   * GET /:year/:month
   * Pobiera pełny raport produkcyjny dla danego miesiąca
   */
  async getReport(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const { year, month } = productionReportParamsSchema.parse(request.params);
    const report = await productionReportService.getReport(year, month);
    return reply.send(report);
  },

  /**
   * GET /:year/:month/summary
   * Pobiera podsumowanie raportu (sumy, średnie)
   */
  async getSummary(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const { year, month } = productionReportParamsSchema.parse(request.params);
    const summary = await productionReportService.getSummary(year, month);
    return reply.send(summary);
  },

  /**
   * PUT /:year/:month/items/:orderId
   * Aktualizuje pozycję raportu (ilości, checkboxy RW)
   * Wymaga roli: manager lub admin
   */
  async updateReportItem(
    request: FastifyRequest<{ Params: { year: string; month: string; orderId: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdź uprawnienia (manager/admin)
    checkRole(request, MANAGER_ROLES);

    const { year, month, orderId } = request.params;
    const params = productionReportParamsSchema.parse({ year, month });
    const body = updateReportItemSchema.parse(request.body);
    const orderIdNum = parseOrderId(orderId);

    await productionReportService.updateReportItem(
      params.year,
      params.month,
      orderIdNum,
      body
    );
    return reply.send({ success: true });
  },

  /**
   * PUT /:year/:month/items/:orderId/invoice
   * Aktualizuje dane faktury dla pozycji raportu
   * Wymaga roli: manager, admin lub accountant
   */
  async updateInvoice(
    request: FastifyRequest<{ Params: { year: string; month: string; orderId: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdź uprawnienia (manager/admin/accountant)
    checkRole(request, INVOICE_ROLES);

    const { year, month, orderId } = request.params;
    const params = productionReportParamsSchema.parse({ year, month });
    const body = updateInvoiceSchema.parse(request.body);
    const orderIdNum = parseOrderId(orderId);

    // Konwertuj invoiceDate na Date jeśli podane
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : null;

    await productionReportService.updateInvoice(
      params.year,
      params.month,
      orderIdNum,
      body.invoiceNumber ?? null,
      invoiceDate
    );
    return reply.send({ success: true });
  },

  /**
   * PUT /:year/:month/atypical
   * Aktualizuje dane nietypówek (korekta raportowa)
   * Wymaga roli: manager lub admin
   */
  async updateAtypical(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdź uprawnienia (manager/admin)
    checkRole(request, MANAGER_ROLES);

    const { year, month } = productionReportParamsSchema.parse(request.params);
    const body = updateAtypicalSchema.parse(request.body);

    await productionReportService.updateAtypical(year, month, body);
    return reply.send({ success: true });
  },

  /**
   * POST /:year/:month/close
   * Zamyka miesiąc (blokuje edycję danych produkcyjnych)
   * Wymaga roli: manager lub admin
   */
  async closeMonth(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdź uprawnienia (manager/admin)
    checkRole(request, MANAGER_ROLES);

    const { year, month } = productionReportParamsSchema.parse(request.params);
    const userId = getUserId(request);

    await productionReportService.closeMonth(year, month, userId);
    return reply.send({ success: true, message: 'Miesiąc zamknięty' });
  },

  /**
   * POST /:year/:month/reopen
   * Otwiera zamknięty miesiąc (odblokowuje edycję)
   * Wymaga roli: manager lub admin
   */
  async reopenMonth(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdź uprawnienia (manager/admin)
    checkRole(request, MANAGER_ROLES);

    const { year, month } = productionReportParamsSchema.parse(request.params);
    const userId = getUserId(request);

    await productionReportService.reopenMonth(year, month, userId);
    return reply.send({ success: true, message: 'Miesiąc odblokowany' });
  },

  /**
   * GET /:year/:month/invoice-auto-fill-preview
   * Pobiera preview auto-fill dla numeru FV
   * Pokazuje które zlecenia zostaną zaktualizowane (ta sama data dostawy)
   * Wymaga roli: manager, admin lub accountant
   */
  async getInvoiceAutoFillPreview(
    request: FastifyRequest<{
      Params: { year: string; month: string };
      Querystring: { sourceOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    checkRole(request, INVOICE_ROLES);

    const { year, month } = productionReportParamsSchema.parse(request.params);
    const sourceOrderIdStr = request.query.sourceOrderId;

    if (!sourceOrderIdStr) {
      throw new ValidationError('Brak parametru sourceOrderId');
    }

    const sourceOrderId = parseOrderId(sourceOrderIdStr);
    const preview = await productionReportService.getInvoiceAutoFillPreview(year, month, sourceOrderId);

    return reply.send(preview);
  },

  /**
   * POST /:year/:month/invoice-auto-fill
   * Wykonuje auto-fill numeru FV dla zleceń z tą samą datą dostawy
   * Wymaga roli: manager, admin lub accountant
   */
  async executeInvoiceAutoFill(
    request: FastifyRequest<{
      Params: { year: string; month: string };
      Body: { sourceOrderId: number; invoiceNumber: string; skipConflicts: boolean };
    }>,
    reply: FastifyReply
  ) {
    checkRole(request, INVOICE_ROLES);

    const { year, month } = productionReportParamsSchema.parse(request.params);
    const body = request.body as { sourceOrderId: number; invoiceNumber: string; skipConflicts: boolean };

    if (!body.sourceOrderId || typeof body.sourceOrderId !== 'number') {
      throw new ValidationError('Brak lub nieprawidłowy parametr sourceOrderId');
    }
    if (!body.invoiceNumber || typeof body.invoiceNumber !== 'string') {
      throw new ValidationError('Brak lub nieprawidłowy parametr invoiceNumber');
    }

    const result = await productionReportService.executeInvoiceAutoFill(
      year,
      month,
      body.sourceOrderId,
      body.invoiceNumber,
      body.skipConflicts ?? false
    );

    return reply.send(result);
  },

  /**
   * GET /:year/:month/pdf
   * Eksportuje raport produkcji do PDF
   * Dostępne dla wszystkich zalogowanych użytkowników
   */
  async exportPdf(
    request: FastifyRequest<{
      Params: { year: string; month: string };
      Querystring: { eurRate?: string };
    }>,
    reply: FastifyReply
  ) {
    const { year, month } = productionReportParamsSchema.parse(request.params);

    // Pobierz kurs EUR z query string (domyślnie 4.30)
    const eurRateStr = request.query.eurRate;
    const eurRate = eurRateStr ? parseFloat(eurRateStr) : 4.30;

    if (isNaN(eurRate) || eurRate <= 0) {
      throw new ValidationError('Kurs EUR musi być dodatnią liczbą');
    }

    // Pobierz raport
    const report = await productionReportService.getReport(year, month);

    // Generuj PDF
    const pdfBuffer = await productionReportPdfService.generatePdf(report, eurRate);
    const filename = productionReportPdfService.generateFilename(year, month);

    // Ustaw nagłówki dla pobrania pliku PDF
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  },
};
