/**
 * Order Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream, existsSync } from 'fs';
import { OrderService } from '../services/orderService.js';
import {
  createOrderSchema,
  updateOrderSchema,
  patchOrderSchema,
  orderParamsSchema,
  orderQuerySchema,
  bulkUpdateStatusSchema,
  revertProductionSchema,
  forProductionQuerySchema,
  monthlyProductionQuerySchema,
  variantTypeSchema,
  manualStatusSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
  type PatchOrderInput,
  type BulkUpdateStatusInput,
  type RevertProductionInput,
  type ForProductionQuery,
  type MonthlyProductionQuery,
  type ManualStatusInput,
} from '../validators/order.js';
import { prisma } from '../index.js';
import { parseIntParam, ForbiddenError } from '../utils/errors.js';
import { emitOrderUpdated } from '../services/event-emitter.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// Role z uprawnieniami do usuwania zleceń
const DELETE_ALLOWED_ROLES = ['owner', 'admin', 'kierownik'];
import { ReadinessOrchestrator } from '../services/readinessOrchestrator.js';

export class OrderHandler {
  constructor(private service: OrderService) {}

  async getAll(
    request: FastifyRequest<{ Querystring: { status?: string; archived?: string; colorId?: string; documentAuthorUserId?: string } }>,
    reply: FastifyReply
  ) {
    const validated = orderQuerySchema.parse(request.query);
    const orders = await this.service.getAllOrders(validated);
    return reply.send(orders);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const order = await this.service.getOrderById(parseInt(id));
    return reply.send(order);
  }

  async getByNumber(
    request: FastifyRequest<{ Params: { orderNumber: string } }>,
    reply: FastifyReply
  ) {
    const { orderNumber } = request.params;
    const order = await this.service.getOrderByNumber(orderNumber);
    return reply.send(order);
  }

  async create(
    request: FastifyRequest<{ Body: CreateOrderInput }>,
    reply: FastifyReply
  ) {
    const validated = createOrderSchema.parse(request.body);
    const order = await this.service.createOrder(validated);
    return reply.status(201).send(order);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderInput }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const validated = updateOrderSchema.parse(request.body);
    const order = await this.service.updateOrder(parseInt(id), validated);
    return reply.send(order);
  }

  /**
   * Aktualizuj ręczny status zlecenia (NIE CIĄĆ, Anulowane, Wstrzymane)
   */
  async updateManualStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: ManualStatusInput }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const validated = manualStatusSchema.parse(request.body);
    const order = await this.service.updateManualStatus(parseInt(id), validated.manualStatus);

    // Wyślij event WebSocket o aktualizacji zlecenia
    emitOrderUpdated(order);

    return reply.send(order);
  }

  /**
   * Soft delete zlecenia - tylko dla admin/kierownik, tylko status "new"
   */
  async delete(
    request: AuthenticatedRequest & FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    // Sprawdzenie uprawnień - tylko admin/kierownik
    const userRole = request.user?.role;
    if (!userRole || !DELETE_ALLOWED_ROLES.includes(userRole)) {
      throw new ForbiddenError(
        'Tylko administrator lub kierownik może usuwać zlecenia'
      );
    }

    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenError('Brak identyfikatora użytkownika');
    }

    const { id } = orderParamsSchema.parse(request.params);
    await this.service.deleteOrder(parseInt(id), Number(userId));
    return reply.status(204).send();
  }

  async archive(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const order = await this.service.archiveOrder(parseInt(id));
    return reply.send(order);
  }

  async unarchive(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const order = await this.service.unarchiveOrder(parseInt(id));
    return reply.send(order);
  }

  async bulkUpdateStatus(
    request: FastifyRequest<{ Body: BulkUpdateStatusInput }>,
    reply: FastifyReply
  ) {
    const validated = bulkUpdateStatusSchema.parse(request.body);
    const orders = await this.service.bulkUpdateStatus(
      validated.orderIds,
      validated.status,
      validated.productionDate,
      validated.skipWarehouseValidation,
      validated.deliveryIds
    );
    return reply.status(200).send(orders);
  }

  /**
   * Cofnij produkcję - zmień status z completed na in_progress
   * Tylko kierownik i admin
   */
  async revertProduction(
    request: AuthenticatedRequest & FastifyRequest<{ Body: RevertProductionInput }>,
    reply: FastifyReply
  ) {
    // Sprawdzenie uprawnień - tylko admin/kierownik
    const userRole = request.user?.role;
    if (!userRole || !DELETE_ALLOWED_ROLES.includes(userRole)) {
      throw new ForbiddenError(
        'Tylko administrator lub kierownik może cofać produkcję'
      );
    }

    const validated = revertProductionSchema.parse(request.body);
    const orders = await this.service.revertProduction(validated.orderIds);
    return reply.status(200).send(orders);
  }

  async getForProduction(
    request: FastifyRequest<{ Querystring: ForProductionQuery }>,
    reply: FastifyReply
  ) {
    const validated = forProductionQuerySchema.parse(request.query);
    const data = await this.service.getForProduction(validated);
    return reply.status(200).send(data);
  }

  async getMonthlyProduction(
    request: FastifyRequest<{ Querystring: MonthlyProductionQuery }>,
    reply: FastifyReply
  ) {
    const validated = monthlyProductionQuerySchema.parse(request.query);
    const year = parseInt(validated.year, 10);
    const month = parseInt(validated.month, 10);

    const orders = await this.service.getMonthlyProduction(year, month);
    return reply.status(200).send(orders);
  }

  /**
   * Wyszukiwanie zleceń - zoptymalizowane dla GlobalSearch
   * GET /api/orders/search?q=query&includeArchived=true
   */
  async search(
    request: FastifyRequest<{ Querystring: { q: string; includeArchived?: string } }>,
    reply: FastifyReply
  ) {
    const { q, includeArchived } = request.query;
    const includeArchivedBool = includeArchived !== 'false';

    const orders = await this.service.searchOrders(q, includeArchivedBool);
    return reply.status(200).send(orders);
  }

  /**
   * Get completeness statistics for operator dashboard
   * GET /api/orders/completeness-stats?userId=X
   */
  async getCompletenessStats(
    request: FastifyRequest<{ Querystring: { userId: string } }>,
    reply: FastifyReply
  ) {
    const userId = parseInt(request.query.userId, 10);

    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'userId musi być liczbą' });
    }

    const stats = await this.service.getCompletenessStats(userId);
    return reply.status(200).send(stats);
  }

  /**
   * Partial update of order
   * PATCH /api/orders/:id
   */
  async patch(
    request: FastifyRequest<{
      Params: { id: string };
      Body: PatchOrderInput;
    }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const validated = patchOrderSchema.parse(request.body);
    const order = await this.service.patchOrder(parseInt(id), validated);
    return reply.send(order);
  }

  /**
   * Get requirements totals grouped by profile and color
   * GET /api/orders/requirements/totals
   */
  async getRequirementsTotals(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    const totals = await this.service.getRequirementsTotals();
    return reply.send(totals);
  }

  /**
   * Check if PDF exists for order
   * GET /api/orders/:id/has-pdf
   */
  async hasPdf(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const orderId = parseInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    const pdfImport = await prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: {
          contains: `"orderId":${order.id}`,
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    return reply.send({
      hasPdf: !!pdfImport && existsSync(pdfImport.filepath),
      filename: pdfImport?.filename || null,
    });
  }

  /**
   * Download PDF file for order
   * GET /api/orders/:id/pdf
   */
  async downloadPdf(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const orderId = parseInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    const pdfImport = await prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: {
          contains: `"orderId":${order.id}`,
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    if (!pdfImport) {
      return reply.status(404).send({ error: 'Nie znaleziono pliku PDF dla tego zlecenia' });
    }

    if (!existsSync(pdfImport.filepath)) {
      return reply.status(404).send({ error: 'Plik PDF nie został znaleziony na dysku' });
    }

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${pdfImport.filename}"`);

    const stream = createReadStream(pdfImport.filepath);
    return reply.send(stream);
  }

  /**
   * Get orders table for given color
   * GET /api/orders/table/:colorId
   */
  async getTableByColor(
    request: FastifyRequest<{ Params: { colorId: string } }>,
    reply: FastifyReply
  ) {
    const { colorId } = request.params;
    const parsedColorId = parseIntParam(colorId, 'colorId');

    // Pobierz tylko profile z isAkrobud=true (widok magazynu Akrobud)
    const visibleProfiles = await prisma.profileColor.findMany({
      where: {
        colorId: parsedColorId,
        isVisible: true,
        profile: {
          isAkrobud: true,
        },
      },
      select: {
        profileId: true,
        colorId: true,
        isVisible: true,
        profile: {
          select: {
            id: true,
            number: true,
            name: true,
          },
        },
      },
      orderBy: { profile: { number: 'asc' } },
    });

    // Pobierz tylko aktywne zamówienia z wymaganiami dla profili Akrobud
    // (pomijamy completed i archived - te przechodzą do RW)
    const orders = await prisma.order.findMany({
      where: {
        archivedAt: null,
        status: { in: ['new', 'in_progress'] },
        requirements: {
          some: {
            colorId: parsedColorId,
            profile: {
              isAkrobud: true,
            },
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        requirements: {
          where: {
            colorId: parsedColorId,
            profile: {
              isAkrobud: true,
            },
          },
          select: {
            id: true,
            profileId: true,
            colorId: true,
            beamsCount: true,
            meters: true,
            profile: {
              select: {
                id: true,
                number: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { orderNumber: 'asc' },
    });

    const tableData = orders.map((order) => {
      const requirements: Record<string, { beams: number; meters: number }> = {};

      for (const req of order.requirements) {
        requirements[req.profile.number] = {
          beams: req.beamsCount,
          meters: parseFloat(req.meters.toString()),
        };
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        requirements,
      };
    });

    const totals: Record<string, { beams: number; meters: number }> = {};
    for (const profile of visibleProfiles) {
      totals[profile.profile.number] = { beams: 0, meters: 0 };
    }

    for (const row of tableData) {
      for (const [profileNumber, data] of Object.entries(row.requirements)) {
        if (totals[profileNumber]) {
          totals[profileNumber].beams += data.beams;
          totals[profileNumber].meters += data.meters;
        }
      }
    }

    return reply.send({
      profiles: visibleProfiles.map((pc) => pc.profile),
      orders: tableData,
      totals,
    });
  }

  /**
   * Get production readiness checklist (System Brain)
   * GET /api/orders/:id/readiness
   */
  async getReadiness(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const orchestrator = new ReadinessOrchestrator(prisma);
    const result = await orchestrator.canStartProduction(parseInt(id));
    return reply.send(result);
  }

  /**
   * Set variant type for an order
   * PATCH /api/orders/:id/variant-type
   */
  async setVariantType(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { variantType: 'correction' | 'additional_file' };
    }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const { variantType } = variantTypeSchema.parse(request.body);

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { variantType },
    });

    emitOrderUpdated(order);

    return reply.send({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        variantType: order.variantType,
      },
    });
  }

  /**
   * Check if glass order TXT exists for order
   * GET /api/orders/:id/has-glass-order-txt
   *
   * Szuka zamówienia szyb (GlassOrder) które zawiera pozycje dla tego zlecenia,
   * następnie sprawdza czy istnieje plik TXT w archiwum.
   */
  async hasGlassOrderTxt(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const orderId = parseInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    // Znajdź GlassOrder który zawiera pozycje dla tego zlecenia
    const glassOrderItem = await prisma.glassOrderItem.findFirst({
      where: { orderNumber: order.orderNumber },
      select: {
        glassOrder: {
          select: {
            id: true,
            glassOrderNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!glassOrderItem?.glassOrder) {
      return reply.send({
        hasGlassOrderTxt: false,
        glassOrderNumber: null,
        message: 'Brak zamówienia szyb',
      });
    }

    const { glassOrderNumber } = glassOrderItem.glassOrder;

    // Znajdź FileImport z tym glassOrderNumber w metadata
    const fileImport = await prisma.fileImport.findFirst({
      where: {
        fileType: { in: ['glass_order', 'glass_order_correction'] },
        status: 'completed',
        metadata: {
          contains: `"glassOrderNumber":"${glassOrderNumber}"`,
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    if (!fileImport) {
      return reply.send({
        hasGlassOrderTxt: false,
        glassOrderNumber,
        message: 'Nie znaleziono pliku importu',
      });
    }

    // Sprawdź czy plik istnieje (może być w archiwum)
    const fileExists = existsSync(fileImport.filepath);

    return reply.send({
      hasGlassOrderTxt: fileExists,
      glassOrderNumber,
      filename: fileImport.filename,
    });
  }

  /**
   * Download glass order TXT file for order
   * GET /api/orders/:id/glass-order-txt
   */
  async downloadGlassOrderTxt(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    const orderId = parseInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    // Znajdź GlassOrder który zawiera pozycje dla tego zlecenia
    const glassOrderItem = await prisma.glassOrderItem.findFirst({
      where: { orderNumber: order.orderNumber },
      select: {
        glassOrder: {
          select: {
            glassOrderNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!glassOrderItem?.glassOrder) {
      return reply.status(404).send({ error: 'Brak zamówienia szyb dla tego zlecenia' });
    }

    const { glassOrderNumber } = glassOrderItem.glassOrder;

    // Znajdź FileImport z tym glassOrderNumber w metadata
    const fileImport = await prisma.fileImport.findFirst({
      where: {
        fileType: { in: ['glass_order', 'glass_order_correction'] },
        status: 'completed',
        metadata: {
          contains: `"glassOrderNumber":"${glassOrderNumber}"`,
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    if (!fileImport) {
      return reply.status(404).send({ error: 'Nie znaleziono pliku zamówienia szyb' });
    }

    if (!existsSync(fileImport.filepath)) {
      return reply.status(404).send({ error: 'Plik zamówienia szyb nie został znaleziony na dysku' });
    }

    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `inline; filename="${fileImport.filename}"`);

    const stream = createReadStream(fileImport.filepath);
    return reply.send(stream);
  }
}
