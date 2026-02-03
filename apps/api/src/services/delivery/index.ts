/**
 * Delivery Services - Main export file
 *
 * This module provides delivery-related services split by responsibility:
 * - DeliveryService: Main orchestrator + CRUD operations
 * - DeliveryStatisticsService: Analytics and statistics
 * - DeliveryCalendarService: Calendar data aggregation
 * - DeliveryEventEmitter: Event emission utilities
 * - DeliveryNumberGenerator: Delivery number generation
 * - DeliveryOptimizationService: Pallet packing and optimization algorithms
 * - DeliveryNotificationService: Notification handling (WebSocket, email)
 * - DeliveryOrderService: Order-Delivery association management
 */

// Main service (orchestrator + CRUD)
export { DeliveryService } from './DeliveryService.js';

// Specialized services
export { DeliveryStatisticsService } from './DeliveryStatisticsService.js';
export type {
  ProfileRequirement,
  WeekdayStat,
  WeekdayStatsResult,
  MonthlyWindowsStat,
  MonthlyWindowsStatsResult,
  ProfileUsage,
  MonthlyProfileStat,
  MonthlyProfileStatsResult,
} from './DeliveryStatisticsService.js';

export { DeliveryCalendarService } from './DeliveryCalendarService.js';
export type { CalendarMonth, CalendarDataResult } from './DeliveryCalendarService.js';

export { DeliveryEventEmitter, deliveryEventEmitter } from './DeliveryEventEmitter.js';
export type { DeliveryEventData, OrderEventData } from './DeliveryEventEmitter.js';

export { DeliveryNumberGenerator } from './DeliveryNumberGenerator.js';

// Phase 2 & 3: Optimization and Notification services
export { DeliveryOptimizationService } from './DeliveryOptimizationService.js';
export type {
  DeliveryDimensionsSummary,
  OptimizationValidationResult,
  OptimizationStatus,
} from './DeliveryOptimizationService.js';

export { DeliveryNotificationService, deliveryNotificationService } from './DeliveryNotificationService.js';
export type {
  DeliveryNotificationType,
  NotificationPayload,
  EmailNotificationConfig,
  StatusChangeNotification,
  OrderOperationNotification,
  BatchNotification,
} from './DeliveryNotificationService.js';

// Order-Delivery association management
export { DeliveryOrderService } from './DeliveryOrderService.js';
export type { VariantConflictResult } from './DeliveryOrderService.js';

// Quick Delivery - szybkie tworzenie dostaw z listy zleceń
export { QuickDeliveryService } from './QuickDeliveryService.js';
export type {
  ValidatedOrder,
  ValidateOrdersResult,
  BulkAssignResult,
} from './QuickDeliveryService.js';
