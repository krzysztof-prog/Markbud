/**
 * Timesheets validation schemas
 * Moduł godzinówek produkcyjnych
 */

import { z } from 'zod';
import { idParamsSchema, paginationQuerySchema } from './common.js';

// ============================================
// WORKER SCHEMAS
// ============================================

export const createWorkerSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane').max(50, 'Imię zbyt długie'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane').max(50, 'Nazwisko zbyt długie'),
  defaultPosition: z.string().min(1, 'Domyślne stanowisko jest wymagane'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateWorkerSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  defaultPosition: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const workerParamsSchema = idParamsSchema('worker');

export const workerQuerySchema = paginationQuerySchema.extend({
  isActive: z.string().optional().transform((val) => val === 'true'),
});

// ============================================
// POSITION SCHEMAS
// ============================================

export const createPositionSchema = z.object({
  name: z.string().min(1, 'Nazwa stanowiska jest wymagana').max(50, 'Nazwa zbyt długa'),
  shortName: z.string().max(10, 'Skrót zbyt długi').optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updatePositionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  shortName: z.string().max(10).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const positionParamsSchema = idParamsSchema('position');

// ============================================
// NON-PRODUCTIVE TASK TYPE SCHEMAS
// ============================================

export const createNonProductiveTaskTypeSchema = z.object({
  name: z.string().min(1, 'Nazwa typu zadania jest wymagana').max(50, 'Nazwa zbyt długa'),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateNonProductiveTaskTypeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const nonProductiveTaskTypeParamsSchema = idParamsSchema('taskType');

// ============================================
// SPECIAL WORK TYPE SCHEMAS (Nietypówki)
// ============================================

export const createSpecialWorkTypeSchema = z.object({
  name: z.string().min(1, 'Nazwa typu nietypówki jest wymagana').max(50, 'Nazwa zbyt długa'),
  shortName: z.string().max(10, 'Skrót zbyt długi').optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateSpecialWorkTypeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  shortName: z.string().max(10).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const specialWorkTypeParamsSchema = idParamsSchema('specialWorkType');

// ============================================
// TIME ENTRY SCHEMAS
// ============================================

// Typy nieobecności
export const absenceTypeSchema = z.enum(['SICK', 'VACATION', 'ABSENT']).nullable().optional();

// Walidacja godzin (0.0 - 24.0, krok 0.5)
const hoursSchema = z
  .number()
  .min(0, 'Godziny nie mogą być ujemne')
  .max(24, 'Maksymalnie 24 godziny')
  .refine(
    (val) => val * 2 === Math.floor(val * 2),
    { message: 'Godziny muszą być wielokrotnością 0.5' }
  );

// Zadanie nieprodukcyjne w ramach wpisu
const nonProductiveTaskInputSchema = z.object({
  taskTypeId: z.number().int().positive('Nieprawidłowy typ zadania'),
  hours: hoursSchema,
  notes: z.string().max(500, 'Notatka zbyt długa').optional().nullable(),
});

// Nietypówka w ramach wpisu
const specialWorkInputSchema = z.object({
  specialTypeId: z.number().int().positive('Nieprawidłowy typ nietypówki'),
  hours: hoursSchema,
  notes: z.string().max(500, 'Notatka zbyt długa').optional().nullable(),
});

export const createTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
  workerId: z.number().int().positive('Nieprawidłowy pracownik'),
  positionId: z.number().int().positive('Nieprawidłowe stanowisko'),
  productiveHours: hoursSchema.optional().default(0),
  absenceType: absenceTypeSchema,
  notes: z.string().max(500, 'Notatka zbyt długa').optional().nullable(),
  nonProductiveTasks: z.array(nonProductiveTaskInputSchema).optional().default([]),
  specialWorks: z.array(specialWorkInputSchema).optional().default([]),
}).refine(
  (data) => {
    // Jeśli nieobecność - nie sprawdzaj sumy godzin
    if (data.absenceType) return true;
    // Suma godzin produktywnych + nieprodukcyjnych <= 24
    const totalNonProductive = data.nonProductiveTasks.reduce((sum, task) => sum + task.hours, 0);
    return data.productiveHours + totalNonProductive <= 24;
  },
  { message: 'Suma godzin nie może przekraczać 24' }
);

export const updateTimeEntrySchema = z.object({
  positionId: z.number().int().positive().optional(),
  productiveHours: hoursSchema.optional(),
  absenceType: absenceTypeSchema,
  notes: z.string().max(500).optional().nullable(),
  nonProductiveTasks: z.array(nonProductiveTaskInputSchema).optional(),
  specialWorks: z.array(specialWorkInputSchema).optional(),
}).refine(
  (data) => {
    // Jeśli nieobecność - nie sprawdzaj sumy godzin
    if (data.absenceType) return true;
    if (data.productiveHours === undefined || data.nonProductiveTasks === undefined) {
      return true; // Walidacja pełna tylko gdy oba pola są podane
    }
    const totalNonProductive = data.nonProductiveTasks.reduce((sum, task) => sum + task.hours, 0);
    return data.productiveHours + totalNonProductive <= 24;
  },
  { message: 'Suma godzin nie może przekraczać 24' }
);

export const timeEntryParamsSchema = idParamsSchema('timeEntry');

// Query dla listy wpisów (dzień lub zakres)
export const timeEntryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workerId: z.coerce.number().int().positive().optional(),
});

// ============================================
// BULK OPERATIONS (Set Standard Day)
// ============================================

// Wpis pracownika w bulk operacji
const bulkWorkerEntrySchema = z.object({
  workerId: z.number().int().positive(),
  positionId: z.number().int().positive().optional(), // Opcjonalne - użyje domyślnego
  productiveHours: hoursSchema,
});

export const setStandardDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty'),
  defaultProductiveHours: hoursSchema.default(8),
  entries: z.array(bulkWorkerEntrySchema).min(1, 'Przynajmniej jeden pracownik musi być wybrany'),
});

// Schema do ustawiania nieobecności na wiele dni (np. do końca tygodnia)
export const setAbsenceRangeSchema = z.object({
  workerId: z.number().int().positive('Nieprawidłowy pracownik'),
  positionId: z.number().int().positive('Nieprawidłowe stanowisko'),
  absenceType: z.enum(['SICK', 'VACATION', 'ABSENT']),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty początkowej'),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty końcowej'),
});

