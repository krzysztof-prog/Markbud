/**
 * Pallet Handler - Request/Response handling for pallet optimization
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { PalletOptimizerService } from '../services/pallet-optimizer/PalletOptimizerService.js';
import { PdfExportService } from '../services/pallet-optimizer/PdfExportService.js';
import {
  optimizeDeliveryParamsSchema,
  palletTypeSchema,
  updatePalletTypeSchema,
  palletTypeParamsSchema,
  packingRuleSchema,
  updatePackingRuleSchema,
  packingRuleParamsSchema,
} from '../validators/pallet.js';

export class PalletHandler {
  private pdfService: PdfExportService;

  constructor(private service: PalletOptimizerService) {
    this.pdfService = new PdfExportService();
  }

  // ==================== OPTYMALIZACJA ====================

  /**
   * POST /api/pallets/optimize/:deliveryId
   * Uruchom optymalizację pakowania dla dostawy
   */
  async optimizeDelivery(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    const { deliveryId } = optimizeDeliveryParamsSchema.parse(request.params);
    const result = await this.service.optimizeDelivery(parseInt(deliveryId));
    return reply.status(201).send(result);
  }

  /**
   * GET /api/pallets/optimization/:deliveryId
   * Pobierz zapisaną optymalizację
   */
  async getOptimization(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    const { deliveryId } = optimizeDeliveryParamsSchema.parse(request.params);
    const result = await this.service.getOptimization(parseInt(deliveryId));

    if (!result) {
      return reply.status(404).send({ error: 'Optimization not found' });
    }

    return reply.send(result);
  }

  /**
   * DELETE /api/pallets/optimization/:deliveryId
   * Usuń optymalizację
   */
  async deleteOptimization(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    const { deliveryId } = optimizeDeliveryParamsSchema.parse(request.params);
    await this.service.deleteOptimization(parseInt(deliveryId));
    return reply.status(204).send();
  }

  /**
   * GET /api/pallets/export/:deliveryId
   * Eksportuj optymalizację do PDF
   */
  async exportToPdf(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    const { deliveryId } = optimizeDeliveryParamsSchema.parse(request.params);

    // Pobierz optymalizację
    const result = await this.service.getOptimization(parseInt(deliveryId));

    if (!result) {
      return reply.status(404).send({ error: 'Optimization not found' });
    }

    // Generuj PDF
    const pdfBuffer = await this.pdfService.generatePdf(result);
    const filename = this.pdfService.generateFilename(parseInt(deliveryId));

    // Ustaw nagłówki i wyślij PDF
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  }

  // ==================== TYPY PALET ====================

  /**
   * GET /api/pallets/types
   * Pobierz wszystkie typy palet
   */
  async getPalletTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const palletTypes = await this.service.getAllPalletTypes();
    return reply.send(palletTypes);
  }

  /**
   * POST /api/pallets/types
   * Utwórz nowy typ palety
   */
  async createPalletType(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const validated = palletTypeSchema.parse(request.body);
    const created = await this.service.createPalletType(validated);
    return reply.status(201).send(created);
  }

  /**
   * PATCH /api/pallets/types/:id
   * Zaktualizuj typ palety
   */
  async updatePalletType(
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { id } = palletTypeParamsSchema.parse(request.params);
    const validated = updatePalletTypeSchema.parse(request.body);
    const updated = await this.service.updatePalletType(parseInt(id), validated);
    return reply.send(updated);
  }

  /**
   * DELETE /api/pallets/types/:id
   * Usuń typ palety
   */
  async deletePalletType(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = palletTypeParamsSchema.parse(request.params);
    await this.service.deletePalletType(parseInt(id));
    return reply.status(204).send();
  }

  // ==================== REGUŁY PAKOWANIA ====================
  // (Opcjonalne - może być zaimplementowane później)

  /**
   * GET /api/pallets/rules
   * Pobierz reguły pakowania
   */
  async getPackingRules(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    return reply.status(501).send({ error: 'Not implemented yet' });
  }

  /**
   * POST /api/pallets/rules
   * Utwórz nową regułę pakowania
   */
  async createPackingRule(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const validated = packingRuleSchema.parse(request.body);
    return reply.status(501).send({ error: 'Not implemented yet' });
  }

  /**
   * PATCH /api/pallets/rules/:id
   * Zaktualizuj regułę pakowania
   */
  async updatePackingRule(
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { id } = packingRuleParamsSchema.parse(request.params);
    const validated = updatePackingRuleSchema.parse(request.body);
    return reply.status(501).send({ error: 'Not implemented yet' });
  }

  /**
   * DELETE /api/pallets/rules/:id
   * Usuń regułę pakowania
   */
  async deletePackingRule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = packingRuleParamsSchema.parse(request.params);
    return reply.status(501).send({ error: 'Not implemented yet' });
  }
}
