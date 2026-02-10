import { z } from 'zod';

/**
 * Validation schemas for Dashboard endpoints
 */

// ============================================================================
// Shared Types
// ============================================================================

const alertPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
const alertTypeSchema = z.enum(['shortage', 'import', 'delivery']);
const deliveryStatusSchema = z.enum(['planned', 'in_preparation', 'ready', 'shipped', 'delivered']);

// ============================================================================
// Query Params Schemas
// ============================================================================

export const monthlyStatsQuerySchema = z.object({
  month: z.string().regex(/^([1-9]|1[0-2])$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

export type MonthlyStatsQuery = z.infer<typeof monthlyStatsQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

// GET /api/dashboard - Main dashboard data
export const dashboardDataSchema = z.object({
  stats: z.object({
    activeOrders: z.number().int().nonnegative(),
    upcomingDeliveriesCount: z.number().int().nonnegative(),
    pendingImportsCount: z.number().int().nonnegative(),
    shortagesCount: z.number().int().nonnegative(),
  }),
  upcomingDeliveries: z.array(
    z.object({
      id: z.number().int().positive(),
      deliveryDate: z.string().datetime(),
      status: deliveryStatusSchema,
      ordersCount: z.number().int().nonnegative(),
      weekNumber: z.number().int().positive(),
    })
  ),
  pendingImports: z.array(
    z.object({
      id: z.number().int().positive(),
      filename: z.string(),
      fileType: z.string(),
      status: z.string(),
      createdAt: z.date(),
      errorMessage: z.string().nullable(),
    })
  ),
  shortages: z.array(
    z.object({
      profileId: z.number().int().positive(),
      profileNumber: z.string(),
      colorId: z.number().int().positive(),
      colorCode: z.string(),
      colorName: z.string(),
      currentStock: z.number().int().nonnegative(),
      demand: z.number().int().nonnegative(),
      shortage: z.number().int().positive(),
      priority: alertPrioritySchema,
    })
  ),
  recentOrders: z.array(
    z.object({
      id: z.number().int().positive(),
      orderNumber: z.string(),
      status: z.string(),
      createdAt: z.date(),
      valuePln: z.number().nullable(),
    })
  ),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// GET /api/dashboard/alerts - Alerts list
export const alertSchema = z.object({
  id: z.number().int().positive(),
  type: alertTypeSchema,
  priority: alertPrioritySchema,
  message: z.string(),
  details: z.string(),
  timestamp: z.string().datetime(),
  data: z.any().optional(),
});

export const alertsResponseSchema = z.array(alertSchema);

export type Alert = z.infer<typeof alertSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;

// GET /api/dashboard/stats/weekly - Weekly statistics
export const weekStatSchema = z.object({
  weekNumber: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  deliveriesCount: z.number().int().nonnegative(),
  ordersCount: z.number().int().nonnegative(),
  windows: z.number().int().nonnegative(),
  sashes: z.number().int().nonnegative(),
  glasses: z.number().int().nonnegative(),
});

export const weeklyStatsResponseSchema = z.object({
  weeks: z.array(weekStatSchema),
});

export type WeekStat = z.infer<typeof weekStatSchema>;
export type WeeklyStatsResponse = z.infer<typeof weeklyStatsResponseSchema>;

// GET /api/dashboard/stats/monthly - Monthly statistics
export const monthlyStatsResponseSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  totalOrders: z.number().int().nonnegative(),
  totalWindows: z.number().int().nonnegative(),
  totalValuePln: z.number().nonnegative(),
  totalValueEur: z.number().nonnegative(),
  totalDeliveries: z.number().int().nonnegative(),
});

export type MonthlyStatsResponse = z.infer<typeof monthlyStatsResponseSchema>;

// ============================================================================
// Internal Data Types (for repository layer)
// ============================================================================

export const shortageResultSchema = z.object({
  profileId: z.number().int().positive(),
  profileNumber: z.string(),
  colorId: z.number().int().positive(),
  colorCode: z.string(),
  colorName: z.string(),
  currentStock: z.number().int().nonnegative(),
  demand: z.number(),
  afterDemand: z.number(),
  shortage: z.number(),
});

export type ShortageResult = z.infer<typeof shortageResultSchema>;

export const weekStatRawSchema = z.object({
  deliveryDate: z.string(),
  deliveriesCount: z.number(),
  ordersCount: z.number(),
  windowsCount: z.number(),
  sashesCount: z.number(),
  glassesCount: z.number(),
});

export type WeekStatRaw = z.infer<typeof weekStatRawSchema>;