// ============================================
// CALENDAR/SUMMARY QUERIES
// ============================================

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const daySummaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type WorkerParams = z.infer<typeof workerParamsSchema>;
export type WorkerQuery = z.infer<typeof workerQuerySchema>;

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type PositionParams = z.infer<typeof positionParamsSchema>;

export type CreateNonProductiveTaskTypeInput = z.infer<typeof createNonProductiveTaskTypeSchema>;
export type UpdateNonProductiveTaskTypeInput = z.infer<typeof updateNonProductiveTaskTypeSchema>;
export type NonProductiveTaskTypeParams = z.infer<typeof nonProductiveTaskTypeParamsSchema>;

export type CreateSpecialWorkTypeInput = z.infer<typeof createSpecialWorkTypeSchema>;
export type UpdateSpecialWorkTypeInput = z.infer<typeof updateSpecialWorkTypeSchema>;
export type SpecialWorkTypeParams = z.infer<typeof specialWorkTypeParamsSchema>;

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type TimeEntryParams = z.infer<typeof timeEntryParamsSchema>;
export type TimeEntryQuery = z.infer<typeof timeEntryQuerySchema>;

export type SetStandardDayInput = z.infer<typeof setStandardDaySchema>;
export type SetAbsenceRangeInput = z.infer<typeof setAbsenceRangeSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type DaySummaryQuery = z.infer<typeof daySummaryQuerySchema>;
export type AbsenceType = z.infer<typeof absenceTypeSchema>;
