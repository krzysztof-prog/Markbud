/**
 * Order validation schemas
 */

import { z } from 'zod';

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1).max(100),
  customerId: z.number().int().positive().optional(),
  status: z.string().optional(),
  deliveryDate: z.string().datetime().or(z.coerce.date().transform(d => d.toISOString())).optional(),
  valuePln: z.number().optional(),
  valueEur: z.number().optional(),
});

export const updateOrderSchema = z.object({
  status: z.string().optional(),
  deliveryDate: z.string().datetime().or(z.coerce.date().transform(d => d.toISOString())).optional(),
  valuePln: z.number().optional(),
  valueEur: z.number().optional(),
  notes: z.string().optional(),
});

export const patchOrderSchema = z.object({
  valuePln: z.string().nullable().optional(),
  valueEur: z.string().nullable().optional(),
  deadline: z.string().datetime().or(z.coerce.date().transform(d => d.toISOString())).nullable().optional(),
  status: z.string().nullable().optional(),
});

export const orderParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid order ID'),
});

export const orderQuerySchema = z.object({
  status: z.string().optional(),
  archived: z.string().optional(),
  colorId: z.string().optional(),
  skip: z.string().regex(/^\d+$/).transform(Number).optional(),
  take: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
