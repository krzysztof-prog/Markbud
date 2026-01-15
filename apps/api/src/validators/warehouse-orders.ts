import { z } from 'zod';

// Schema dla query parameters przy GET /warehouse-orders
export const warehouseOrderQuerySchema = z.object({
  colorId: z.coerce.number().int().positive().optional(),
  profileId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
});

export type WarehouseOrderQuery = z.infer<typeof warehouseOrderQuerySchema>;

// Schema dla params z :id
export const warehouseOrderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type WarehouseOrderIdParams = z.infer<typeof warehouseOrderIdParamsSchema>;

// Schema dla tworzenia zamówienia
export const createWarehouseOrderSchema = z.object({
  profileId: z.coerce.number().int().positive({ message: 'profileId jest wymagane' }),
  colorId: z.coerce.number().int().positive({ message: 'colorId jest wymagane' }),
  orderedBeams: z.coerce.number().int().positive({ message: 'orderedBeams musi być większe od 0' }),
  expectedDeliveryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Nieprawidłowy format daty',
  }),
  notes: z.string().optional(),
});

export type CreateWarehouseOrderInput = z.infer<typeof createWarehouseOrderSchema>;

// Schema dla aktualizacji zamówienia
export const updateWarehouseOrderSchema = z.object({
  orderedBeams: z.coerce.number().int().positive().optional(),
  expectedDeliveryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Nieprawidłowy format daty',
  }).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateWarehouseOrderInput = z.infer<typeof updateWarehouseOrderSchema>;
