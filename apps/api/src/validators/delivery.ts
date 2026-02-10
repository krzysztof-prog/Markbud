/**
 * Delivery validation schemas
 */

import { z } from 'zod';
import {
  dateSchema,
  optionalDateSchema,
  idParamsSchema,
  dateRangeQuerySchema,
} from './common.js';

export const createDeliverySchema = z.object({
  deliveryDate: dateSchema,
  deliveryNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDeliverySchema = z.object({
  deliveryDate: optionalDateSchema,
  status: z.enum(['planned', 'in_progress', 'completed']).optional(),
  notes: z.string().optional(),
});

export const deliveryQuerySchema = dateRangeQuerySchema.extend({
  status: z.string().optional(),
  includeOverdue: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  // Filtruj dostawy które mają przynajmniej jedno zlecenie w podanym statusie
  hasOrdersInStatus: z.string().optional(),
});

export const deliveryParamsSchema = idParamsSchema('delivery');

export const addOrderSchema = z.object({
  orderId: z.number().int().positive('Invalid order ID'),
});

export const moveOrderSchema = z.object({
  orderId: z.number().int().positive('Invalid order ID'),
  targetDeliveryId: z.number().int().positive('Invalid target delivery ID'),
});

export const reorderSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1),
});

export const addItemSchema = z.object({
  itemType: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
});

export const completeDeliverySchema = z.object({
  productionDate: dateSchema,
});

export const bulkUpdateDatesSchema = z.object({
  fromDate: dateSchema,
  toDate: dateSchema,
  yearOffset: z.number().int().min(-10).max(10),
});

export const completeAllOrdersSchema = z.object({
  productionDate: optionalDateSchema,
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;
export type DeliveryParams = z.infer<typeof deliveryParamsSchema>;
export type AddOrderInput = z.infer<typeof addOrderSchema>;
export type MoveOrderInput = z.infer<typeof moveOrderSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type CompleteDeliveryInput = z.infer<typeof completeDeliverySchema>;
export type BulkUpdateDatesInput = z.infer<typeof bulkUpdateDatesSchema>;
export type CompleteAllOrdersInput = z.infer<typeof completeAllOrdersSchema>;

// === QUICK DELIVERY (Szybka dostawa) ===

/**
 * Walidacja listy numerów zleceń
 * Przyjmuje string z numerami oddzielonymi przecinkami, spacjami lub enterami
 */
export const validateOrderNumbersSchema = z.object({
  orderNumbers: z.string().min(1, 'Lista numerów zleceń jest wymagana'),
});

/**
 * Masowe przypisanie zleceń do dostawy
 */
export const bulkAssignOrdersSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1, 'Musisz podać co najmniej jedno zlecenie'),
  // Opcja 1: Przypisz do istniejącej dostawy
  deliveryId: z.number().int().positive().optional(),
  // Opcja 2: Utwórz nową dostawę z datą
  deliveryDate: dateSchema.optional(),
  // Zlecenia do przepięcia (użytkownik potwierdził)
  reassignOrderIds: z.array(z.number().int().positive()).optional(),
}).refine(
  (data) => data.deliveryId !== undefined || data.deliveryDate !== undefined,
  { message: 'Musisz podać deliveryId (istniejąca dostawa) lub deliveryDate (nowa dostawa)' }
);

export type ValidateOrderNumbersInput = z.infer<typeof validateOrderNumbersSchema>;
export type BulkAssignOrdersInput = z.infer<typeof bulkAssignOrdersSchema>;
