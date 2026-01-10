/**
 * Order validation schemas
 */

import { z } from 'zod';
import {
  optionalDateSchema,
  idParamsSchema,
  paginationQuerySchema,
} from './common.js';

// Order number validation - accepts formats like: "54222", "54222-a", "54222a"
const orderNumberSchema = z
  .string()
  .trim()
  .min(1, 'Numer zlecenia nie może być pusty')
  .max(50, 'Numer zlecenia zbyt długi')
  .regex(/^[\w\s-]+$/, 'Niedozwolone znaki w numerze zlecenia');

// Financial value validation - non-negative, finite numbers
const financialValueSchema = z
  .number()
  .nonnegative('Wartość nie może być ujemna')
  .finite('Wartość musi być liczbą skończoną')
  .max(999999999.99, 'Wartość zbyt duża');

export const createOrderSchema = z.object({
  orderNumber: orderNumberSchema,
  customerId: z.number().int().positive().optional(),
  status: z.string().optional(),
  deliveryDate: optionalDateSchema,
  valuePln: financialValueSchema.optional(),
  valueEur: financialValueSchema.optional(),
});

export const updateOrderSchema = z.object({
  status: z.string().optional(),
  deliveryDate: optionalDateSchema,
  valuePln: financialValueSchema.optional(),
  valueEur: financialValueSchema.optional(),
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

// Bulk update status schema
export const bulkUpdateStatusSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1, 'Przynajmniej jedno zlecenie musi być wybrane'),
  status: z.enum(['new', 'in_progress', 'completed', 'archived'], {
    errorMap: () => ({ message: 'Nieprawidłowy status' }),
  }),
  productionDate: z
    .string()
    .datetime({ message: 'Nieprawidłowy format daty' })
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const productionDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return productionDate <= today;
      },
      { message: 'Data produkcji nie może być w przyszłości' }
    )
    .refine(
      (date) => {
        if (!date) return true;
        const productionDate = new Date(date);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        return productionDate >= sixtyDaysAgo;
      },
      { message: 'Data produkcji nie może być starsza niż 60 dni' }
    ),
});

// For production query schema
export const forProductionQuerySchema = z.object({
  overdueDays: z.coerce.number().nonnegative().optional().default(0),
  upcomingDays: z.coerce.number().nonnegative().optional().default(14),
  deliveriesLimit: z.coerce.number().positive().optional().default(5),
});

// Monthly production query schema
export const monthlyProductionQuerySchema = z.object({
  year: z.string(),
  month: z.string(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
export type ForProductionQuery = z.infer<typeof forProductionQuerySchema>;
export type MonthlyProductionQuery = z.infer<typeof monthlyProductionQuerySchema>;
