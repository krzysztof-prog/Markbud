/**
 * Warehouse validation schemas
 */

import { z } from 'zod';
import { idParamsSchema } from './common.js';

export const warehouseStatsQuerySchema = z.object({
  profileId: z.string().regex(/^\d+$/).optional(),
  colorId: z.string().regex(/^\d+$/).optional(),
});

export const warehouseOrderParamsSchema = idParamsSchema('warehouse order');

export const updateWarehouseOrderSchema = z.object({
  status: z.enum(['pending', 'received', 'archived']).optional(),
  notes: z.string().optional(),
});

export type WarehouseStatsQuery = z.infer<typeof warehouseStatsQuerySchema>;
export type WarehouseOrderParams = z.infer<typeof warehouseOrderParamsSchema>;
export type UpdateWarehouseOrderInput = z.infer<typeof updateWarehouseOrderSchema>;
