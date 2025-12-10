import { z } from 'zod';

// ==================== GLASS ORDER SCHEMAS ====================

export const glassOrderFiltersSchema = z.object({
  status: z.string().optional(),
  orderNumber: z.string().optional(),
});

export const glassOrderIdParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Nieprawidłowe ID');
    return num;
  }),
});

export const glassOrderStatusUpdateSchema = z.object({
  status: z.enum(['ordered', 'partially_delivered', 'delivered', 'cancelled']),
});

// ==================== GLASS DELIVERY SCHEMAS ====================

export const glassDeliveryFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const glassDeliveryIdParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Nieprawidłowe ID');
    return num;
  }),
});

// ==================== GLASS VALIDATION SCHEMAS ====================

export const glassValidationFiltersSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']).optional(),
  resolved: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
});

export const glassValidationResolveSchema = z.object({
  resolvedBy: z.string().min(1, 'Pole resolvedBy jest wymagane'),
  notes: z.string().optional(),
});

export const glassValidationOrderNumberParamsSchema = z.object({
  orderNumber: z.string().min(1, 'Numer zlecenia jest wymagany'),
});

// ==================== TYPE EXPORTS ====================

export type GlassOrderFilters = z.infer<typeof glassOrderFiltersSchema>;
export type GlassOrderIdParams = z.infer<typeof glassOrderIdParamsSchema>;
export type GlassOrderStatusUpdate = z.infer<typeof glassOrderStatusUpdateSchema>;
export type GlassDeliveryFilters = z.infer<typeof glassDeliveryFiltersSchema>;
export type GlassDeliveryIdParams = z.infer<typeof glassDeliveryIdParamsSchema>;
export type GlassValidationFilters = z.infer<typeof glassValidationFiltersSchema>;
export type GlassValidationResolve = z.infer<typeof glassValidationResolveSchema>;
