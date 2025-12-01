/**
 * Order Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../services/orderService.js';
import {
  createOrderSchema,
  updateOrderSchema,
  orderParamsSchema,
  orderQuerySchema,
} from '../validators/order.js';

export class OrderHandler {
  constructor(private service: OrderService) {}

  async getAll(
    request: FastifyRequest<{ Querystring: { status?: string; archived?: string; colorId?: string } }>,
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
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    const validated = createOrderSchema.parse(request.body);
    const order = await this.service.createOrder(validated);
    return reply.status(201).send(order);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
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
}
