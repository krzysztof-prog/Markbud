/**
 * Order Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
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
  type CreateOrderInput,
  type UpdateOrderInput,
  type PatchOrderInput,
  type BulkUpdateStatusInput,
  type ForProductionQuery,
  type MonthlyProductionQuery,
} from '../validators/order.js';

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
}
