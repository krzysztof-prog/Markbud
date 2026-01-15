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
  forProductionQuerySchema,
  monthlyProductionQuerySchema,
  variantTypeSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
  type PatchOrderInput,
  type BulkUpdateStatusInput,
  type ForProductionQuery,
  type MonthlyProductionQuery,
} from '../validators/order.js';
import { prisma } from '../index.js';
import { parseIntParam } from '../utils/errors.js';
import { emitOrderUpdated } from '../services/event-emitter.js';
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

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = orderParamsSchema.parse(request.params);
    await this.service.deleteOrder(parseInt(id));
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
      validated.productionDate
    );
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

    const visibleProfiles = await prisma.profileColor.findMany({
      where: {
        colorId: parsedColorId,
        isVisible: true,
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

    const orders = await prisma.order.findMany({
      where: {
        archivedAt: null,
        requirements: {
          some: {
            colorId: parsedColorId,
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
}
