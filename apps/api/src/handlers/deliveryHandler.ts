/**
 * Delivery Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from '../services/deliveryService.js';
import { DeliveryProtocolService } from '../services/delivery-protocol-service.js';
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
  bulkUpdateDatesSchema,
  completeAllOrdersSchema,
  validateOrderNumbersSchema,
  bulkAssignOrdersSchema,
} from '../validators/delivery.js';
import { QuickDeliveryService } from '../services/delivery/QuickDeliveryService.js';
import { prisma } from '../index.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { ValidationError } from '../utils/errors.js';

export class DeliveryHandler {
  private protocolService: DeliveryProtocolService;
  private quickDeliveryService: QuickDeliveryService;

  constructor(private service: DeliveryService, protocolService?: DeliveryProtocolService) {
    this.protocolService = protocolService || new DeliveryProtocolService();
    // QuickDeliveryService wymaga repository i prisma
    const deliveryRepository = new DeliveryRepository(prisma);
    this.quickDeliveryService = new QuickDeliveryService(deliveryRepository, prisma);
  }

  async getAll(
    request: FastifyRequest<{ Querystring: { from?: string; to?: string; status?: string; includeOverdue?: string; hasOrdersInStatus?: string } }>,
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

  async completeAllOrders(
    request: FastifyRequest<{ Params: { id: string }; Body: { productionDate?: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { productionDate } = completeAllOrdersSchema.parse(request.body);
    const result = await this.service.completeAllOrders(parseInt(id), productionDate);
    return reply.send(result);
  }

  async getCalendar(
    request: FastifyRequest<{ Querystring: { month: string; year: string } }>,
    reply: FastifyReply
  ) {
    const { month, year } = request.query;

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new ValidationError('Nieprawidłowy rok lub miesiąc');
    }

    const data = await this.service.getCalendarData(yearNum, monthNum);
    return reply.send(data);
  }

  async getCalendarBatch(
    request: FastifyRequest<{ Querystring: { months: string } }>,
    reply: FastifyReply
  ) {
    // Parse months parameter
    const monthsParam = request.query.months;
    if (!monthsParam) {
      throw new ValidationError('Parametr months jest wymagany');
    }

    // Parse JSON - SyntaxError will be caught by global error handler
    let months: Array<{ month: number; year: number }>;
    try {
      months = JSON.parse(monthsParam);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError('Nieprawidłowy format JSON w parametrze months');
      }
      throw error;
    }

    if (!Array.isArray(months) || months.length === 0) {
      throw new ValidationError('Parametr months musi być niepustą tablicą');
    }

    const data = await this.service.getCalendarDataBatch(months);
    return reply.send(data);
  }

  async getProfileRequirements(
    request: FastifyRequest<{ Querystring: { from?: string } }>,
    reply: FastifyReply
  ) {
    const { from } = request.query;
    const result = await this.service.getProfileRequirements(from);
    return reply.send(result);
  }

  async getWindowsStatsByWeekday(
    request: FastifyRequest<{ Querystring: { months?: string } }>,
    reply: FastifyReply
  ) {
    const monthsBack = parseInt(request.query.months || '6', 10);

    if (isNaN(monthsBack) || monthsBack < 1 || monthsBack > 60) {
      throw new ValidationError('Nieprawidłowy parametr months (musi być między 1 a 60)');
    }

    const result = await this.service.getWindowsStatsByWeekday(monthsBack);
    return reply.send(result);
  }

  async getMonthlyWindowsStats(
    request: FastifyRequest<{ Querystring: { months?: string } }>,
    reply: FastifyReply
  ) {
    const monthsBack = parseInt(request.query.months || '6', 10);

    if (isNaN(monthsBack) || monthsBack < 1 || monthsBack > 60) {
      throw new ValidationError('Nieprawidłowy parametr months (musi być między 1 a 60)');
    }

    const result = await this.service.getMonthlyWindowsStats(monthsBack);
    return reply.send(result);
  }

  async getMonthlyProfileStats(
    request: FastifyRequest<{ Querystring: { months?: string } }>,
    reply: FastifyReply
  ) {
    const monthsBack = parseInt(request.query.months || '6', 10);

    if (isNaN(monthsBack) || monthsBack < 1 || monthsBack > 60) {
      throw new ValidationError('Nieprawidłowy parametr months (musi być między 1 a 60)');
    }

    const result = await this.service.getMonthlyProfileStats(monthsBack);
    return reply.send(result);
  }

  async getProtocol(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const deliveryId = parseInt(id, 10);

    const protocol = await this.service.getProtocolData(deliveryId);
    return reply.send(protocol);
  }

  async getProtocolPdf(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = deliveryParamsSchema.parse(request.params);
    const deliveryId = parseInt(id, 10);

    // Get protocol data from service (includes totalPallets)
    const protocolData = await this.service.getProtocolData(deliveryId);

    // Generate PDF
    const pdfBuffer = await this.protocolService.generatePdf(protocolData);

    // Return PDF with appropriate headers
    return reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="${this.protocolService.generateFilename(deliveryId)}"`
      )
      .send(pdfBuffer);
  }

  async bulkUpdateDates(
    request: FastifyRequest<{ Body: { fromDate: string; toDate: string; yearOffset: number } }>,
    reply: FastifyReply
  ) {
    const validated = bulkUpdateDatesSchema.parse(request.body);
    const result = await this.service.bulkUpdateDeliveryDates(
      new Date(validated.fromDate),
      new Date(validated.toDate),
      validated.yearOffset
    );
    return reply.send(result);
  }

  // ===================
  // Quick Delivery Operations (Szybka dostawa)
  // ===================

  /**
   * POST /api/deliveries/validate-orders
   * Waliduje listę numerów zleceń - sprawdza czy istnieją i czy są przypisane
   */
  async validateOrderNumbers(
    request: FastifyRequest<{ Body: { orderNumbers: string } }>,
    reply: FastifyReply
  ) {
    const validated = validateOrderNumbersSchema.parse(request.body);

    // Parsuj string na tablicę numerów
    const orderNumbers = this.quickDeliveryService.parseOrderNumbers(validated.orderNumbers);

    if (orderNumbers.length === 0) {
      throw new ValidationError('Lista numerów zleceń jest pusta');
    }

    // Waliduj numery
    const result = await this.quickDeliveryService.validateOrderNumbers(orderNumbers);

    return reply.send(result);
  }

  /**
   * POST /api/deliveries/bulk-assign
   * Masowo przypisuje zlecenia do dostawy (nowej lub istniejącej)
   */
  async bulkAssignOrders(
    request: FastifyRequest<{
      Body: {
        orderIds: number[];
        deliveryId?: number;
        deliveryDate?: string;
        reassignOrderIds?: number[];
      };
    }>,
    reply: FastifyReply
  ) {
    const validated = bulkAssignOrdersSchema.parse(request.body);

    const result = await this.quickDeliveryService.bulkAssignOrders({
      orderIds: validated.orderIds,
      deliveryId: validated.deliveryId,
      deliveryDate: validated.deliveryDate,
      reassignOrderIds: validated.reassignOrderIds,
    });

    return reply.status(201).send(result);
  }

  /**
   * GET /api/deliveries/for-date?date=YYYY-MM-DD
   * Pobiera listę dostaw na podaną datę (do wyboru w UI)
   */
  async getDeliveriesForDate(
    request: FastifyRequest<{ Querystring: { date: string } }>,
    reply: FastifyReply
  ) {
    const { date } = request.query;

    if (!date) {
      throw new ValidationError('Parametr date jest wymagany');
    }

    const deliveries = await this.quickDeliveryService.getDeliveriesForDate(date);

    return reply.send(deliveries);
  }

  /**
   * GET /api/deliveries/preview-number?date=YYYY-MM-DD
   * Podgląd numeru następnej dostawy dla daty
   */
  async previewDeliveryNumber(
    request: FastifyRequest<{ Querystring: { date: string } }>,
    reply: FastifyReply
  ) {
    const { date } = request.query;

    if (!date) {
      throw new ValidationError('Parametr date jest wymagany');
    }

    const deliveryNumber = await this.quickDeliveryService.previewNextDeliveryNumber(date);

    return reply.send({ deliveryNumber });
  }
}
