/**
 * Order validation schemas
 */

import { z } from 'zod';
import {
  optionalDateSchema,
  nullableDateSchema,
  idParamsSchema,
  paginationQuerySchema,
} from './common.js';

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1).max(100),
  customerId: z.number().int().positive().optional(),
  status: z.string().optional(),
  deliveryDate: optionalDateSchema,
  valuePln: z.number().optional(),
  valueEur: z.number().optional(),
});

export const updateOrderSchema = z.object({
  status: z.string().optional(),
  deliveryDate: optionalDateSchema,
  valuePln: z.number().optional(),
  valueEur: z.number().optional(),
  notes: z.string().optional(),
});

export const patchOrderSchema = z.object({
  valuePln: z.string().nullable().optional(),
  valueEur: z.string().nullable().optional(),
  deadline: z.string().nullable().optional().transform((val) => (val ? new Date(val) : null)),
  status: z.string().nullable().optional(),
});

export const orderParamsSchema = idParamsSchema('order');

export const orderQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  archived: z.string().optional(),
  colorId: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
