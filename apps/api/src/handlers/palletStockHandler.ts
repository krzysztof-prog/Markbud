/**
 * Pallet Stock Handler - Request/Response handling
 * Modul paletwek produkcyjnych - obsluga requestow HTTP
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { PalletStockService } from '../services/palletStockService.js';
import {
  GetPalletDayParamsSchema,
  GetPalletMonthParamsSchema,
  UpdatePalletDayEntriesSchema,
  CorrectMorningStockSchema,
  UpdateAlertConfigSchema,
  ProductionPalletTypeSchema,
} from '../validators/pallet-stock.js';

export class PalletStockHandler {
  constructor(private service: PalletStockService) {}

  // ============================================
  // DAY OPERATIONS
  // ============================================

  /**
   * GET /api/pallet-stock/day/:date
   * Pobiera dane dnia paletowego
   */
  async getDay(
    request: FastifyRequest<{ Params: { date: string } }>,
    reply: FastifyReply
  ) {
    const { date } = GetPalletDayParamsSchema.parse(request.params);
    const day = await this.service.getDay(date);
    return reply.send(day);
  }

  /**
   * PUT /api/pallet-stock/day/:date
   * Aktualizuje wpisy dnia paletowego (zuzycie i produkcja)
   */
  async updateDay(
    request: FastifyRequest<{ Params: { date: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { date } = GetPalletDayParamsSchema.parse(request.params);
    const entries = UpdatePalletDayEntriesSchema.parse(request.body);
    const day = await this.service.updateDay(date, entries);
    return reply.send(day);
  }

  /**
   * POST /api/pallet-stock/day/:date/close
   * Zamyka dzien paletowy (uniemozliwia edycje, tylko korekty)
   */
  async closeDay(
    request: FastifyRequest<{ Params: { date: string } }>,
    reply: FastifyReply
  ) {
    const { date } = GetPalletDayParamsSchema.parse(request.params);
    const day = await this.service.closeDay(date);
    return reply.send(day);
  }

  /**
   * POST /api/pallet-stock/day/:date/entries/:type/correct
   * Koryguje stan poczatkowy (morning stock) dla danego typu palety
   */
  async correctMorningStock(
    request: FastifyRequest<{
      Params: { date: string; type: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ) {
    const { date } = GetPalletDayParamsSchema.parse(request.params);
    const type = ProductionPalletTypeSchema.parse(request.params.type);
    const correction = CorrectMorningStockSchema.parse(request.body);

    // Walidacja: typ z params musi zgadzac sie z typem z body
    if (type !== correction.type) {
      return reply.status(400).send({
        error: 'Typ palety w URL musi zgadzac sie z typem w body',
      });
    }

    const entry = await this.service.correctMorningStock(date, correction);
    return reply.send(entry);
  }

  // ============================================
  // MONTH SUMMARY & CALENDAR
  // ============================================

  /**
   * GET /api/pallet-stock/month/:year/:month
   * Pobiera podsumowanie miesiaca paletowego
   */
  async getMonthSummary(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const { year, month } = GetPalletMonthParamsSchema.parse(request.params);
    const summary = await this.service.getMonthSummary(year, month);
    return reply.send(summary);
  }

  /**
   * GET /api/pallet-stock/calendar/:year/:month
   * Pobiera kalendarz miesiaca ze statusami dni (empty/open/closed + hasAlerts)
   */
  async getCalendar(
    request: FastifyRequest<{ Params: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const { year, month } = GetPalletMonthParamsSchema.parse(request.params);
    const calendar = await this.service.getCalendar(year, month);
    return reply.send(calendar);
  }

  // ============================================
  // ALERT CONFIG
  // ============================================

  /**
   * GET /api/pallet-stock/alerts/config
   * Pobiera konfiguracje alertow stanow krytycznych
   */
  async getAlertConfig(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    const config = await this.service.getAlertConfig();
    return reply.send(config);
  }

  /**
   * PUT /api/pallet-stock/alerts/config
   * Aktualizuje konfiguracje alertow stanow krytycznych
   */
  async updateAlertConfig(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const config = UpdateAlertConfigSchema.parse(request.body);
    const updated = await this.service.updateAlertConfig(config);
    return reply.send(updated);
  }
}
