import { z } from 'zod';

// =====================================================
// Query Schemas
// =====================================================

export const operatorDashboardQuerySchema = z.object({
  // Opcjonalny filtr - dla KIEROWNIK+ moze byc 'false' (wszystkie zlecenia)
  filterByUser: z.enum(['true', 'false']).optional().default('true'),
});

export type OperatorDashboardQuery = z.infer<typeof operatorDashboardQuerySchema>;

// =====================================================
// Response Schemas
// =====================================================

export const completenessStatsSchema = z.object({
  totalOrders: z.number().int().nonnegative(),
  withFiles: z.number().int().nonnegative(),
  withGlass: z.number().int().nonnegative(),
  withHardware: z.number().int().nonnegative(),
  readyForProduction: z.number().int().nonnegative(),
});

export type CompletenessStats = z.infer<typeof completenessStatsSchema>;

export const recentActivitySchema = z.object({
  id: z.number().int().positive(),
  type: z.enum([
    'order_created',
    'glass_status_changed',
    'hardware_status_changed',
    'delivery_assigned',
  ]),
  message: z.string(),
  orderNumber: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type RecentActivity = z.infer<typeof recentActivitySchema>;

export const operatorAlertSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['missing_files', 'missing_glass', 'missing_hardware', 'pending_conflict']),
  priority: z.enum(['critical', 'high', 'medium']),
  message: z.string(),
  count: z.number().int().nonnegative(),
  actionUrl: z.string(),
});

export type OperatorAlert = z.infer<typeof operatorAlertSchema>;

export const operatorDashboardResponseSchema = z.object({
  user: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    role: z.string(),
  }),
  stats: completenessStatsSchema,
  alerts: z.array(operatorAlertSchema),
  recentActivity: z.array(recentActivitySchema),
  pendingConflictsCount: z.number().int().nonnegative(),
});

export type OperatorDashboardResponse = z.infer<typeof operatorDashboardResponseSchema>;
