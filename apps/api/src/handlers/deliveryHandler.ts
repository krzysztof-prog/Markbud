/**
 * Delivery Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from '../services/deliveryService.js';
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryQuerySchema,
  deliveryParamsSchema,
  addOrderSchema,
  moveOrderSchema,
  reorderSchema,
  addItemSchema,
  completeDeliverySchema,
} from '../validators/delivery.js';

export class DeliveryHandler {
  constructor(private service: DeliveryService) {}

  async getAll(
    request: FastifyRequest<{ Querystring: { from?: string; to?: string; status?: string } }>,
    reply: FastifyReply
  ) {
    const validated = deliveryQuerySchema.parse(request.query);
    const deliveries = await this.service.getAllDeliveries(validated);
    return reply.send(deliveries);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const delivery = await this.service.getDeliveryById(parseInt(id));
    return reply.send(delivery);
  }

  async create(
    request: FastifyRequest<{ Body: { deliveryDate: string; deliveryNumber?: string; notes?: string } }>,
    reply: FastifyReply
  ) {
    const validated = createDeliverySchema.parse(request.body);
    const delivery = await this.service.createDelivery(validated);
    return reply.status(201).send(delivery);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: { deliveryDate?: string; status?: string; notes?: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const validated = updateDeliverySchema.parse(request.body);
    const delivery = await this.service.updateDelivery(parseInt(id), validated);
    return reply.send(delivery);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    await this.service.deleteDelivery(parseInt(id));
    return reply.status(204).send();
  }

  async addOrder(
    request: FastifyRequest<{ Params: { id: string }; Body: { orderId: number } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderId } = addOrderSchema.parse(request.body);
    const deliveryOrder = await this.service.addOrderToDelivery(parseInt(id), orderId);
    return reply.status(201).send(deliveryOrder);
  }

  async removeOrder(
    request: FastifyRequest<{ Params: { id: string; orderId: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const orderId = parseInt(request.params.orderId, 10);
    await this.service.removeOrderFromDelivery(parseInt(id), orderId);
    return reply.status(204).send();
  }

  async reorderOrders(
    request: FastifyRequest<{ Params: { id: string }; Body: { orderIds: number[] } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderIds } = reorderSchema.parse(request.body);
    const result = await this.service.reorderDeliveryOrders(parseInt(id), orderIds);
    return reply.send(result);
  }

  async moveOrder(
    request: FastifyRequest<{ Params: { id: string }; Body: { orderId: number; targetDeliveryId: number } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderId, targetDeliveryId } = moveOrderSchema.parse(request.body);
    const deliveryOrder = await this.service.moveOrderBetweenDeliveries(parseInt(id), targetDeliveryId, orderId);
    return reply.send(deliveryOrder);
  }

  async addItem(
    request: FastifyRequest<{ Params: { id: string }; Body: { itemType: string; description: string; quantity: number } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const validated = addItemSchema.parse(request.body);
    const item = await this.service.addItemToDelivery(parseInt(id), validated);
    return reply.status(201).send(item);
  }

  async removeItem(
    request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const itemId = parseInt(request.params.itemId, 10);
    await this.service.removeItemFromDelivery(parseInt(id), itemId);
    return reply.status(204).send();
  }

  async complete(
    request: FastifyRequest<{ Params: { id: string }; Body: { productionDate: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { productionDate } = completeDeliverySchema.parse(request.body);
    const result = await this.service.completeDelivery(parseInt(id), productionDate);
    return reply.send(result);
  }
}
