import { z } from 'zod';

export const getDeliveriesQuerySchema = z.object({
  // Fastify schema converts to number, so accept both string and number
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined) return 1;
      if (typeof val === 'number') return val;
      return parseInt(val, 10);
    }),
  pageSize: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined) return 100;
      if (typeof val === 'number') return val;
      return parseInt(val, 10);
    }),
});

export type GetDeliveriesQuery = z.infer<typeof getDeliveriesQuerySchema>;
