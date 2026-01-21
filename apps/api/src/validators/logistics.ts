/**
 * Logistics mail validation schemas
 *
 * Zod schemas dla parsowania i zapisywania list mailowych logistyki
 */

import { z } from 'zod';
import {
  dateSchema,
  idParamsSchema,
  dateRangeQuerySchema,
} from './common.js';

// Typy flag (zgodne z LogisticsMailParser)
export const itemFlagSchema = z.enum([
  'REQUIRES_MESH',
  'MISSING_FILE',
  'UNCONFIRMED',
  'DIMENSIONS_UNCONFIRMED',
  'DRAWING_UNCONFIRMED',
  'EXCLUDE_FROM_PRODUCTION',
  'SPECIAL_HANDLE',
  'CUSTOM_COLOR',
]);

// Status pozycji
export const itemStatusSchema = z.enum(['ok', 'blocked', 'waiting', 'excluded']);

// Status dostawy
export const deliveryStatusSchema = z.enum(['ready', 'blocked', 'conditional']);

/**
 * Schema do parsowania maila (tylko tekst)
 */
export const parseMailSchema = z.object({
  mailText: z.string().min(1, 'Tekst maila jest wymagany'),
});

/**
 * Schema pozycji do zapisania
 */
export const saveMailItemSchema = z.object({
  position: z.number().int().positive('Pozycja musi być dodatnia'),
  projectNumber: z.string().min(1, 'Numer projektu jest wymagany').regex(
    /^[A-Z]\d{3,5}$/,
    'Nieprawidłowy format numeru projektu (litera + 3-5 cyfr)'
  ),
  quantity: z.number().int().positive('Ilość musi być dodatnia').default(1),
  rawNotes: z.string().optional(),
  flags: z.array(itemFlagSchema).default([]),
  customColor: z.string().optional(),
  orderId: z.number().int().positive().optional(),
});

/**
 * Schema do zapisania listy mailowej
 */
export const saveMailListSchema = z.object({
  deliveryDate: dateSchema,
  deliveryIndex: z.number().int().positive('Index dostawy musi być dodatni'),
  deliveryCode: z.string().min(1, 'Kod dostawy jest wymagany'),
  isUpdate: z.boolean().default(false),
  rawMailText: z.string().min(1, 'Tekst maila jest wymagany'),
  items: z.array(saveMailItemSchema).min(1, 'Lista musi zawierać przynajmniej jedną pozycję'),
});

/**
 * Schema query dla list mailowych
 */
export const mailListQuerySchema = dateRangeQuerySchema.extend({
  deliveryCode: z.string().optional(),
  includeDeleted: z.string().transform(v => v === 'true').optional(),
});

/**
 * Schema params dla ID listy
 */
export const mailListParamsSchema = idParamsSchema('mail list');

/**
 * Schema params dla kodu dostawy
 */
export const deliveryCodeParamsSchema = z.object({
  code: z.string().min(1, 'Kod dostawy jest wymagany'),
});

/**
 * Schema query dla diff między wersjami
 */
export const versionDiffQuerySchema = z.object({
  versionFrom: z.string().regex(/^\d+$/, 'Nieprawidłowy numer wersji').transform(Number),
  versionTo: z.string().regex(/^\d+$/, 'Nieprawidłowy numer wersji').transform(Number),
});

/**
 * Schema query dla kalendarza
 */
export const calendarQuerySchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

/**
 * Schema do aktualizacji pozycji (np. ręczne przypisanie Order)
 */
export const updateMailItemSchema = z.object({
  orderId: z.number().int().positive().nullable().optional(),
  flags: z.array(itemFlagSchema).optional(),
});

/**
 * Schema params dla ID pozycji
 */
export const mailItemParamsSchema = idParamsSchema('mail item');

// Type exports
export type ItemFlag = z.infer<typeof itemFlagSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type ParseMailInput = z.infer<typeof parseMailSchema>;
export type SaveMailItemInput = z.infer<typeof saveMailItemSchema>;
export type SaveMailListInput = z.infer<typeof saveMailListSchema>;
export type MailListQuery = z.infer<typeof mailListQuerySchema>;
export type MailListParams = z.infer<typeof mailListParamsSchema>;
export type DeliveryCodeParams = z.infer<typeof deliveryCodeParamsSchema>;
export type VersionDiffQuery = z.infer<typeof versionDiffQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type UpdateMailItemInput = z.infer<typeof updateMailItemSchema>;
export type MailItemParams = z.infer<typeof mailItemParamsSchema>;
