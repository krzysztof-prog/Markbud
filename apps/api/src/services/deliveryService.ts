/**
 * Delivery Service - Re-export from refactored module
 *
 * This file maintains backward compatibility for existing imports.
 * The actual implementation has been refactored into smaller modules
 * located in the ./delivery/ directory.
 *
 * @deprecated Import from './delivery/index.js' instead
 */

export { DeliveryService } from './delivery/index.js';
export type {
  ProfileRequirement,
  WeekdayStat,
  WeekdayStatsResult,
  MonthlyWindowsStat,
  MonthlyWindowsStatsResult,
  ProfileUsage,
  MonthlyProfileStat,
  MonthlyProfileStatsResult,
  CalendarMonth,
  CalendarDataResult,
  DeliveryEventData,
  OrderEventData,
  // Phase 2 & 3 types
  DeliveryDimensionsSummary,
  OptimizationValidationResult,
  OptimizationStatus,
  DeliveryNotificationType,
  NotificationPayload,
  EmailNotificationConfig,
  StatusChangeNotification,
  OrderOperationNotification,
  BatchNotification,
  // Order-Delivery types
  VariantConflictResult,
} from './delivery/index.js';

// Also export specialized services for direct use
export {
  DeliveryStatisticsService,
  DeliveryCalendarService,
  DeliveryEventEmitter,
  deliveryEventEmitter,
  DeliveryNumberGenerator,
  // Phase 2 & 3 services
  DeliveryOptimizationService,
  DeliveryNotificationService,
  deliveryNotificationService,
  // Order-Delivery service
  DeliveryOrderService,
} from './delivery/index.js';
