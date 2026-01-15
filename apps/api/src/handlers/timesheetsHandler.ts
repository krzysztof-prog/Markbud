/**
 * Timesheets Handler - Request/Response handling
 * Moduł godzinówek produkcyjnych
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { TimesheetsService } from '../services/timesheetsService.js';
import {
  createWorkerSchema,
  updateWorkerSchema,
  workerParamsSchema,
  workerQuerySchema,
  createPositionSchema,
  updatePositionSchema,
  positionParamsSchema,
  createNonProductiveTaskTypeSchema,
  updateNonProductiveTaskTypeSchema,
  nonProductiveTaskTypeParamsSchema,
  createSpecialWorkTypeSchema,
  updateSpecialWorkTypeSchema,
  specialWorkTypeParamsSchema,
  createTimeEntrySchema,
  updateTimeEntrySchema,
  timeEntryParamsSchema,
  timeEntryQuerySchema,
  setStandardDaySchema,
  setAbsenceRangeSchema,
  calendarQuerySchema,
  daySummaryQuerySchema,
} from '../validators/timesheets.js';

export class TimesheetsHandler {
  constructor(private service: TimesheetsService) {}

  // ============================================
  // WORKERS
  // ============================================

  async getAllWorkers(
    request: FastifyRequest<{ Querystring: { isActive?: string } }>,
    reply: FastifyReply
  ) {
    const query = workerQuerySchema.parse(request.query);
    const workers = await this.service.getAllWorkers(query.isActive);
    return reply.send(workers);
  }

  async getWorkerById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = workerParamsSchema.parse(request.params);
    const worker = await this.service.getWorkerById(parseInt(id));
    return reply.send(worker);
  }

  async createWorker(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = createWorkerSchema.parse(request.body);
    const worker = await this.service.createWorker(validated);
    return reply.status(201).send(worker);
  }

  async updateWorker(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = workerParamsSchema.parse(request.params);
    const validated = updateWorkerSchema.parse(request.body);
    const worker = await this.service.updateWorker(parseInt(id), validated);
    return reply.send(worker);
  }

  async deactivateWorker(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = workerParamsSchema.parse(request.params);
    const worker = await this.service.deactivateWorker(parseInt(id));
    return reply.send(worker);
  }

  // ============================================
  // POSITIONS
  // ============================================

  async getAllPositions(
    request: FastifyRequest<{ Querystring: { isActive?: string } }>,
    reply: FastifyReply
  ) {
    const isActive = request.query.isActive === 'true';
    const positions = await this.service.getAllPositions(isActive);
    return reply.send(positions);
  }

  async getPositionById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = positionParamsSchema.parse(request.params);
    const position = await this.service.getPositionById(parseInt(id));
    return reply.send(position);
  }

  async createPosition(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = createPositionSchema.parse(request.body);
    const position = await this.service.createPosition(validated);
    return reply.status(201).send(position);
  }

  async updatePosition(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = positionParamsSchema.parse(request.params);
    const validated = updatePositionSchema.parse(request.body);
    const position = await this.service.updatePosition(parseInt(id), validated);
    return reply.send(position);
  }

  // ============================================
  // NON-PRODUCTIVE TASK TYPES
  // ============================================

  async getAllNonProductiveTaskTypes(
    request: FastifyRequest<{ Querystring: { isActive?: string } }>,
    reply: FastifyReply
  ) {
    const isActive = request.query.isActive === 'true';
    const taskTypes = await this.service.getAllNonProductiveTaskTypes(isActive);
    return reply.send(taskTypes);
  }

  async getNonProductiveTaskTypeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = nonProductiveTaskTypeParamsSchema.parse(request.params);
    const taskType = await this.service.getNonProductiveTaskTypeById(parseInt(id));
    return reply.send(taskType);
  }

  async createNonProductiveTaskType(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = createNonProductiveTaskTypeSchema.parse(request.body);
    const taskType = await this.service.createNonProductiveTaskType(validated);
    return reply.status(201).send(taskType);
  }

  async updateNonProductiveTaskType(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = nonProductiveTaskTypeParamsSchema.parse(request.params);
    const validated = updateNonProductiveTaskTypeSchema.parse(request.body);
    const taskType = await this.service.updateNonProductiveTaskType(parseInt(id), validated);
    return reply.send(taskType);
  }

  // ============================================
  // SPECIAL WORK TYPES (Nietypówki)
  // ============================================

  async getAllSpecialWorkTypes(
    request: FastifyRequest<{ Querystring: { isActive?: string } }>,
    reply: FastifyReply
  ) {
    const isActive = request.query.isActive === 'true';
    const specialTypes = await this.service.getAllSpecialWorkTypes(isActive);
    return reply.send(specialTypes);
  }

  async getSpecialWorkTypeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = specialWorkTypeParamsSchema.parse(request.params);
    const specialType = await this.service.getSpecialWorkTypeById(parseInt(id));
    return reply.send(specialType);
  }

  async createSpecialWorkType(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = createSpecialWorkTypeSchema.parse(request.body);
    const specialType = await this.service.createSpecialWorkType(validated);
    return reply.status(201).send(specialType);
  }

  async updateSpecialWorkType(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = specialWorkTypeParamsSchema.parse(request.params);
    const validated = updateSpecialWorkTypeSchema.parse(request.body);
    const specialType = await this.service.updateSpecialWorkType(parseInt(id), validated);
    return reply.send(specialType);
  }

  async toggleSpecialWorkType(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = specialWorkTypeParamsSchema.parse(request.params);
    const specialType = await this.service.toggleSpecialWorkType(parseInt(id));
    return reply.send(specialType);
  }

  // ============================================
  // TIME ENTRIES
  // ============================================

  async getTimeEntries(
    request: FastifyRequest<{ Querystring: { date?: string; from?: string; to?: string; workerId?: string } }>,
    reply: FastifyReply
  ) {
    const query = timeEntryQuerySchema.parse(request.query);
    const entries = await this.service.getTimeEntries(query);
    return reply.send(entries);
  }

  async getTimeEntryById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = timeEntryParamsSchema.parse(request.params);
    const entry = await this.service.getTimeEntryById(parseInt(id));
    return reply.send(entry);
  }

  async createTimeEntry(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = createTimeEntrySchema.parse(request.body);
    const entry = await this.service.createTimeEntry(validated);
    return reply.status(201).send(entry);
  }

  async updateTimeEntry(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const { id } = timeEntryParamsSchema.parse(request.params);
    const validated = updateTimeEntrySchema.parse(request.body);
    const entry = await this.service.updateTimeEntry(parseInt(id), validated);
    return reply.send(entry);
  }

  async deleteTimeEntry(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = timeEntryParamsSchema.parse(request.params);
    await this.service.deleteTimeEntry(parseInt(id));
    return reply.status(204).send();
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async setStandardDay(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = setStandardDaySchema.parse(request.body);
    const entries = await this.service.setStandardDay(validated);
    return reply.send(entries);
  }

  async setAbsenceRange(
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) {
    const validated = setAbsenceRangeSchema.parse(request.body);
    const entries = await this.service.setAbsenceRange(validated);
    return reply.send(entries);
  }

  // ============================================
  // CALENDAR & SUMMARY
  // ============================================

  async getCalendarSummary(
    request: FastifyRequest<{ Querystring: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const query = calendarQuerySchema.parse(request.query);
    const summary = await this.service.getCalendarSummary(query);
    return reply.send(summary);
  }

  async getDaySummary(
    request: FastifyRequest<{ Querystring: { date: string } }>,
    reply: FastifyReply
  ) {
    const query = daySummaryQuerySchema.parse(request.query);
    const summary = await this.service.getDaySummary(query.date);
    return reply.send(summary);
  }
}
