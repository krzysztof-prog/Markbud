/**
 * Common validation schemas
 *
 * Reusable Zod schemas for date handling, ID params, pagination, etc.
 * Eliminates duplication across delivery.ts, order.ts, profile.ts, etc.
 */

import { z } from 'zod';

/**
 * Date schema that accepts ISO datetime string or Date object
 * Transforms to ISO string format
 */
export const dateSchema = z
  .string()
  .datetime()
  .or(z.coerce.date().transform((d) => d.toISOString()));

/**
 * Optional date schema
 */
export const optionalDateSchema = dateSchema.optional();

/**
 * Nullable and optional date schema
 */
export const nullableDateSchema = dateSchema.nullable().optional();

/**
 * Factory function to create ID params schema with custom resource name
 * @param resourceName - Name of the resource for error message (e.g., 'delivery', 'order')
 */
export const idParamsSchema = (resourceName: string) =>
  z.object({
    id: z.string().regex(/^\d+$/, `Invalid ${resourceName} ID`),
  });

/**
 * Common pagination query schema
 * Transforms string query params to numbers
 */
export const paginationQuerySchema = z.object({
  skip: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  take: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

/**
 * Common date range query schema
 * Used for filtering by from/to dates
 */
export const dateRangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * Positive integer schema (for orderId, etc.)
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Parse string param to int with validation
 */
export const stringToIntSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number);

// Type exports
export type IdParams = z.infer<ReturnType<typeof idParamsSchema>>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
