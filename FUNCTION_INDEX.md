# AKROBUD - Indeks Funkcji

> Kompletny indeks eksportowanych funkcji, klas, typow i stalych z numerami linii.
> Ostatnia aktualizacja: 2026-02-24
> Wygenerowano automatycznie przez `pnpm reindex`

---

## Spis tresci

1. [Backend - Handlers](#backend---handlers)
2. [Backend - Services](#backend---services)
3. [Backend - Repositories](#backend---repositories)
4. [Backend - Routes](#backend---routes)
5. [Backend - Middleware](#backend---middleware)
6. [Backend - Plugins](#backend---plugins)
7. [Backend - Utils](#backend---utils)
8. [Backend - Validators](#backend---validators)
9. [Backend - Types & Config](#backend---types-config)
10. [Frontend - Shared Hooks](#frontend---shared-hooks)
11. [Frontend - Lib / API Client](#frontend---lib-api-client)
12. [Frontend - Feature API](#frontend---feature-api)
13. [Frontend - Komponenty UI](#frontend---komponenty-ui)
14. [Packages - Shared](#packages---shared)

---

## Backend - Handlers

Lokalizacja: `apps/api/src/handlers/`

### handlers/akrobudVerificationHandler.ts
- L28: `export class AkrobudVerificationHandler`
  - `getAll`, `getById`, `create`, `update`, `delete`, `addItems`, `parseTextarea`, `deleteItem`, `clearItems`, `verify`, `applyChanges`, `parseMailContent`, `previewProjects`, `createListVersion`, `getListVersions`, `getListVersionHistory`, `compareVersions`, `verifyProjectList`

### handlers/attendanceHandler.ts
- L30: `export class AttendanceHandler`
  - `getMonthlyAttendance()`
  - `updateDay()`
  - `exportAttendance()`

### handlers/authHandler.ts
- L21: `export async function loginHandler`
- L46: `export async function logoutHandler`
- L63: `export async function meHandler`

### handlers/bugReportHandler.ts
- L14: `export class BugReportHandler`
  - `create()`
  - `getAll()`

### handlers/colorHandler.ts
- L15: `export class ColorHandler`
  - `getAll()`
  - `getById()`
  - `create()`
  - `update()`
  - `delete()`
  - `updateProfileVisibility()`

### handlers/dashboard-handler.ts
- L31: `export async function getDashboardData`
- L43: `export async function getAlerts`
- L55: `export async function getWeeklyStats`
- L67: `export async function getMonthlyStats`

### handlers/deliveryHandler.ts
- L28: `export class DeliveryHandler`
  - `getAll`, `getById`, `create`, `update`, `delete`, `addOrder`, `removeOrder`, `reorderOrders`, `moveOrder`, `addItem`, `removeItem`, `complete`, `completeAllOrders`, `getCalendar`, `getCalendarBatch`, `getProfileRequirements`, `getWindowsStatsByWeekday`, `getMonthlyWindowsStats`, `getMonthlyProfileStats`, `getProtocol`, `getProtocolPdf`, `bulkUpdateDates`, `validateOrderNumbers`, `bulkAssignOrders`, `getDeliveriesForDate`, `previewDeliveryNumber`

### handlers/glassDeliveryHandler.ts
- L10: `export class GlassDeliveryHandler`
  - `getAll`, `getById`, `importFromCsv`, `delete`, `getLatestImportSummary`, `getLooseGlasses`, `getAluminumGlasses`, `getAluminumGlassesSummary`, `getReclamationGlasses`

### handlers/glassOrderHandler.ts
- L10: `export class GlassOrderHandler`
  - `getAll`, `getById`, `importFromTxt`, `delete`, `getSummary`, `getValidations`, `updateStatus`, `rematchAll`

### handlers/glassValidationHandler.ts
- L17: `export class GlassValidationHandler`
  - `getDashboard()`
  - `getByOrderNumber()`
  - `getAll()`
  - `resolve()`
  - `getDetailedDiscrepancies()`

### handlers/gmailHandler.ts
- L16: `export class GmailHandler`
  - `getStatus()`
  - `manualFetch()`
  - `getLogs()`
  - `testConnection()`

### handlers/helpHandler.ts
- L14: `export class HelpHandler`
  - `generatePdf()`

### handlers/importHandler.ts
- L18: `export class ImportHandler`
  - `upload`, `getAll`, `getPending`, `getById`, `getPreview`, `approve`, `reject`, `delete`, `importFolder`, `listFolders`, `scanFolder`, `archiveFolder`, `deleteFolder`, `previewByFilepath`, `processImport`, `bulkAction`

### handlers/labelCheckHandler.ts
- L27: `export class LabelCheckHandler`
  - `getAll`, `getById`, `create`, `remove`, `exportExcel`, `getLatestForDelivery`, `getStatistics`, `getDeliverySummary`
- L179: `export const getLatestForDelivery`
- L192: `export const getDeliverySummary`

### handlers/logisticsHandler.ts
- L33: `export class LogisticsHandler`
  - `parseEmail`, `saveMailList`, `getMailLists`, `getMailListById`, `deleteMailList`, `getVersionsByDeliveryCode`, `getLatestVersion`, `getVersionDiff`, `getCalendar`, `updateMailItem`, `removeItemFromDelivery`, `confirmAddedItem`, `rejectAddedItem`, `acceptItemChange`, `restoreItemValue`, `setOrderDeliveryDate`, `getOrphanOrders`, `removeOrderFromDelivery`
- L344: `export const logisticsHandler`

### handlers/mojaPracaHandler.ts
- L35: `export const mojaPracaHandler`

### handlers/okuc/articleHandler.ts
- L21: `export const okucArticleHandler`

### handlers/okuc/demandHandler.ts
- L16: `export const okucDemandHandler`

### handlers/okuc/index.ts
- L6: `export re-export okucArticleHandler`
- L7: `export re-export okucStockHandler`
- L8: `export re-export okucDemandHandler`
- L9: `export re-export okucOrderHandler`
- L10: `export re-export okucProportionHandler`
- L11: `export re-export okucLocationHandler`

### handlers/okuc/locationHandler.ts
- L19: `export const okucLocationHandler`

### handlers/okuc/orderHandler.ts
- L26: `export const okucOrderHandler`

### handlers/okuc/proportionHandler.ts
- L16: `export const okucProportionHandler`

### handlers/okuc/replacementHandler.ts
- L18: `export const replacementHandler`

### handlers/okuc/stockHandler.ts
- L26: `export const okucStockHandler`

### handlers/operatorDashboardHandler.ts
- L40: `export async function getOperatorDashboard`

### handlers/orderHandler.ts
- L40: `export class OrderHandler`
  - `getAll`, `getById`, `getByNumber`, `create`, `update`, `updateManualStatus`, `updateSpecialType`, `delete`, `archive`, `unarchive`, `bulkUpdateStatus`, `revertProduction`, `getForProduction`, `getMonthlyProduction`, `search`, `getCompletenessStats`, `patch`, `getRequirementsTotals`, `hasPdf`, `downloadPdf`, `getTableByColor`, `getReadiness`, `setVariantType`, `hasGlassOrderTxt`, `downloadGlassOrderTxt`

### handlers/palletHandler.ts
- L20: `export class PalletHandler`
  - `optimizeDelivery`, `getOptimization`, `deleteOptimization`, `exportToPdf`, `getPalletTypes`, `createPalletType`, `updatePalletType`, `deletePalletType`, `getPackingRules`, `createPackingRule`, `updatePackingRule`, `deletePackingRule`

### handlers/palletStockHandler.ts
- L18: `export class PalletStockHandler`
  - `getDay`, `updateDay`, `closeDay`, `correctMorningStock`, `getMonthSummary`, `getCalendar`, `getAlertConfig`, `updateAlertConfig`, `getInitialStocks`, `setInitialStocks`

### handlers/pendingOrderPriceCleanupHandler.ts
- L17: `export async function getCleanupStatistics`
- L33: `export async function getCleanupConfig`
- L49: `export async function getSchedulerStatus`
- L65: `export async function triggerManualCleanup`
- L88: `export async function getAllPendingPrices`
- L109: `export async function triggerRematch`
- L128: `export async function triggerReimport`

### handlers/productionPlanningHandler.ts
- L18: `export class ProductionPlanningHandler`
  - `getAllEfficiencyConfigs`, `getEfficiencyConfigById`, `createEfficiencyConfig`, `updateEfficiencyConfig`, `deleteEfficiencyConfig`, `getAllSettings`, `getSettingByKey`, `upsertSetting`, `updateSetting`, `deleteSetting`, `getCalendarDays`, `upsertCalendarDay`, `deleteCalendarDay`, `getProfilesWithPalletized`, `updateProfilePalletized`, `bulkUpdateProfilePalletized`, `getColorsWithTypical`, `updateColorTypical`, `bulkUpdateColorTypical`

### handlers/productionReportHandler.ts
- L74: `export const productionReportHandler`

### handlers/profileDepthHandler.ts
- L14: `export class ProfileDepthHandler`
  - `getAll()`
  - `getById()`
  - `create()`
  - `update()`
  - `delete()`

### handlers/profileHandler.ts
- L17: `export class ProfileHandler`
  - `getAll()`
  - `getById()`
  - `create()`
  - `update()`
  - `delete()`
  - `updateOrders()`

### handlers/profilePalletConfigHandler.ts
- L14: `export class ProfilePalletConfigHandler`
  - `getAll()`
  - `getById()`
  - `create()`
  - `update()`
  - `delete()`

### handlers/schucoHandler.ts
- L7: `export class SchucoHandler`

### handlers/settingsHandler.ts
- L15: `export class SettingsHandler`
  - `getAll`, `getByKey`, `upsertOne`, `upsertMany`, `getAllPalletTypes`, `createPalletType`, `updatePalletType`, `deletePalletType`, `getAllPackingRules`, `createPackingRule`, `updatePackingRule`, `deletePackingRule`, `getUserFolderPath`, `updateUserFolderPath`, `getAllDocumentAuthorMappings`, `createDocumentAuthorMapping`, `updateDocumentAuthorMapping`, `deleteDocumentAuthorMapping`

### handlers/steelHandler.ts
- L14: `export class SteelHandler`

### handlers/timesheetsHandler.ts
- L32: `export class TimesheetsHandler`
  - `getAllWorkers`, `getWorkerById`, `createWorker`, `updateWorker`, `deactivateWorker`, `getAllPositions`, `getPositionById`, `createPosition`, `updatePosition`, `getAllNonProductiveTaskTypes`, `getNonProductiveTaskTypeById`, `createNonProductiveTaskType`, `updateNonProductiveTaskType`, `getAllSpecialWorkTypes`, `getSpecialWorkTypeById`, `createSpecialWorkType`, `updateSpecialWorkType`, `toggleSpecialWorkType`, `getTimeEntries`, `getTimeEntryById`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `setStandardDay`, `setAbsenceRange`, `getCalendarSummary`, `getDaySummary`

### handlers/userHandler.ts
- L25: `export async function listUsersHandler`
- L36: `export async function getUserHandler`
- L58: `export async function createUserHandler`
- L70: `export async function updateUserHandler`
- L88: `export async function deleteUserHandler`

### handlers/warehouse-handler.ts
- L35: `export async function getColorData`
- L47: `export async function updateStock`
- L67: `export async function monthlyUpdate`
- L88: `export async function rollbackInventory`
- L105: `export async function getShortages`
- L116: `export async function getMonthlyAverage`
- L134: `export async function getHistoryByColor`
- L148: `export async function getAllHistory`
- L161: `export async function finalizeMonth`

### handlers/warehouseOrderHandler.ts
- L10: `export function createWarehouseOrderHandler`

---

## Backend - Services

Lokalizacja: `apps/api/src/services/`

### services/akrobud-verification/AkrobudVerificationService.ts
- L56: `export interface VerificationItemInput`
- L60: `export interface ParsedOrderNumber`
- L69: `export interface VerificationResult`
- L108: `export interface ProjectPreview`
- L122: `export interface CreateListVersionResult`
- L140: `export interface ListVersionInfo`
- L163: `export class AkrobudVerificationService`
  - `createList`, `getList`, `getAllLists`, `updateList`, `deleteList`, `addItems`, `deleteItem`, `clearItems`, `verify`, `applyChanges`, `parseTextareaInput`, `parseMailContentForProjects`, `previewProjects`, `createListVersion`, `getListVersions`, `getListVersionHistory`, `compareVersions`, `verifyProjectList`

### services/akrobud-verification/utils/OrderNumberMatcher.ts
- L20: `export type MatchStatus`
- L25: `export interface OrderMatchResult`
- L38: `export interface ParsedOrderNumber`
- L48: `export class OrderNumberMatcher`
  - `parseOrderNumber()`
  - `findMatchingOrder()`
  - `findMatchingOrdersBatch()`
  - `orderExists()`
  - `getOrderById()`

### services/akrobud-verification/utils/ProjectMatcher.ts
- L11: `export interface MatchedOrder`
- L21: `export interface ProjectMatchResult`
- L32: `export interface ProjectMatcherOptions`
- L46: `export async function findOrdersByProject`
- L122: `export async function findOrdersByProjects`
- L220: `export interface ProjectDeliveryStatus`
- L234: `export async function checkProjectDeliveryStatus`

### services/akrobud-verification/utils/VerificationChangeApplier.ts
- L24: `export interface ChangeResult`
- L33: `export interface ApplyChangesResult`
- L42: `export interface ApplyChangesOptions`
- L52: `export interface ChangeRecord`
- L65: `export class VerificationChangeApplier`
  - `applyChanges()`
  - `applyChangesTransactional()`
  - `validateChanges()`
  - `getChangesSummary()`

### services/akrobud-verification/utils/VerificationListComparator.ts
- L22: `export interface MatchedItem`
- L36: `export interface MissingItem`
- L49: `export interface ExcessItem`
- L60: `export interface NotFoundItem`
- L69: `export interface DuplicateItem`
- L77: `export interface VerificationListItem`
- L87: `export interface DeliveryOrderItem`
- L102: `export interface ComparisonResult`
- L122: `export class VerificationListComparator`
  - `compareListWithDelivery()`
  - `findExcessItems()`
  - `findDuplicatesOnList()`
  - `findDuplicatesInInput()`
  - `generateDifferenceReport()`

### services/akrobud-verification/utils/VersionComparator.ts
- L13: `export interface VersionDiff`
- L53: `export function compareListVersions`
- L102: `export function areListsIdentical`
- L120: `export function formatVersionDiffSummary`

### services/alerts/DeliveryAlertScheduler.ts
- L215: `export const DeliveryAlertScheduler`

### services/alerts/LabelCheckScheduler.ts
- L269: `export const LabelCheckScheduler`

### services/attendanceService.ts
- L10: `export type AttendanceType`
- L12: `export interface DayAttendance`
- L18: `export interface WorkerAttendance`
- L33: `export interface MonthlyAttendanceResponse`
- L43: `export interface UpdateDayInput`
- L65: `export class AttendanceService`
  - `getMonthlyAttendance()`
  - `updateDay()`
  - `isMonthEditable()`

### services/authService.ts
- L18: `export async function login`
- L76: `export async function getCurrentUser`
- L104: `export async function hashPassword`

### services/bugReportService.ts
- L10: `export class BugReportService`
  - `saveBugReport()`
  - `getAllReports()`

### services/cache.ts
- L191: `export const cacheService`

### services/calendar/CalendarService.ts
- L17: `export interface Holiday`
- L42: `export class CalendarService`
  - `getHolidays`, `isHoliday`, `isWorkingDay`, `getWorkingDaysFromDatabase`, `countWorkingDays`, `addWorkingDays`, `getNextWorkingDay`, `getPreviousWorkingDay`, `getWorkingDaysInMonth`, `getHolidaysInMonth`
- L271: `export function getCalendarService`

### services/calendar/index.ts
- L11: `export re-export CalendarService`
- L15: `export re-export EasterCalculator`

### services/calendar/utils/EasterCalculator.ts
- L12: `export interface MovableHoliday`
- L23: `export class EasterCalculator`
  - `calculateEaster()`
  - `getMovableHolidays()`
- L108: `export const easterCalculator`

### services/colorService.ts
- L10: `export class ColorService`
  - `getAllColors()`
  - `getColorById()`
  - `createColor()`
  - `updateColor()`
  - `deleteColor()`
  - `updateProfileColorVisibility()`

### services/currencyConfigService.ts
- L13: `export class CurrencyConfigService`
  - `getCurrentRate`, `invalidateCache`, `updateRate`, `getRateHistory`, `getRateForDate`, `convertEurToPln`, `convertPlnToEur`

### services/dashboard-service.ts
- L35: `export class DashboardService`
  - `getDashboardData()`
  - `getAlerts()`
  - `getWeeklyStats()`
  - `getMonthlyStats()`

### services/delivery-protocol-service.ts
- L14: `export interface ProtocolOrder`
- L21: `export interface DeliveryProtocolData`
- L31: `export class DeliveryProtocolService`
  - `generatePdf()`
  - `generateFilename()`

### services/delivery/DeliveryCalendarService.ts
- L13: `export interface CalendarMonth`
- L18: `export interface CalendarDataResult`
- L25: `export class DeliveryCalendarService`
  - `getCalendarData()`
  - `getCalendarDataBatch()`

### services/delivery/DeliveryEventEmitter.ts
- L18: `export interface DeliveryEventData`
- L24: `export interface OrderEventData`
- L32: `export class DeliveryEventEmitter`
  - `emitDeliveryCreated`, `emitDeliveryUpdated`, `emitDeliveryDeleted`, `emitOrderUpdated`, `emitOrderAddedToDelivery`, `emitOrderRemovedFromDelivery`, `emitOrderMovedBetweenDeliveries`, `emitDeliveriesUpdated`, `emitOrdersUpdated`, `emitDeliveryOrdersCompleted`
- L114: `export const deliveryEventEmitter`

### services/delivery/DeliveryNotificationService.ts
- L21: `export type DeliveryNotificationType`
- L36: `export interface NotificationPayload`
- L46: `export interface EmailNotificationConfig`
- L55: `export interface StatusChangeNotification`
- L65: `export interface OrderOperationNotification`
- L76: `export interface BatchNotification`
- L82: `export class DeliveryNotificationService`
  - `configureEmail`, `notifyDeliveryCreated`, `notifyDeliveryUpdated`, `notifyDeliveryDeleted`, `notifyStatusChanged`, `notifyOrderAdded`, `notifyOrderRemoved`, `notifyOrderMoved`, `notifyOrdersCompleted`, `notifyOptimizationCompleted`, `notifyOptimizationDeleted`, `notifyDeliveriesUpdated`, `notifyOrdersUpdated`
- L342: `export const deliveryNotificationService`

### services/delivery/DeliveryNumberGenerator.ts
- L13: `export class DeliveryNumberGenerator`
  - `generateDeliveryNumber()`
  - `getNextSequenceForDate()`
  - `previewNextNumber()`

### services/delivery/DeliveryOptimizationService.ts
- L25: `export interface DeliveryDimensionsSummary`
- L39: `export interface OptimizationValidationResult`
- L48: `export interface OptimizationStatus`
- L56: `export class DeliveryOptimizationService`
  - `optimizeDelivery`, `getOptimization`, `deleteOptimization`, `hasOptimization`, `getOptimizationStatus`, `validateForOptimization`, `getDeliveryDimensionsSummary`, `estimatePalletCount`, `getAllPalletTypes`, `getPalletTypeById`, `createPalletType`, `updatePalletType`, `deletePalletType`

### services/delivery/DeliveryOrderService.ts
- L30: `export interface VariantConflictResult`
- L55: `export class DeliveryOrderService`
  - `addOrderToDelivery()`
  - `removeOrderFromDelivery()`
  - `reorderDeliveryOrders()`
  - `moveOrderBetweenDeliveries()`
  - `validateNoVariantConflict()`
  - `canAddOrderToDelivery()`

### services/delivery/DeliveryService.ts
- L47: `export class DeliveryService`
  - `getAllDeliveries`, `getDeliveryById`, `createDelivery`, `updateDelivery`, `deleteDelivery`, `addOrderToDelivery`, `removeOrderFromDelivery`, `reorderDeliveryOrders`, `moveOrderBetweenDeliveries`, `addItemToDelivery`, `removeItemFromDelivery`, `completeDelivery`, `completeAllOrders`, `getCalendarData`, `getCalendarDataBatch`, `getProfileRequirements`, `getWindowsStatsByWeekday`, `getMonthlyWindowsStats`, `getMonthlyProfileStats`, `bulkUpdateDeliveryDates`, `optimizeDelivery`, `getOptimization`, `deleteOptimization`, `getOptimizationStatus`, `validateForOptimization`, `estimatePalletCount`, `getProtocolData`

### services/delivery/DeliveryStatisticsService.ts
- L21: `export interface ProfileRequirement`
- L30: `export interface WeekdayStat`
- L42: `export interface WeekdayStatsResult`
- L48: `export interface MonthlyWindowsStat`
- L58: `export interface MonthlyWindowsStatsResult`
- L62: `export interface ProfileUsage`
- L74: `export interface MonthlyProfileStat`
- L82: `export interface MonthlyProfileStatsResult`
- L93: `export class DeliveryStatisticsService`
  - `getProfileRequirements()`
  - `getWindowsStatsByWeekday()`
  - `getMonthlyWindowsStats()`
  - `getMonthlyProfileStats()`

### services/delivery/index.ts
- L16: `export re-export DeliveryService`
- L19: `export re-export DeliveryStatisticsService`
- L31: `export re-export DeliveryCalendarService`
- L34: `export re-export DeliveryEventEmitter`
- L37: `export re-export DeliveryNumberGenerator`
- L40: `export re-export DeliveryOptimizationService`
- L47: `export re-export DeliveryNotificationService`
- L58: `export re-export DeliveryOrderService`
- L62: `export re-export QuickDeliveryService`

### services/delivery/QuickDeliveryService.ts
- L23: `export interface ValidatedOrder`
- L46: `export interface ValidateOrdersResult`
- L60: `export interface BulkAssignResult`
- L77: `export class QuickDeliveryService`
  - `parseOrderNumbers()`
  - `validateOrderNumbers()`
  - `bulkAssignOrders()`
  - `getDeliveriesForDate()`
  - `previewNextDeliveryNumber()`

### services/deliveryService.ts
- L11: `export re-export DeliveryService`

### services/deliveryTotalsService.ts
- L9: `export class DeliveryTotalsService`
  - `getTotalWindows`, `getTotalGlass`, `getTotalPallets`, `getTotalValue`, `getDeliveryTotals`, `getDeliveryWithTotals`, `getDeliveriesWithTotals`
- L181: `export const deliveryTotalsService`

### services/event-emitter.ts
- L7: `export type EventData`
- L55: `export const eventEmitter`
- L58: `export const emitDeliveryCreated`
- L64: `export const emitDeliveryUpdated`
- L70: `export const emitDeliveryDeleted`
- L76: `export const emitOrderCreated`
- L82: `export const emitOrderUpdated`
- L88: `export const emitOrderDeleted`
- L94: `export const emitWarehouseStockUpdated`
- L100: `export const emitWarehouseStockChanged`
- L107: `export const emitOkucRwImported`
- L113: `export const emitOkucRwProcessed`
- L119: `export const emitOkucDemandImported`
- L125: `export const emitOkucStockUpdated`
- L132: `export const emitOkucOrderCreated`
- L138: `export const emitOkucOrderUpdated`
- L144: `export const emitOkucOrderDeleted`
- L151: `export const emitPriceImported`
- L157: `export const emitPricePending`
- L164: `export const emitSchucoFetchStarted`
- L170: `export const emitSchucoFetchProgress`
- L176: `export const emitSchucoFetchCompleted`
- L182: `export const emitSchucoFetchFailed`
- L189: `export const emitProfileRwProcessed`
- L196: `export const emitSteelStockUpdated`
- L202: `export const emitSteelRwProcessed`
- L212: `export interface ImportProgressData`
- L223: `export const emitImportStarted`
- L229: `export const emitImportCompleted`
- L235: `export const emitImportFailed`
- L241: `export const emitImportRetry`
- L251: `export interface MatchingProgressData`
- L264: `export const emitMatchingStarted`
- L270: `export const emitMatchingCompleted`
- L276: `export const emitMatchingFailed`
- L282: `export const emitMatchingRetry`
- L292: `export const emitGmailFetchStarted`
- L298: `export const emitGmailFetchCompleted`
- L304: `export const emitGmailFetchFailed`

### services/file-watcher/CenyWatcher.ts
- L24: `export class CenyWatcher`
  - `start()`
  - `stop()`
  - `getWatchers()`

### services/file-watcher/FileWatcherFactory.ts
- L20: `export class FileWatcherFactory`
  - `start()`
  - `stop()`
  - `restart()`
  - `getWatchers()`
  - `getCurrentPaths()`

### services/file-watcher/GlassWatcher.ts
- L20: `export class GlassWatcher`
  - `start()`
  - `stop()`
  - `getWatchers()`

### services/file-watcher/index.ts
- L23: `export re-export DEFAULT_WATCHER_CONFIG`
- L38: `export re-export GlassWatcher`
- L39: `export re-export UzyteBeleWatcher`
- L40: `export re-export UzyteBelePrywatneWatcher`
- L41: `export re-export CenyWatcher`
- L42: `export re-export OkucZapotrzebowaWatcher`
- L43: `export re-export FileWatcherFactory`
- L52: `export const FileWatcherService`
- L59: `export type FileWatcherService`

### services/file-watcher/OkucZapotrzebowaWatcher.ts
- L55: `export class OkucZapotrzebowaWatcher`
  - `start()`
  - `stop()`
  - `getWatchers()`

### services/file-watcher/types.ts
- L7: `export interface WatcherConfig`
- L17: `export const DEFAULT_WATCHER_CONFIG`
- L25: `export interface WatcherPaths`
- L39: `export interface ImportResult`
- L48: `export type DeliveryNumber`
- L53: `export interface IFileWatcher`
- L62: `export interface WatcherContext`

### services/file-watcher/utils.ts
- L11: `export async function getSetting`
- L22: `export function extractDateFromFolderName`
- L47: `export function extractDeliveryNumber`
- L55: `export function formatDeliveryNumber`
- L66: `export async function archiveFile`
- L97: `export async function archiveFolder`
- L145: `export async function ensureDirectoryExists`
- L163: `export function generateSafeFilename`
- L178: `export async function shouldSkipImport`
- L246: `export async function moveToSkipped`

### services/file-watcher/UzyteBelePrywatneWatcher.ts
- L30: `export class UzyteBelePrywatneWatcher`
  - `start()`
  - `stop()`
  - `getWatchers()`

### services/file-watcher/UzyteBeleWatcher.ts
- L40: `export class UzyteBeleWatcher`
  - `start()`
  - `stop()`
  - `getWatchers()`
  - `scanExistingFolders()`

### services/glass-delivery/GlassDeliveryImportService.ts
- L12: `export class GlassDeliveryImportService`
  - `importFromCsv()`

### services/glass-delivery/GlassDeliveryMatchingService.ts
- L24: `export class GlassDeliveryMatchingService`
  - `matchWithOrdersTx()`
  - `matchWithOrders()`
  - `rematchUnmatchedForOrders()`
  - `rematchUnmatchedForOrdersStandalone()`
  - `rematchUnmatchedForOrdersTx()`
  - `updateGlassDeliveryDateIfComplete()`

### services/glass-delivery/GlassDeliveryQueryService.ts
- L13: `export class GlassDeliveryQueryService`
  - `findAllGrouped()`
  - `findAll()`
  - `findById()`
  - `delete()`
  - `getLatestImportSummary()`

### services/glass-delivery/index.ts
- L18: `export re-export GlassDeliveryImportService`
- L19: `export re-export GlassDeliveryMatchingService`
- L20: `export re-export GlassDeliveryQueryService`
- L29: `export class GlassDeliveryService`
  - `importFromCsv`, `matchWithOrders`, `rematchUnmatchedForOrders`, `findAll`, `findAllLegacy`, `findById`, `delete`, `getLatestImportSummary`, `getLooseGlasses`, `getAluminumGlasses`, `getAluminumGlassesSummary`, `getReclamationGlasses`

### services/glass-delivery/types.ts
- L6: `export type TransactionClient`
- L11: `export interface GlassDeliveryFilters`
- L19: `export interface MatchStatusStats`
- L29: `export interface OrderDeliverySummary`
- L39: `export interface ImportSummary`
- L55: `export interface RematchResult`
- L63: `export type GlassDeliveryWithItems`
- L70: `export type GlassDeliveryWithItemsAndCount`
- L82: `export interface GroupedGlassDelivery`

### services/glassOrderService.ts
- L9: `export class GlassOrderService`
  - `importFromTxt`, `matchWithProductionOrders`, `findAll`, `findById`, `delete`, `getSummary`, `getValidations`, `updateStatus`, `rematchAllGlassOrders`

### services/glassValidationService.ts
- L3: `export class GlassValidationService`
  - `getDashboard()`
  - `getByOrderNumber()`
  - `resolve()`
  - `findAll()`
  - `getDetailedDiscrepancies()`

### services/gmail/GmailFetcherService.ts
- L49: `export class GmailFetcherService`
  - `getConfig()`
  - `testConnection()`
  - `fetchEmails()`
  - `getFetchLogs()`
  - `getStats()`

### services/gmail/GmailScheduler.ts
- L11: `export class GmailScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
  - `getService()`
- L115: `export function getGmailScheduler`
- L122: `export function startGmailScheduler`
- L127: `export function stopGmailScheduler`

### services/help/HelpPdfService.ts
- L632: `export class HelpPdfService`
  - `hasContent()`
  - `generatePdf()`

### services/HolidayService.ts
- L12: `export interface Holiday`
- L19: `export interface FixedHoliday`
- L25: `export interface MovableHoliday`
- L30: `export interface WorkingDayInput`
- L172: `export class HolidayService`
  - `getHolidays`, `getEasterDate`, `isHoliday`, `getWorkingDays`, `getWorkingDaysForMonth`, `setWorkingDay`, `deleteWorkingDay`
- L310: `export const holidayService`

### services/import/CenyProcessor.ts
- L25: `export interface PdfAutoImportResult`
- L36: `export interface PdfApprovalResult`
- L54: `export class CenyProcessor`
  - `autoImportPdf()`
  - `processPdfApproval()`
  - `getPdfPreview()`

### services/import/importConflictService.ts
- L28: `export interface ConflictDetectionResult`
- L37: `export interface ConflictResolutionResult`
- L52: `export class ImportConflictService`
  - `detectConflicts`, `findRelatedOrders`, `parseOrderNumber`, `checkVariantInDelivery`, `executeResolution`, `deleteOlderVariantsInTransaction`, `formatConflictSummary`

### services/import/importFileSystemService.ts
- L17: `export interface CsvFileData`
- L32: `export class ImportFileSystemService`
  - `createDirectory`, `writeFile`, `copyFile`, `moveFile`, `deleteFile`, `deleteDirectory`, `exists`, `isDirectory`, `getStats`, `readDirectory`, `ensureUploadsDirectory`, `validatePathWithinBase`, `validateDirectory`, `findCsvFilesRecursively`, `moveFolderToArchive`, `extractDateFromFolderName`, `generateSafeFilename`, `normalizePath`, `getBaseName`, `joinPath`, `getDirName`, `extractDeliveryDateFromFolder`, `scanForCsvFiles`
- L329: `export const importFileSystemService`

### services/import/ImportOrchestrator.ts
- L45: `export class ImportOrchestrator`
  - `getImportsBasePath`, `getAllImports`, `getPendingImports`, `getImportById`, `rejectImport`, `deleteImport`, `uploadFile`, `getPreview`, `previewByFilepath`, `approveImport`, `processUzyteBeleWithResolution`, `importFromFolder`, `listFolders`, `scanFolder`, `archiveFolder`, `deleteFolder`, `processImport`

### services/import/ImportQueueService.ts
- L18: `export type ImportJobType`
- L28: `export interface ImportJob`
- L42: `export interface ImportJobResult`
- L49: `export interface QueueStats`
- L418: `export const importQueue`
- L421: `export re-export ImportQueueService`

### services/import/importSettingsService.ts
- L31: `export class ImportSettingsService`
  - `getImportsBasePath`, `getUserSettings`, `setUserImportsBasePath`, `clearCache`, `invalidateUserCache`, `invalidateGlobalCache`, `getDefaultBasePath`

### services/import/importTransactionService.ts
- L20: `export interface ImportTransactionOptions`
- L37: `export interface TransactionResult`
- L47: `export type TransactionClient`
- L58: `export class ImportTransactionService`
  - `updateImportStatus`, `markAsProcessing`, `markAsCompleted`, `markAsError`, `markAsRejected`, `deleteOrderWithDependencies`, `deleteMultipleOrdersWithDependencies`, `findOrCreateDelivery`, `addOrderToDeliveryInTransaction`, `createPendingOrderPrice`, `createPendingOrderPriceSimple`, `createImportRecord`, `updateImportRecord`

### services/import/importValidationService.ts
- L30: `export type ImportFileType`
- L35: `export interface DuplicatePdfCheckResult`
- L44: `export interface OrderExistenceCheckResult`
- L53: `export interface DeliveryAssignmentCheckResult`
- L66: `export class ImportValidationService`
  - `validateUploadedFile`, `validateFilename`, `validateFileExtension`, `validateFileSize`, `validateMimeType`, `sanitizeFilename`, `detectFileType`, `validateImportStatus`, `validateImportCanBeProcessed`, `checkDuplicatePdfImport`, `checkOrderExists`, `checkOrderDeliveryAssignment`, `parseAndValidateCsv`, `parseAndValidateCsvWithErrors`, `parseOrderNumber`, `parseAndValidatePdf`, `validateFolderImportPrerequisites`, `validateOrderCanBeImportedToDelivery`

### services/import/ImportWebSocketBridge.ts
- L31: `export function initializeImportWebSocketBridge`

### services/import/index.ts
- L30: `export re-export ImportOrchestrator`
- L33: `export re-export UzyteBeleProcessor`
- L41: `export re-export CenyProcessor`
- L48: `export re-export ImportFileSystemService`
- L51: `export re-export ImportSettingsService`
- L54: `export re-export ImportValidationService`
- L62: `export re-export ImportTransactionService`
- L69: `export re-export ImportConflictService`
- L122: `export re-export ImportQueueService`

### services/import/MatchingQueueService.ts
- L19: `export type MatchingJobType`
- L24: `export interface MatchingJob`
- L43: `export interface MatchingJobResult`
- L50: `export interface MatchingQueueStats`
- L393: `export const matchingQueue`
- L396: `export re-export MatchingQueueService`

### services/import/parsers/csvImportService.ts
- L44: `export class CsvImportService`
  - `parseEurAmountFromSchuco()`
  - `parseOrderNumber()`
  - `parseArticleNumber()`
  - `calculateBeamsAndMeters()`
  - `previewUzyteBele()`
  - `processUzyteBele()`
- L878: `export function createCsvImportService`

### services/import/parsers/excelImportService.ts
- L29: `export const EXPECTED_COLUMNS`
- L62: `export interface ExcelRow`
- L69: `export interface ExcelParseResult`
- L82: `export interface ColumnValidationResult`
- L95: `export class ExcelImportService`
  - `parseExcelFile()`
  - `validateColumns()`
  - `processRequirementsImport()`
  - `getWorksheetNames()`
  - `parseWorksheet()`
- L340: `export function createExcelImportService`

### services/import/parsers/feature-flags.ts
- L29: `export function getParserFeatureFlags`
- L47: `export function useNewCsvParser`
- L54: `export function useNewPdfParser`
- L61: `export function useNewExcelParser`
- L69: `export function logParserFeatureFlags`
- L90: `export function validateParserFeatureFlags`
- L121: `export interface ParserComparisonResult`
- L132: `export async function compareParserResults`

### services/import/parsers/index.ts
- L41: `export re-export BEAM_LENGTH_MM`
- L57: `export re-export CsvImportService`
- L100: `export re-export PdfImportService`
- L130: `export function getCsvParser`
- L143: `export function getPdfParser`
- L156: `export function getExcelParser`
- L163: `export function hasNewParsersEnabled`

### services/import/parsers/pdfImportService.ts
- L34: `export class PdfImportService`
  - `previewCenyPdf()`
  - `processCenyPdf()`
- L336: `export function createPdfImportService`

### services/import/parsers/transformers/CsvDataTransformer.ts
- L14: `export interface ArticleNumberParsed`
- L22: `export interface RawRequirementRow`
- L32: `export interface RawWindowRow`
- L44: `export interface OrderMetadata`
- L55: `export class CsvDataTransformer`
  - `parseArticleNumber`, `calculateBeamsAndMeters`, `transformRequirementRow`, `transformWindowRow`, `parseRequirementParts`, `parseWindowParts`, `parseMetadataLine`, `parseSummaryLine`, `autoFillFromWindows`
- L335: `export const csvDataTransformer`

### services/import/parsers/types.ts
- L13: `export interface ParsedUzyteBele`
- L42: `export interface ParsedRequirement`
- L55: `export interface ParsedWindow`
- L67: `export interface CsvProcessResult`
- L76: `export interface ParsedPdfCeny`
- L94: `export interface PdfProcessResult`
- L102: `export interface PendingPriceResult`
- L113: `export interface OrderNumberParsed`
- L122: `export interface ParserServiceConfig`
- L136: `export interface ICsvImportService`
- L175: `export interface IPdfImportService`
- L190: `export interface IExcelImportService`
- L205: `export interface ParserFeatureFlags`
- L223: `export const BEAM_LENGTH_MM`
- L224: `export const REST_ROUNDING_MM`

### services/import/parsers/utils/CurrencyConverter.ts
- L17: `export const schucoEurAmountSchema`
- L30: `export interface CurrencyConversionResult`
- L45: `export function parseSchucoEurAmount`
- L73: `export function parsePlnAmount`
- L109: `export class CurrencyConverter`
  - `parseEurFromSchuco`, `parsePln`, `toCents`, `fromCents`, `parseEurToCents`, `parsePlnToGrosze`, `formatEur`, `formatPln`, `detectCurrency`, `parseAuto`
- L278: `export const currencyConverter`

### services/import/parsers/utils/OrderNumberParser.ts
- L19: `export const orderNumberValidationSchema`
- L28: `export interface OrderNumberValidationResult`
- L37: `export class OrderNumberParser`
  - `parse`, `validate`, `hasVariant`, `getBase`, `getSuffix`, `normalize`, `compareBase`, `matches`
- L216: `export const orderNumberParser`

### services/import/parsers/validators/CsvRowValidator.ts
- L15: `export const articleNumberSchema`
- L23: `export const orderNumberSchema`
- L35: `export const requirementRowSchema`
- L45: `export const windowRowSchema`
- L57: `export interface RowValidationResult`
- L66: `export class CsvRowValidator`
  - `isRequirementRow`, `isWindowRow`, `validateRequirementRow`, `validateWindowRow`, `isRequirementsHeader`, `isWindowsHeader`, `isWindowsSectionStart`, `isSummaryLine`
- L223: `export const csvRowValidator`

### services/import/UzyteBeleProcessor.ts
- L32: `export interface FolderImportFileResult`
- L58: `export interface FolderImportResult`
- L80: `export interface FolderScanResult`
- L107: `export interface UzyteBeleProcessResult`
- L122: `export class UzyteBeleProcessor`
  - `processUzyteBeleImport()`
  - `processUzyteBeleWithResolution()`
  - `performFolderImport()`
  - `scanFolder()`
  - `getUzyteBelePreview()`
  - `previewByFilepath()`

### services/importLockCleanupScheduler.ts
- L13: `export class ImportLockCleanupScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
  - `manualTrigger()`
- L122: `export function getImportLockCleanupScheduler`
- L132: `export function startImportLockCleanupScheduler`
- L140: `export function stopImportLockCleanupScheduler`

### services/importLockService.ts
- L32: `export class ImportLockService`
  - `acquireLock`, `releaseLock`, `checkLock`, `cleanupExpiredLocks`, `getActiveLocks`, `forceReleaseLock`, `heartbeat`, `createHeartbeatManager`

### services/importService.ts
- L32: `export class ImportService`
  - `getImportsBasePath`, `getAllImports`, `getPendingImports`, `getImportById`, `rejectImport`, `deleteImport`, `uploadFile`, `getPreview`, `previewByFilepath`, `approveImport`, `processUzyteBeleWithResolution`, `importFromFolder`, `listFolders`, `scanFolder`, `archiveFolder`, `deleteFolder`, `processImport`

### services/label-check/index.ts
- L12: `export re-export LabelCheckService`
- L24: `export re-export LabelCheckExportService`
- L26: `export re-export OcrService`

### services/label-check/LabelCheckExportService.ts
- L40: `export class LabelCheckExportService`
  - `exportToExcel()`
  - `generateFilename()`

### services/label-check/LabelCheckService.ts
- L20: `export type LabelCheckResultStatus`
- L22: `export interface CheckOrderResult`
- L33: `export interface LabelCheckFilters`
- L41: `export interface PaginationParams`
- L46: `export interface PaginatedResult`
- L53: `export interface LabelCheckStatistics`
- L60: `export interface DeliveryCheckSummary`
- L66: `export interface LabelCheckServiceConfig`
- L70: `export class LabelCheckService`
  - `checkDelivery`, `checkOrder`, `getById`, `getLatestForDelivery`, `getAll`, `delete`, `getStatistics`, `getDeliveryCheckSummary`

### services/label-check/OcrService.ts
- L17: `export interface DateArea`
- L24: `export class OcrService`
  - `extractDateFromImage()`
  - `parseDetectedDate()`
  - `cropDateArea()`

### services/logistics/LogisticsMailParser.ts
- L9: `export type ItemFlag`
- L20: `export interface ParsedItem`
- L30: `export interface ParsedDelivery`
- L38: `export interface ParsedDate`
- L45: `export interface ParsedMail`
- L309: `export function parseLogisticsMail`
- L442: `export function calculateItemStatus`
- L476: `export function calculateDeliveryStatus`

### services/logistics/LogisticsMailService.ts
- L31: `export interface ParseResultItem`
- L45: `export interface ParseResultDelivery`
- L54: `export interface ParseResult`
- L62: `export interface SaveMailListInput`
- L80: `export interface DiffOrderInfo`
- L87: `export interface DateWarning`
- L92: `export interface DiffAddedItem`
- L100: `export interface DiffRemovedItem`
- L107: `export interface DiffChangedItem`
- L117: `export interface VersionDiff`
- L1277: `export const logisticsMailService`

### services/mojaPracaService.ts
- L12: `export interface ConflictWithDetails`
- L41: `export interface ResolveConflictResult`
- L49: `export interface BulkResolveResult`
- L61: `export class MojaPracaService`
  - `getConflicts`, `getConflictDetail`, `countConflicts`, `resolveConflict`, `bulkResolveConflicts`, `getOrdersForUser`, `getDeliveriesForUser`, `getGlassOrdersForUser`, `getDaySummary`, `getAkrobudOrdersWithoutPrice`, `getDeliveriesWithLabelIssues`, `getAlerts`

### services/monthlyReportExportService.ts
- L16: `export class MonthlyReportExportService`
  - `exportToExcel()`
  - `exportToPdf()`
  - `getFilename()`

### services/monthlyReportService.ts
- L12: `export interface MonthlyReportData`
- L23: `export interface MonthlyReportItemData`
- L34: `export class MonthlyReportService`
  - `generateReport()`
  - `saveReport()`
  - `getReport()`
  - `getAllReports()`
  - `deleteReport()`
  - `generateAndSaveReport()`

### services/okuc/ArticleReplacementService.ts
- L17: `export interface ReplacementMapping`
- L33: `export class ArticleReplacementService`
  - `getReplacements()`
  - `setReplacement()`
  - `removeReplacement()`
  - `transferDemandManually()`
  - `checkAndTransferIfStockZero()`

### services/okuc/index.ts
- L5: `export re-export OkucArticleService`
- L6: `export re-export OkucStockService`
- L7: `export re-export OkucLocationService`
- L8: `export re-export OkucRwService`
- L9: `export re-export ArticleReplacementService`

### services/okuc/OkucArticleService.ts
- L70: `export class OkucArticleService`
  - `getAllArticles`, `getArticleById`, `getArticleByArticleId`, `createArticle`, `updateArticle`, `deleteArticle`, `addAlias`, `getAliases`, `previewImport`, `importArticles`, `getArticlesPendingReview`, `batchUpdateOrderClass`, `exportArticlesToCsv`, `importCsvLegacy`

### services/okuc/OkucLocationService.ts
- L20: `export class OkucLocationService`
  - `getAllLocations()`
  - `getLocationById()`
  - `createLocation()`
  - `updateLocation()`
  - `deleteLocation()`
  - `reorderLocations()`

### services/okuc/OkucOrderImportService.ts
- L24: `export class OkucOrderImportService`
  - `parseXlsx()`
  - `confirmImport()`

### services/okuc/OkucOrderStatusScheduler.ts
- L15: `export class OkucOrderStatusScheduler`
  - `start()`
  - `stop()`
  - `processOverdueOrders()`
  - `getStatus()`
- L208: `export function getOkucOrderStatusScheduler`
- L215: `export function startOkucOrderStatusScheduler`
- L220: `export function stopOkucOrderStatusScheduler`

### services/okuc/OkucRwService.ts
- L23: `export class OkucRwService`
  - `processRwForOrder()`
  - `processRwForOrders()`
  - `reverseRwForOrder()`

### services/okuc/OkucStockService.ts
- L61: `export class OkucStockService`
  - `getAllStock`, `getStockById`, `getStockByArticle`, `updateStock`, `adjustStockQuantity`, `getStockSummary`, `getStockBelowMinimum`, `previewImport`, `importStock`, `exportStockToCsv`, `getStockHistory`

### services/operatorDashboardService.ts
- L18: `export class OperatorDashboardService`
  - `getDashboardData()`

### services/orderArchiveScheduler.ts
- L13: `export class OrderArchiveScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
  - `manualTrigger()`
- L157: `export function getOrderArchiveScheduler`
- L167: `export function startOrderArchiveScheduler`
- L175: `export function stopOrderArchiveScheduler`

### services/orderArchiveService.ts
- L19: `export interface ArchiveResult`
- L26: `export interface ArchiveYearStats`
- L31: `export class OrderArchiveService`
  - `getArchiveAfterDays`, `archiveOldCompletedOrders`, `archiveCancelledOrders`, `archiveOrder`, `unarchiveOrder`, `getArchiveYearStats`, `getArchivedOrdersByYear`, `getAvailableYears`

### services/orderService.ts
- L24: `export class OrderService`
  - `getAllOrders`, `searchOrders`, `getOrderById`, `getOrderByNumber`, `createOrder`, `updateOrder`, `deleteOrder`, `restoreOrder`, `archiveOrder`, `updateManualStatus`, `updateSpecialType`, `unarchiveOrder`, `bulkUpdateStatus`, `revertProduction`, `getForProduction`, `getMonthlyProduction`, `getCompletenessStats`, `patchOrder`, `getRequirementsTotals`

### services/orderTotalsService.ts
- L9: `export class OrderTotalsService`
  - `getTotalWindows()`
  - `getTotalSashes()`
  - `getTotalGlasses()`
  - `getOrderTotals()`
  - `getOrderWithTotals()`
  - `getOrdersWithTotals()`
- L123: `export const orderTotalsService`

### services/orderVariantService.ts
- L11: `export type VariantType`
- L13: `export interface OrderVariant`
- L30: `export interface VariantConflict`
- L43: `export type VariantResolutionAction`
- L54: `export class OrderVariantService`
  - `detectConflicts()`
  - `findRelatedOrders()`
  - `checkVariantInDelivery()`
  - `setVariantType()`

### services/pallet-optimizer/PalletOptimizerService.ts
- L18: `export interface WindowInput`
- L29: `export interface PalletDefinition`
- L36: `export interface OptimizedWindow`
- L41: `export interface OptimizedPallet`
- L51: `export interface OptimizationResult`
- L65: `export interface OptimizationOptions`
- L106: `export class PalletOptimizerService`
  - `optimizeDelivery`, `getOptimization`, `deleteOptimization`, `getAllPalletTypes`, `getPalletTypeById`, `createPalletType`, `updatePalletType`, `deletePalletType`

### services/pallet-optimizer/PdfExportService.ts
- L30: `export class PdfExportService`
  - `generatePdf()`
  - `generateFilename()`

### services/palletStockService.ts
- L24: `export const PALLET_TYPES`
- L25: `export type PalletType`
- L28: `export const DAY_STATUS`
- L32: `export type DayStatus`
- L35: `export interface PalletStockEntryWithPrevious`
- L39: `export interface PalletStockDayWithEntries`
- L45: `export interface MonthSummary`
- L57: `export type CalendarDayStatus`
- L59: `export interface CalendarDay`
- L65: `export interface CalendarSummary`
- L71: `export interface Alert`
- L120: `export async function getInitialStock`
- L141: `export async function getAllInitialStocks`
- L163: `export async function setInitialStocks`
- L215: `export async function getPreviousDayData`
- L275: `export async function checkCanEditDay`
- L404: `export async function getDefaultMorningStock`
- L426: `export async function getOrCreateDay`
- L519: `export async function updateDayEntries`
- L616: `export async function correctMorningStock`
- L689: `export async function closeDay`
- L742: `export async function getCalendar`
- L838: `export async function getMonthSummary`
- L953: `export async function getAlertConfig`
- L988: `export async function updateAlertConfig`
- L1024: `export async function checkAlerts`
- L1073: `export async function getDayById`
- L1105: `export async function getDayByDate`
- L1137: `export async function getDaysInRange`
- L1179: `export async function getTodayWithAlerts`
- L1205: `export class PalletStockService`
  - `getDay`, `updateDay`, `closeDay`, `correctMorningStock`, `getMonthSummary`, `getCalendar`, `getAlertConfig`, `updateAlertConfig`, `getInitialStocks`, `setInitialStocks`

### services/palletValidationService.ts
- L12: `export interface ValidationResult`
- L18: `export interface PalletValidationError`
- L30: `export interface ValidationWarning`
- L36: `export class PalletValidationService`
  - `validatePalletOptimization()`
  - `markAsValidated()`
  - `canShipDelivery()`

### services/parsers/ArticleNumberParser.ts
- L11: `export class ArticleNumberParser`
  - `parse`, `parseStrict`, `getProfileNumber`, `getColorCode`, `isValid`, `isSteel`, `parseSteelNumber`
- L114: `export const articleNumberParser`
- L117: `export function parseArticleNumber`

### services/parsers/BeamCalculator.ts
- L9: `export const BEAM_LENGTH_MM`
- L10: `export const REST_ROUNDING_MM`
- L15: `export class BeamCalculator`
  - `calculate()`
  - `calculateBeams()`
  - `calculateMeters()`
  - `roundRest()`
- L100: `export const beamCalculator`
- L103: `export function calculateBeamsAndMeters`

### services/parsers/csv-parser.ts
- L27: `export class CsvParser`
  - `parseEurAmountFromSchuco`, `parseOrderNumber`, `parseArticleNumber`, `calculateBeamsAndMeters`, `previewUzyteBele`, `previewUzyteBeleWithErrors`, `processUzyteBele`

### services/parsers/glass-delivery-csv-parser.ts
- L5: `export type GlassCategory`
- L7: `export interface CategorizedGlassItem`
- L17: `export interface ParsedGlassDeliveryCsv`
- L188: `export function parseGlassDeliveryCsv`

### services/parsers/glass-order-pdf-parser.ts
- L5: `export interface ParsedGlassOrderPdf`
- L138: `export async function parseGlassOrderPdf`

### services/parsers/glass-order-txt-parser.ts
- L3: `export interface ParsedGlassOrderTxt`
- L90: `export function parseGlassOrderTxt`

### services/parsers/index.ts
- L49: `export re-export CsvParser`

### services/parsers/okuc-csv-parser.ts
- L24: `export interface OkucRwRow`
- L34: `export interface ParsedOkucRw`
- L48: `export interface OkucDemandRow`
- L59: `export interface ParsedOkucDemand`
- L190: `export function validateOkucCsvStructure`
- L216: `export async function parseOkucRwCsv`
- L339: `export async function parseOkucDemandCsv`
- L463: `export function validateParsedRw`
- L477: `export function validateParsedDemand`
- L497: `export interface SimpleOkucRwItem`
- L507: `export interface SimpleOkucDemandItem`
- L522: `export function parseOkucRwCsvSync`
- L589: `export function parseOkucDemandCsvSync`

### services/parsers/OrderNumberParser.ts
- L11: `export class OrderNumberParser`
  - `parse()`
  - `hasSuffix()`
  - `getBase()`
  - `getSuffix()`
- L96: `export const orderNumberParser`
- L99: `export function parseOrderNumber`

### services/parsers/pdf-parser.ts
- L9: `export interface ParsedPdfCeny`
- L24: `export class PdfParser`
  - `previewCenyPdf()`
  - `processCenyPdf()`

### services/parsers/ProjectNumberParser.ts
- L10: `export interface ParsedMailContent`
- L21: `export interface ProjectParseResult`
- L94: `export function extractDeliveryDate`
- L117: `export function extractProjectNumbers`
- L144: `export function parseMailContent`
- L159: `export function isValidProjectNumber`
- L167: `export function normalizeProjectNumber`

### services/parsers/types.ts
- L7: `export interface UzyteBeleRow`
- L15: `export interface UzyteBeleWindow`
- L25: `export interface UzyteBeleGlass`
- L36: `export type MaterialCategory`
- L39: `export interface UzytebeleMaterial`
- L59: `export interface ParseError`
- L69: `export interface ParseResult`
- L83: `export interface ParsedUzyteBele`
- L123: `export interface ParsedOrderNumber`
- L132: `export interface ParsedArticleNumber`
- L140: `export interface BeamCalculationResult`

### services/parsers/UzyteBeleParser.ts
- L29: `export class UzyteBeleParser`
  - `parseEurAmountFromSchuco()`
  - `previewUzyteBele()`
  - `previewUzyteBeleWithErrors()`
  - `processUzyteBele()`
  - `parseUzyteBeleFile()`
- L1356: `export const uzyteBeleParser`

### services/pendingOrderPriceCleanupScheduler.ts
- L14: `export class PendingOrderPriceCleanupScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
  - `manualTrigger()`
- L117: `export function getPendingPriceCleanupScheduler`
- L124: `export function startPendingPriceCleanupScheduler`
- L129: `export function stopPendingPriceCleanupScheduler`

### services/pendingOrderPriceCleanupService.ts
- L14: `export interface CleanupConfig`
- L20: `export interface CleanupResult`
- L30: `export class PendingOrderPriceCleanupService`
  - `runCleanup()`
  - `getStatistics()`
  - `getAllPendingPrices()`
  - `getConfig()`

### services/pendingOrderPriceRematchService.ts
- L33: `export class PendingOrderPriceRematchService`
  - `rematchAll()`
  - `reimportPdfs()`

### services/productionPlanningService.ts
- L13: `export class ProductionPlanningService`
  - `getAllEfficiencyConfigs`, `getEfficiencyConfigById`, `getEfficiencyConfigByClientType`, `createEfficiencyConfig`, `updateEfficiencyConfig`, `deleteEfficiencyConfig`, `getAllSettings`, `getSettingByKey`, `upsertSetting`, `deleteSetting`, `getCalendarDays`, `getCalendarDay`, `upsertCalendarDay`, `deleteCalendarDay`, `getProfilesWithPalletized`, `updateProfilePalletized`, `bulkUpdateProfilePalletized`, `getColorsWithTypical`, `updateColorTypical`, `bulkUpdateColorTypical`

### services/productionReportPdfService.ts
- L35: `export class ProductionReportPdfService`
  - `generatePdf()`
  - `generateFilename()`
- L772: `export const productionReportPdfService`

### services/productionReportService.ts
- L24: `export interface ReportItem`
- L77: `export interface ReportSummary`
- L132: `export interface UpdateReportItemData`
- L143: `export interface UpdateAtypicalData`
- L152: `export interface FullReport`
- L166: `export class ProductionReportService`
  - `getReport`, `updateReportItem`, `updateInvoice`, `setVerified`, `updateAtypical`, `closeMonth`, `reopenMonth`, `getSummary`, `getInvoiceAutoFillPreview`, `executeInvoiceAutoFill`, `validateProductionDate`
- L803: `export const productionReportService`

### services/profileService.ts
- L10: `export class ProfileService`
  - `getAllProfiles()`
  - `getProfileById()`
  - `createProfile()`
  - `updateProfile()`
  - `deleteProfile()`
  - `updateProfileOrders()`

### services/readiness/DeliveryReadinessAggregator.ts
- L35: `export class DeliveryReadinessAggregator`
  - `calculateReadiness()`
  - `calculateAndPersist()`
  - `getReadiness()`
  - `recalculateIfNeeded()`
  - `recalculateMultiple()`
  - `getBatchReadiness()`

### services/readiness/index.ts
- L10: `export re-export DeliveryReadinessAggregator`
- L23: `export re-export MODULE_SEVERITY`

### services/readiness/modules/DeliveryDateMismatchModule.ts
- L21: `export class DeliveryDateMismatchModule`
  - `check()`

### services/readiness/modules/GlassDeliveryCheck.ts
- L15: `export class GlassDeliveryCheck`
  - `check()`

### services/readiness/modules/index.ts
- L5: `export re-export MailCompletenessCheck`
- L6: `export re-export LabelCheckModule`
- L7: `export re-export DeliveryDateMismatchModule`
- L8: `export re-export MissingDeliveryDateModule`
- L9: `export re-export GlassDeliveryCheck`
- L10: `export re-export OkucDeliveryCheck`
- L11: `export re-export PalletValidationCheck`
- L12: `export re-export OrdersCompletedCheck`

### services/readiness/modules/LabelCheckModule.ts
- L17: `export class LabelCheckModule`
  - `check()`

### services/readiness/modules/MailCompletenessCheck.ts
- L17: `export class MailCompletenessCheck`
  - `check()`

### services/readiness/modules/MissingDeliveryDateModule.ts
- L20: `export class MissingDeliveryDateModule`
  - `check()`

### services/readiness/modules/OkucDeliveryCheck.ts
- L16: `export class OkucDeliveryCheck`
  - `check()`

### services/readiness/modules/OrdersCompletedCheck.ts
- L17: `export class OrdersCompletedCheck`
  - `check()`

### services/readiness/modules/PalletValidationCheck.ts
- L16: `export class PalletValidationCheck`
  - `check()`

### services/readiness/types.ts
- L22: `export type ReadinessCheckStatus`
- L25: `export type ReadinessModuleName`
- L36: `export interface ReadinessCheckResult`
- L45: `export interface ReadinessCheckDetail`
- L52: `export interface ReadinessCheckModule`
- L58: `export type AggregatedReadinessStatus`
- L61: `export interface AggregatedReadinessResult`
- L71: `export interface ReadinessChecklistItem`
- L79: `export const MODULE_SEVERITY`
- L91: `export const MODULE_LABELS`

### services/readinessOrchestrator.ts
- L24: `export type ReadinessModule`
- L25: `export type SignalStatus`
- L27: `export interface ReadinessSignal`
- L36: `export interface ChecklistItem`
- L43: `export interface ReadinessResult`
- L54: `export class ReadinessOrchestrator`
  - `canStartProduction()`
  - `canShipDelivery()`

### services/schuco/schucoItemParser.ts
- L24: `export interface SchucoOrderItemRow`
- L43: `export class SchucoItemParser`
  - `parseCSV()`
  - `parseDeliveryWeek()`

### services/schuco/schucoItemScraper.ts
- L11: `export class SchucoItemScraper`
  - `fetchItemsForOrder()`
  - `fetchItemsForMultipleOrders()`

### services/schuco/schucoItemService.ts
- L38: `export class SchucoItemService`
  - `startAutoFetchScheduler`, `stopAutoFetchScheduler`, `autoFetchChangedItems`, `isItemFetchRunning`, `fetchMissingItems`, `fetchItemsByDeliveryIds`, `fetchAllItems`, `fetchItemsFromDate`, `getSchedulerStatus`, `getItemsForDelivery`, `getItemsStats`, `clearOldChangeMarkers`, `refreshStaleItems`, `getStaleItemsCount`

### services/schuco/schucoLinkService.ts
- L9: `export class SchucoLinkService`
  - `linkOrderToWaitingDeliveries()`
  - `linkMultipleOrdersToWaitingDeliveries()`

### services/schuco/schucoOrderMatcher.ts
- L16: `export function extractOrderNumbers`
- L41: `export function isWarehouseItem`
- L55: `export function parseDeliveryWeek`
- L106: `export function aggregateSchucoStatus`
- L160: `export class SchucoOrderMatcher`
  - `processSchucoDelivery`, `processAllDeliveries`, `getSchucoDeliveriesForOrder`, `getSchucoStatusForOrder`, `createManualLink`, `deleteLink`, `getUnlinkedDeliveries`

### services/schuco/schucoParser.ts
- L6: `export interface SchucoDeliveryRow`
- L22: `export class SchucoParser`
  - `parseCSV()`
  - `parseDate()`
  - `formatDateForDB()`
  - `parseEurAmount()`

### services/schuco/schucoScheduler.ts
- L15: `export class SchucoScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
- L191: `export function getSchucoScheduler`
- L198: `export function startSchucoScheduler`
- L203: `export function stopSchucoScheduler`

### services/schuco/schucoScraper.ts
- L17: `export class SchucoScraper`
  - `scrapeDeliveries()`
  - `loginAndNavigateToOrderList()`
  - `getPage()`
  - `getDownloadPath()`
  - `close()`

### services/schuco/schucoService.ts
- L41: `export class SchucoService`
  - `cancelFetch`, `isImportRunning`, `fetchAndStoreDeliveries`, `getDeliveries`, `getRecentDeliveries`, `getFetchLogs`, `getLastFetchStatus`, `getStatistics`, `getOrderMatcher`, `syncAllOrderLinks`, `getDeliveriesForOrder`, `getSchucoStatusForOrder`, `getUnlinkedDeliveries`, `getDeliveriesByWeek`, `cleanupStalePendingLogs`, `archiveOldDeliveries`, `getArchivedDeliveries`, `getArchiveStats`

### services/seedDefaultWorkers.ts
- L175: `export async function seedDefaultWorkers`

### services/settingsService.ts
- L8: `export class SettingsService`
  - `getAllSettings`, `getSettingByKey`, `upsertSetting`, `upsertManySettings`, `getAllPalletTypes`, `createPalletType`, `updatePalletType`, `deletePalletType`, `getAllPackingRules`, `createPackingRule`, `updatePackingRule`, `deletePackingRule`, `getUserFolderPath`, `updateUserFolderPath`, `updateGlobalFolderPath`, `getAllDocumentAuthorMappings`, `createDocumentAuthorMapping`, `updateDocumentAuthorMapping`, `deleteDocumentAuthorMapping`

### services/softDeleteCleanupScheduler.ts
- L15: `export class SoftDeleteCleanupScheduler`
  - `start()`
  - `stop()`
  - `getStatus()`
  - `dryRun()`
  - `manualTrigger()`
- L144: `export function getSoftDeleteCleanupScheduler`
- L154: `export function startSoftDeleteCleanupScheduler`
- L162: `export function stopSoftDeleteCleanupScheduler`

### services/softDeleteCleanupService.ts
- L16: `export interface CleanupResult`
- L24: `export interface CleanupStats`
- L30: `export class SoftDeleteCleanupService`
  - `getCleanupStats()`
  - `cleanup()`
  - `getRetentionDaysFromSettings()`

### services/SteelRwService.ts
- L22: `export class SteelRwService`
  - `processRwForOrder()`
  - `reverseRwForOrder()`
  - `processRwForOrders()`

### services/steelService.ts
- L13: `export class SteelService`
  - `getAll`, `getById`, `getByNumber`, `getByArticleNumber`, `create`, `update`, `delete`, `updateOrders`, `getStock`, `updateStock`, `getAllWithStock`, `findOrCreateByArticleNumber`, `getHistory`

### services/timesheetsService.ts
- L25: `export class TimesheetsService`
  - `getAllWorkers`, `getWorkerById`, `createWorker`, `updateWorker`, `deactivateWorker`, `getAllPositions`, `getPositionById`, `createPosition`, `updatePosition`, `getAllNonProductiveTaskTypes`, `getNonProductiveTaskTypeById`, `createNonProductiveTaskType`, `updateNonProductiveTaskType`, `getAllSpecialWorkTypes`, `getSpecialWorkTypeById`, `createSpecialWorkType`, `updateSpecialWorkType`, `toggleSpecialWorkType`, `getTimeEntries`, `getTimeEntryById`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `setStandardDay`, `setAbsenceRange`, `getCalendarSummary`, `getDaySummary`

### services/userService.ts
- L21: `export async function getAllUsers`
- L44: `export async function getUserById`
- L64: `export async function createUser`
- L104: `export async function updateUser`
- L165: `export async function deleteUser`
- L212: `export async function restoreUser`

### services/warehouse/index.ts
- L24: `export class WarehouseService`
  - `getColorWarehouseData`, `updateStock`, `performMonthlyUpdate`, `rollbackInventory`, `finalizeMonth`, `getAllShortages`, `getMonthlyUsage`, `getHistoryByColor`, `getAllHistory`

### services/warehouse/types.ts
- L8: `export interface WarehouseRow`
- L42: `export interface Shortage`
- L59: `export interface MonthlyUsage`
- L75: `export interface MonthlyUpdateInput`
- L83: `export interface MonthlyUpdateResult`

### services/warehouse/WarehouseInventoryService.ts
- L11: `export class WarehouseInventoryService`
  - `performMonthlyUpdate()`
  - `rollbackInventory()`
  - `finalizeMonth()`

### services/warehouse/WarehouseOrderService.ts
- L36: `export class WarehouseOrderService`
  - `findAll()`
  - `findById()`
  - `create()`
  - `update()`
  - `delete()`

### services/warehouse/WarehouseRwService.ts
- L22: `export class WarehouseRwService`
  - `processRwForOrder()`
  - `reverseRwForOrder()`
  - `processRwForOrders()`

### services/warehouse/WarehouseShortageService.ts
- L10: `export class WarehouseShortageService`
  - `getAllShortages()`

### services/warehouse/WarehouseStockService.ts
- L12: `export class WarehouseStockService`
  - `getColorWarehouseData()`
  - `updateStock()`

### services/warehouse/WarehouseUsageService.ts
- L9: `export class WarehouseUsageService`
  - `getMonthlyUsage()`
  - `getHistoryByColor()`
  - `getAllHistory()`

---

## Backend - Repositories

Lokalizacja: `apps/api/src/repositories/`

### repositories/AkrobudVerificationRepository.ts
- L9: `export interface VerificationListFilters`
- L14: `export interface CreateListData`
- L21: `export interface UpdateListData`
- L29: `export interface CreateItemData`
- L37: `export class AkrobudVerificationRepository`
  - `create`, `findById`, `findByDeliveryDate`, `findAll`, `update`, `softDelete`, `addItems`, `clearItems`, `updateItemMatch`, `updateItemPosition`, `deleteItem`, `getItemsWithOrders`, `linkToDelivery`, `batchUpdateMatchStatus`

### repositories/BugReportRepository.ts
- L19: `export class BugReportRepository`
  - `save()`
  - `getAll()`

### repositories/ColorRepository.ts
- L8: `export class ColorRepository`
  - `findAll`, `findById`, `findByCode`, `create`, `update`, `delete`, `getAllProfiles`, `createProfileColorLinks`, `createWarehouseStockEntries`, `updateProfileColorVisibility`

### repositories/DashboardRepository.ts
- L12: `export class DashboardRepository`
  - `countActiveOrders`, `getUpcomingDeliveries`, `getPendingImports`, `countPendingImports`, `countPendingImportsByType`, `getRecentOrders`, `getShortages`, `countTodayDeliveries`, `getWeeklyStats`, `getOrdersInRange`, `countDeliveriesInRange`

### repositories/DeliveryReadinessRepository.ts
- L9: `export class DeliveryReadinessRepository`
  - `findByDeliveryId`, `findByDeliveryIds`, `getStatusMap`, `upsert`, `deleteByDeliveryId`, `findDeliveryIdsByStatus`, `findStaleDeliveryIds`, `getStatusStats`, `findBlockedWithDetails`

### repositories/DeliveryRepository.ts
- L17: `export interface DeliveryFilters`
- L26: `export class DeliveryRepository`
  - `findAll`, `findById`, `create`, `update`, `delete`, `addOrderToDelivery`, `addOrderToDeliveryAtomic`, `removeOrderFromDelivery`, `getMaxOrderPosition`, `reorderDeliveryOrders`, `moveOrderBetweenDeliveries`, `addItem`, `removeItem`, `getDeliveryOrders`, `updateOrdersBatch`, `getCalendarData`, `getDeliveriesWithRequirements`, `getDeliveriesWithWindows`, `getDeliveriesWithProfileStats`, `getDeliveryForProtocol`, `getWorkingDays`

### repositories/ImportRepository.ts
- L7: `export interface ImportFilters`
- L11: `export interface CreateImportData`
- L19: `export interface UpdateImportData`
- L26: `export class ImportRepository`
  - `findAll`, `findById`, `findPending`, `create`, `update`, `delete`, `findDuplicatePdfImport`, `findOrderByNumber`, `findOrderByNumberWithPrefix`, `findOrderById`, `deleteOrder`, `findDeliveryByDateAndNumber`, `createDelivery`, `findDeliveryById`, `findExistingDeliveryOrder`, `getMaxDeliveryOrderPosition`, `addOrderToDelivery`, `findDeliveriesOnDate`, `getSetting`, `addOrderToDeliveryIfNotExists`, `findOrderInOtherDelivery`, `findOrderByOrderNumber`

### repositories/LabelCheckRepository.ts
- L16: `export interface LabelCheckFilters`
- L24: `export interface LabelCheckPagination`
- L29: `export interface CreateLabelCheckInput`
- L35: `export interface CreateResultInput`
- L46: `export interface UpdateStatusInput`
- L55: `export interface LabelCheckWithResults`
- L65: `export interface PaginatedLabelCheckResponse`
- L72: `export class LabelCheckRepository`
  - `create`, `findById`, `findByDeliveryId`, `findAll`, `softDelete`, `softDeleteByDeliveryId`, `addResult`, `updateStatus`, `getLatestForDelivery`, `createWithResults`

### repositories/LogisticsRepository.ts
- L9: `export interface CreateMailListData`
- L19: `export interface CreateMailItemData`
- L38: `export interface MailListFilters`
- L45: `export class LogisticsRepository`
  - `createMailList`, `createMailItems`, `createMailListWithItems`, `getMailListById`, `getLatestVersionByDeliveryCode`, `getAllVersionsByDeliveryCode`, `getMaxVersionByDeliveryCode`, `getMailLists`, `getDeliveryCalendar`, `softDeleteMailList`, `findOrderByProjectNumber`, `findOrdersByProjectNumbers`, `updateMailItem`, `updateMailItemQuantity`, `getMailItemById`, `softDeleteMailItem`, `markItemAsConfirmed`, `createDecisionLog`, `getDecisionLogsForItem`, `getDecisionLogsForDelivery`
- L544: `export const logisticsRepository`

### repositories/MojaPracaRepository.ts
- L4: `export interface CreateConflictData`
- L22: `export interface ResolveConflictData`
- L29: `export class MojaPracaRepository`
  - `getConflicts`, `getConflictById`, `countConflicts`, `createConflict`, `resolveConflict`, `findConflictByFilepath`, `getOrdersForUserByDate`, `getDeliveriesForUserByDate`, `getGlassOrdersForUserByDate`, `getAkrobudOrdersInProductionWithoutPrice`, `getUpcomingDeliveriesWithLabelIssues`, `getGlassOrdersSimple`

### repositories/okuc/index.ts
- L6: `export re-export OkucArticleRepository`
- L7: `export re-export OkucStockRepository`
- L8: `export re-export OkucDemandRepository`
- L9: `export re-export OkucOrderRepository`
- L10: `export re-export OkucProportionRepository`

### repositories/okuc/OkucArticleRepository.ts
- L8: `export class OkucArticleRepository`
  - `findAll`, `findById`, `findByArticleId`, `create`, `update`, `delete`, `addAlias`, `getAliases`, `deactivateAlias`, `findByAlias`, `findPhaseOutArticles`, `setReplacement`, `validateReplacementCandidate`, `transferDemand`, `countPendingDemands`, `getTotalStock`

### repositories/okuc/OkucDemandRepository.ts
- L8: `export class OkucDemandRepository`
  - `findAll()`
  - `findById()`
  - `getSummaryByWeek()`
  - `create()`
  - `update()`
  - `delete()`

### repositories/okuc/OkucOrderRepository.ts
- L8: `export class OkucOrderRepository`
  - `findAll`, `findById`, `getStats`, `countByYear`, `create`, `update`, `receiveOrder`, `delete`

### repositories/okuc/OkucProportionRepository.ts
- L8: `export class OkucProportionRepository`
  - `findAll`, `findById`, `findBySourceArticle`, `findByTargetArticle`, `exists`, `create`, `update`, `delete`, `deactivate`, `activate`, `getProportionChains`

### repositories/okuc/OkucStockRepository.ts
- L8: `export interface StockSummary`
- L16: `export class OkucStockRepository`
  - `findAll`, `findById`, `findByArticle`, `update`, `adjustQuantity`, `getSummary`, `findBelowMinimum`, `upsert`, `getHistory`

### repositories/OperatorDashboardRepository.ts
- L12: `export class OperatorDashboardRepository`
  - `getCompletenessStats`, `getRecentStatusChanges`, `getOrdersWithoutFiles`, `getOrdersWithoutGlass`, `getOrdersWithHardwareIssues`, `countPendingConflicts`, `getUser`

### repositories/OrderRepository.ts
- L8: `export interface OrderFilters`
- L15: `export class OrderRepository`
  - `findAll`, `findById`, `findByOrderNumber`, `create`, `update`, `getOrderDeliveries`, `softDelete`, `restore`, `archive`, `unarchive`, `updateManualStatus`, `updateSpecialType`, `bulkUpdateStatus`, `findForProduction`, `findPrivateOrders`, `findPrivateOrdersExcludingDeadline`, `findUpcomingDeliveries`, `findMonthlyProduction`, `search`, `getCompletenessStats`, `getRequirementsTotals`

### repositories/PalletOptimizerRepository.ts
- L9: `export class PalletOptimizerRepository`
  - `getProfileDepths`, `getPalletTypes`, `getDeliveryWindows`, `deliveryExists`, `saveOptimization`, `getOptimization`, `deleteOptimization`, `optimizationExists`, `getAllPalletTypes`, `createPalletType`, `updatePalletType`, `deletePalletType`, `getPalletTypeById`

### repositories/PendingOrderPriceRepository.ts
- L7: `export class PendingOrderPriceRepository`
  - `findOldPending`, `findOldApplied`, `findExpired`, `deleteManyByIds`, `markAsExpired`, `getStatistics`, `findAll`

### repositories/ProductionReportRepository.ts
- L10: `export interface ProductionReportUpdateData`
- L20: `export interface ProductionReportItemData`
- L34: `export class ProductionReportRepository`
  - `findByYearMonth`, `create`, `findOrCreate`, `update`, `getCompletedOrdersForMonth`, `findReportItem`, `upsertReportItem`, `updateInvoice`, `closeMonth`, `reopenMonth`, `getSmallGlassStats`, `getWorkingDaysCount`
- L527: `export const productionReportRepository`

### repositories/ProfileDepthRepository.ts
- L8: `export class ProfileDepthRepository`
  - `getAll`, `getById`, `getByProfileType`, `getDepthsMap`, `create`, `update`, `delete`

### repositories/ProfilePalletConfigRepository.ts
- L8: `export class ProfilePalletConfigRepository`
  - `getAll()`
  - `getById()`
  - `getBeamsPerPalletMap()`
  - `create()`
  - `update()`
  - `delete()`

### repositories/ProfileRepository.ts
- L8: `export class ProfileRepository`
  - `findAll`, `findById`, `findByNumber`, `findByArticleNumber`, `create`, `update`, `delete`, `getRelatedCounts`, `updateProfileOrders`, `getAllColors`, `createProfileColorLinks`, `createWarehouseStockEntries`

### repositories/SettingsRepository.ts
- L7: `export class SettingsRepository`
  - `findAll`, `findByKey`, `upsert`, `upsertMany`, `findAllPalletTypes`, `createPalletType`, `updatePalletType`, `deletePalletType`, `findAllPackingRules`, `createPackingRule`, `updatePackingRule`, `deletePackingRule`, `findUserFolderSettings`, `findGlobalFolderSettings`, `upsertUserFolderSettings`, `upsertGlobalFolderSettings`, `findAllDocumentAuthorMappings`, `createDocumentAuthorMapping`, `updateDocumentAuthorMapping`, `deleteDocumentAuthorMapping`

### repositories/SteelRepository.ts
- L7: `export class SteelRepository`
  - `findAll`, `findById`, `findByNumber`, `findByArticleNumber`, `create`, `update`, `delete`, `hasRelations`, `updateOrders`, `getStock`, `updateStock`, `findAllWithStock`, `isNumberUnique`, `isArticleNumberUnique`, `getHistory`

### repositories/WarehouseRepository.ts
- L11: `export class WarehouseRepository`
  - `getStock`, `updateStock`, `getStockByProfileColor`, `getStocksByColor`, `getDemandsByColor`, `getWarehouseOrdersByColor`, `getColorInfo`, `getSettings`, `getAllStocksWithDemands`, `getAllWarehouseOrders`, `updateStockTransaction`, `performMonthlyUpdate`, `getHistoryByColor`, `getAllHistory`, `getLatestInventoryHistory`, `getArchivedOrdersInTimeWindow`, `performRollback`, `getMonthlyUsageData`, `getCompletedOrdersInMonth`, `archiveOrders`

---

## Backend - Routes

Lokalizacja: `apps/api/src/routes/`

| Plik | Linia | Eksport |
|------|-------|---------|
| `akrobud-verification.ts` | L13 | `export const akrobudVerificationRoutes` |
| `attendance.ts` | L12 | `export const attendanceRoutes` |
| `auth.ts` | L9 | `export async function authRoutes` |
| `bug-reports.ts` | L13 | `export async function bugReportRoutes` |
| `colors.ts` | L9 | `export const colorRoutes` |
| `currency-config.ts` | L11 | `export const currencyConfigRoutes` |
| `dashboard.ts` | L25 | `export const dashboardRoutes` |
| `deliveries.ts` | L14 | `export const deliveryRoutes` |
| `glass-deliveries.ts` | L5 | `export const glassDeliveryRoutes` |
| `glass-orders.ts` | L5 | `export const glassOrderRoutes` |
| `glass-validations.ts` | L11 | `export const glassValidationRoutes` |
| `gmail.ts` | L9 | `export const gmailRoutes` |
| `health.ts` | L11 | `export async function healthRoutes` |
| `help.ts` | L8 | `export const helpRoutes` |
| `imports.ts` | L16 | `export const importRoutes` |
| `label-checks.ts` | L14 | `export const labelCheckRoutes` |
| `logistics.ts` | L31 | `export const logisticsRoutes` |
| `moja-praca.ts` | L10 | `export const mojaPracaRoutes` |
| `monthly-reports.ts` | L11 | `export const monthlyReportsRoutes` |
| `okuc.ts` | L15 | `export const okucRoutes` |
| `okuc/articles.ts` | L10 | `export const okucArticleRoutes` |
| `okuc/demand.ts` | L10 | `export const okucDemandRoutes` |
| `okuc/index.ts` | L6 | `export re-export okucArticleRoutes` |
| `okuc/index.ts` | L7 | `export re-export okucStockRoutes` |
| `okuc/index.ts` | L8 | `export re-export okucDemandRoutes` |
| `okuc/index.ts` | L9 | `export re-export okucOrderRoutes` |
| `okuc/index.ts` | L10 | `export re-export okucProportionRoutes` |
| `okuc/index.ts` | L11 | `export re-export okucLocationRoutes` |
| `okuc/index.ts` | L12 | `export re-export okucReplacementRoutes` |
| `okuc/locations.ts` | L10 | `export const okucLocationRoutes` |
| `okuc/orders.ts` | L10 | `export const okucOrderRoutes` |
| `okuc/proportions.ts` | L10 | `export const okucProportionRoutes` |
| `okuc/replacements.ts` | L15 | `export const okucReplacementRoutes` |
| `okuc/stock.ts` | L10 | `export const okucStockRoutes` |
| `orders.ts` | L11 | `export const orderRoutes` |
| `pallet-stock.ts` | L13 | `export const palletStockRoutes` |
| `pallets.ts` | L12 | `export const palletRoutes` |
| `pending-order-price-cleanup.ts` | L18 | `export async function pendingOrderPriceCleanupRoutes` |
| `private-colors.ts` | L16 | `export const privateColorRoutes` |
| `production-planning.ts` | L17 | `export const productionPlanningRoutes` |
| `production-reports.ts` | L10 | `export const productionReportRoutes` |
| `profileDepths.ts` | L11 | `export const profileDepthRoutes` |
| `profilePalletConfig.ts` | L10 | `export const profilePalletConfigRoutes` |
| `profiles.ts` | L9 | `export const profileRoutes` |
| `pvc-warehouse.ts` | L81 | `export async function pvcWarehouseRoutes` |
| `schuco.ts` | L8 | `export default async function schucoRoutes` |
| `settings.ts` | L12 | `export const settingsRoutes` |
| `steel.ts` | L10 | `export async function steelRoutes` |
| `timesheets.ts` | L12 | `export const timesheetsRoutes` |
| `users.ts` | L17 | `export default async function userRoutes` |
| `warehouse-orders.ts` | L6 | `export const warehouseOrderRoutes` |
| `warehouse.ts` | L10 | `export const warehouseRoutes` |
| `working-days.ts` | L10 | `export const workingDaysRoutes` |

---

## Backend - Middleware

Lokalizacja: `apps/api/src/middleware/`

### middleware/auth.ts
- L9: `export interface AuthenticatedRequest`
- L21: `export async function verifyAuth`
- L46: `export async function withAuth`

### middleware/error-handler.ts
- L11: `export interface ErrorResponse`
- L21: `export function setupErrorHandler`

### middleware/request-logger.ts
- L8: `export function setupRequestLogging`

### middleware/role-check.ts
- L43: `export async function requireUserManagement`
- L76: `export async function requireManagerAccess`
- L109: `export async function requireAdmin`
- L141: `export function requirePermission`

---

## Backend - Plugins

Lokalizacja: `apps/api/src/plugins/`

### plugins/swagger.ts
- L10: `export async function setupSwagger`

### plugins/websocket.ts
- L238: `export async function setupWebSocket`

---

## Backend - Utils

Lokalizacja: `apps/api/src/utils/`

### utils/config.ts
- L11: `export interface AppConfig`
- L154: `export const config`

### utils/date-helpers.ts
- L19: `export const TIMEZONE`
- L68: `export function parseDate`
- L87: `export function parseDateSafe`
- L101: `export function formatPolishDate`
- L109: `export function formatPolishDateTime`
- L117: `export function formatISODate`
- L125: `export function formatPolishMonth`
- L133: `export function getPolishDayName`
- L141: `export function getPolishDayNameShort`
- L148: `export function getDayStart`
- L155: `export function getDayEnd`
- L162: `export function getDayRange`
- L172: `export function getMonthRange`
- L182: `export function getWeekRange`
- L192: `export function isWeekend`
- L201: `export const POLISH_DAY_NAMES`
- L214: `export const POLISH_MONTH_NAMES`
- L232: `export function formatDeliveryDate`
- L239: `export function toRomanNumeral`
- L249: `export function getWeekNumber`
- L263: `export function getDateRangeFromNow`
- L275: `export function getWeekRangeByIndex`
- L293: `export function isDateInRange`
- L303: `export function getMonthStart`
- L317: `export function getMonthEnd`
- L341: `export function formatDateWarsaw`
- L349: `export function formatDateWarsawPolish`
- L357: `export function formatDateTimeWarsaw`
- L365: `export function formatDateTimeWarsawPolish`
- L374: `export function getTodayWarsaw`
- L381: `export function getStartOfDayWarsaw`
- L389: `export function getEndOfDayWarsaw`
- L398: `export function normalizeDateWarsaw`
- L406: `export function isSameDayWarsaw`
- L414: `export function parseDateWarsaw`
- L421: `export function getWeekNumberWarsaw`
- L429: `export function dayjsWarsaw`
- L434: `export re-export dayjs`

### utils/delivery-status-machine.ts
- L27: `export const DELIVERY_STATUSES`
- L33: `export type DeliveryStatus`
- L61: `export const DELIVERY_STATUS_LABELS`
- L84: `export function validateDeliveryStatusTransition`
- L151: `export function getAllowedDeliveryTransitions`
- L175: `export function isTerminalDeliveryStatus`
- L192: `export function canTransitionDelivery`
- L209: `export function validateOrdersForDeliveryStatus`

### utils/eager-import.ts
- L44: `export async function getExcelJS`
- L54: `export async function getPdfKit`
- L65: `export async function preloadHeavyModules`
- L86: `export function getLoadedModules`

### utils/errors.ts
- L5: `export class AppError`
- L16: `export class ValidationError`
- L47: `export class NotFoundError`
- L54: `export class UnauthorizedError`
- L61: `export class ForbiddenError`
- L68: `export class ConflictError`
- L75: `export class InternalServerError`
- L82: `export class DatabaseError`
- L93: `export function parseIntParam`

### utils/file-validation.ts
- L28: `export const MAX_FILE_SIZE`
- L33: `export function validateMimeType`
- L54: `export function validateFileExtension`
- L77: `export function validateFilename`
- L114: `export function validateFileSize`
- L136: `export function sanitizeFilename`
- L155: `export function validateUploadedFile`

### utils/healthChecks.ts
- L11: `export type HealthStatus`
- L13: `export interface HealthCheckResult`
- L22: `export async function checkDatabase`
- L41: `export async function checkDiskSpace`
- L84: `export async function checkNetworkFolders`
- L138: `export async function checkLastImports`
- L180: `export function checkUptime`
- L213: `export async function checkAllSystems`

### utils/jwt.ts
- L17: `export interface DecodeTokenResult`
- L25: `export function encodeToken`
- L40: `export function decodeToken`
- L60: `export function decodeTokenWithError`
- L81: `export function extractToken`

### utils/logger.ts
- L8: `export type LogLevel`
- L112: `export const logger`
- L115: `export re-export pinoLogger`

### utils/optimistic-locking.ts
- L10: `export class OptimisticLockError`
- L17: `export interface RetryOptions`
- L39: `export async function withOptimisticLockRetry`

### utils/order-status-machine.ts
- L26: `export const ORDER_STATUSES`
- L33: `export type OrderStatus`
- L70: `export function validateStatusTransition`
- L124: `export function getAllowedTransitions`
- L147: `export function isTerminalStatus`
- L164: `export function canTransition`

### utils/prisma-selects.ts
- L12: `export const profileBasicSelect`
- L21: `export const profileExtendedSelect`
- L32: `export const colorMinimalSelect`
- L41: `export const colorBasicSelect`
- L50: `export const colorExtendedSelect`
- L61: `export const orderBasicSelect`
- L69: `export const orderSummarySelect`
- L80: `export const deliveryBasicSelect`
- L90: `export const profileColorSelect`
- L102: `export const windowBasicSelect`
- L110: `export type ProfileBasicSelect`
- L111: `export type ProfileExtendedSelect`
- L112: `export type ColorMinimalSelect`
- L113: `export type ColorBasicSelect`
- L114: `export type ColorExtendedSelect`
- L115: `export type OrderBasicSelect`
- L116: `export type OrderSummarySelect`
- L117: `export type DeliveryBasicSelect`

### utils/prisma.ts
- L8: `export const prisma`
- L14: `export async function initializeSQLiteOptimizations`
- L49: `export async function withRetry`

### utils/safe-transaction.ts
- L10: `export type PrismaTransaction`
- L27: `export async function safeTransaction`
- L71: `export async function safeInteractiveTransaction`
- L118: `export async function retryTransaction`
- L184: `export async function batchTransaction`

### utils/string-utils.ts
- L15: `export function stripBOM`
- L28: `export function hasBOM`

### utils/transaction.ts
- L23: `export async function withTransaction`
- L68: `export function createTransactionFn`

### utils/validation.ts
- L25: `export function parseId`
- L56: `export function parseOptionalId`
- L80: `export function parseIds`
- L114: `export function parseInteger`
- L168: `export function parseBoolean`
- L198: `export function parseOptionalBoolean`

### utils/warehouse-utils.ts
- L24: `export function groupBy`
- L67: `export function calculateShortagePriority`
- L84: `export interface DemandSummary`
- L105: `export function createDemandMap`
- L142: `export function isWithin24Hours`

### utils/warehouse-validation.ts
- L25: `export interface MaterialShortage`
- L53: `export async function validateSufficientStock`
- L178: `export async function checkWarehouseStock`

### utils/zod-openapi.ts
- L35: `export function zodToJsonSchema`
- L127: `export const errorResponseSchema`
- L140: `export const successResponseSchema`
- L151: `export function paginatedResponseSchema`

---

## Backend - Validators

Lokalizacja: `apps/api/src/validators/`

### validators/akrobud-verification.ts
- L13: `export const createVerificationListSchema`
- L22: `export const updateVerificationListSchema`
- L31: `export const verificationItemSchema`
- L42: `export const addItemsSchema`
- L53: `export const parseTextareaSchema`
- L60: `export const verifyListSchema`
- L67: `export const applyChangesSchema`
- L79: `export const updateItemPositionSchema`
- L86: `export const handleDuplicatesSchema`
- L96: `export const verificationListParamsSchema`
- L97: `export const verificationItemParamsSchema`
- L103: `export const verificationListQuerySchema`
- L115: `export const parseMailContentSchema`
- L122: `export const previewProjectsSchema`
- L137: `export const createListVersionSchema`
- L155: `export const compareVersionsSchema`
- L163: `export const verifyProjectListSchema`
- L170: `export const listVersionsQuerySchema`
- L175: `export type CreateVerificationListInput`
- L176: `export type UpdateVerificationListInput`
- L177: `export type AddItemsInput`
- L178: `export type ParseTextareaInput`
- L179: `export type VerifyListInput`
- L180: `export type ApplyChangesInput`
- L181: `export type UpdateItemPositionInput`
- L182: `export type HandleDuplicatesInput`
- L183: `export type VerificationListParams`
- L184: `export type VerificationItemParams`
- L185: `export type VerificationListQuery`
- L188: `export type ParseMailContentInput`
- L189: `export type PreviewProjectsInput`
- L190: `export type CreateListVersionInput`
- L191: `export type CompareVersionsInput`
- L192: `export type VerifyProjectListInput`
- L193: `export type ListVersionsQuery`

### validators/auth.ts
- L8: `export enum UserRole`
- L19: `export const userRoleSchema`
- L30: `export const loginSchema`
- L35: `export type LoginInput`
- L40: `export const loginResponseSchema`
- L50: `export type LoginResponse`
- L55: `export const meResponseSchema`
- L62: `export type MeResponse`
- L67: `export const createUserSchema`
- L74: `export type CreateUserInput`
- L79: `export const updateUserSchema`
- L86: `export type UpdateUserInput`

### validators/bugReport.ts
- L8: `export const bugReportSchema`
- L20: `export const bugReportQuerySchema`
- L33: `export type BugReportInput`
- L34: `export type BugReportQuery`

### validators/color.ts
- L8: `export const createColorSchema`
- L16: `export const updateColorSchema`
- L24: `export const colorParamsSchema`
- L26: `export type CreateColorInput`
- L27: `export type UpdateColorInput`
- L28: `export type ColorParams`

### validators/common.ts
- L17: `export const dateSchema`
- L24: `export const optionalDateSchema`
- L29: `export const nullableDateSchema`
- L35: `export const idParamsSchema`
- L44: `export const paginationQuerySchema`
- L65: `export const dateRangeQuerySchema`
- L73: `export const positiveIntSchema`
- L78: `export const stringToIntSchema`
- L84: `export type IdParams`
- L85: `export type PaginationQuery`
- L86: `export type DateRangeQuery`
- L92: `export interface PaginatedResponse`
- L102: `export interface PaginationParams`

### validators/currencyConfig.ts
- L7: `export const updateCurrencyRateSchema`
- L15: `export type UpdateCurrencyRateInput`

### validators/dashboard.ts
- L19: `export const monthlyStatsQuerySchema`
- L24: `export type MonthlyStatsQuery`
- L31: `export const dashboardDataSchema`
- L81: `export type DashboardData`
- L84: `export const alertSchema`
- L94: `export const alertsResponseSchema`
- L96: `export type Alert`
- L97: `export type AlertsResponse`
- L100: `export const weekStatSchema`
- L111: `export const weeklyStatsResponseSchema`
- L115: `export type WeekStat`
- L116: `export type WeeklyStatsResponse`
- L119: `export const monthlyStatsResponseSchema`
- L129: `export type MonthlyStatsResponse`
- L135: `export const shortageResultSchema`
- L147: `export type ShortageResult`
- L149: `export const weekStatRawSchema`
- L158: `export type WeekStatRaw`

### validators/delivery.ts
- L13: `export const createDeliverySchema`
- L19: `export const updateDeliverySchema`
- L25: `export const deliveryQuerySchema`
- L32: `export const deliveryParamsSchema`
- L34: `export const addOrderSchema`
- L38: `export const moveOrderSchema`
- L43: `export const reorderSchema`
- L47: `export const addItemSchema`
- L53: `export const completeDeliverySchema`
- L57: `export const bulkUpdateDatesSchema`
- L63: `export const completeAllOrdersSchema`
- L67: `export type CreateDeliveryInput`
- L68: `export type UpdateDeliveryInput`
- L69: `export type DeliveryQuery`
- L70: `export type DeliveryParams`
- L71: `export type AddOrderInput`
- L72: `export type MoveOrderInput`
- L73: `export type ReorderInput`
- L74: `export type AddItemInput`
- L75: `export type CompleteDeliveryInput`
- L76: `export type BulkUpdateDatesInput`
- L77: `export type CompleteAllOrdersInput`
- L85: `export const validateOrderNumbersSchema`
- L92: `export const bulkAssignOrdersSchema`
- L105: `export type ValidateOrderNumbersInput`
- L106: `export type BulkAssignOrdersInput`

### validators/glass.ts
- L5: `export const glassOrderFiltersSchema`
- L10: `export const glassOrderIdParamsSchema`
- L18: `export const glassOrderStatusUpdateSchema`
- L24: `export const glassDeliveryFiltersSchema`
- L29: `export const glassDeliveryIdParamsSchema`
- L39: `export const glassValidationFiltersSchema`
- L51: `export const glassValidationResolveSchema`
- L56: `export const glassValidationOrderNumberParamsSchema`
- L60: `export const glassValidationIdParamsSchema`
- L70: `export type GlassOrderFilters`
- L71: `export type GlassOrderIdParams`
- L72: `export type GlassOrderStatusUpdate`
- L73: `export type GlassDeliveryFilters`
- L74: `export type GlassDeliveryIdParams`
- L75: `export type GlassValidationFilters`
- L76: `export type GlassValidationResolve`
- L77: `export type GlassValidationIdParams`

### validators/import.ts
- L8: `export const importParamsSchema`
- L10: `export const importQuerySchema`
- L14: `export const approveImportSchema`
- L19: `export const folderImportSchema`
- L27: `export const scanFolderQuerySchema`
- L31: `export const previewByFilepathQuerySchema`
- L35: `export const processImportSchema`
- L63: `export type ImportParams`
- L64: `export type ImportQuery`
- L65: `export type ApproveImportInput`
- L66: `export type FolderImportInput`
- L67: `export type ScanFolderQuery`
- L68: `export type PreviewByFilepathQuery`
- L69: `export type ProcessImportInput`

### validators/label-check.ts
- L24: `export const labelCheckStatusSchema`
- L25: `export type LabelCheckStatus`
- L30: `export const labelCheckResultStatusSchema`
- L37: `export type LabelCheckResultStatus`
- L46: `export const createLabelCheckSchema`
- L49: `export type CreateLabelCheckInput`
- L55: `export const labelCheckIdSchema`
- L61: `export type LabelCheckIdParams`
- L95: `export const labelCheckQuerySchema`
- L110: `export type LabelCheckQueryParams`

### validators/logistics.ts
- L15: `export const itemFlagSchema`
- L27: `export const itemStatusSchema`
- L30: `export const deliveryStatusSchema`
- L35: `export const parseMailSchema`
- L42: `export const saveMailItemSchema`
- L58: `export const saveMailListSchema`
- L70: `export const mailListQuerySchema`
- L78: `export const mailListParamsSchema`
- L83: `export const deliveryCodeParamsSchema`
- L90: `export const versionDiffQuerySchema`
- L98: `export const calendarQuerySchema`
- L106: `export const updateMailItemSchema`
- L114: `export const mailItemParamsSchema`
- L123: `export const setOrderDeliveryDateSchema`
- L131: `export type ItemFlag`
- L132: `export type ItemStatus`
- L133: `export type DeliveryStatus`
- L134: `export type ParseMailInput`
- L135: `export type SaveMailItemInput`
- L136: `export type SaveMailListInput`
- L137: `export type MailListQuery`
- L138: `export type MailListParams`
- L139: `export type DeliveryCodeParams`
- L140: `export type VersionDiffQuery`
- L141: `export type CalendarQuery`
- L142: `export type UpdateMailItemInput`
- L143: `export type MailItemParams`
- L144: `export type SetOrderDeliveryDateInput`

### validators/moja-praca.ts
- L8: `export const conflictsQuerySchema`
- L13: `export const dateQuerySchema`
- L25: `export const conflictIdParamsSchema`
- L34: `export const conflictResolutionSchema`
- L44: `export const bulkConflictResolutionSchema`
- L57: `export const conflictListItemSchema`
- L74: `export const conflictDetailSchema`
- L89: `export const conflictsCountSchema`
- L98: `export type ConflictsQuery`
- L99: `export type DateQuery`
- L100: `export type ConflictIdParams`
- L101: `export type ConflictResolutionInput`
- L102: `export type BulkConflictResolutionInput`
- L103: `export type ConflictListItem`
- L104: `export type ConflictDetail`
- L105: `export type ConflictsCount`

### validators/okuc-location.ts
- L9: `export const createOkucLocationSchema`
- L16: `export const updateOkucLocationSchema`
- L23: `export const reorderOkucLocationsSchema`
- L29: `export const okucLocationParamsSchema`
- L35: `export type CreateOkucLocationInput`
- L36: `export type UpdateOkucLocationInput`
- L37: `export type ReorderOkucLocationsInput`

### validators/okuc.ts
- L9: `export const orderClassSchema`
- L10: `export const sizeClassSchema`
- L11: `export const orderUnitSchema`
- L12: `export const warehouseTypeSchema`
- L13: `export const subWarehouseSchema`
- L14: `export const basketTypeSchema`
- L16: `export const createArticleSchema`
- L32: `export const updateArticleSchema`
- L34: `export const articleFiltersSchema`
- L42: `export const addAliasSchema`
- L48: `export const stockFiltersSchema`
- L56: `export const updateStockSchema`
- L62: `export const adjustStockSchema`
- L68: `export const transferStockSchema`
- L78: `export const demandStatusSchema`
- L86: `export const demandSourceSchema`
- L88: `export const createDemandSchema`
- L98: `export const updateDemandSchema`
- L105: `export const demandFiltersSchema`
- L118: `export const okucOrderStatusSchema`
- L129: `export const createOkucOrderSchema`
- L141: `export const updateOkucOrderSchema`
- L154: `export const receiveOrderSchema`
- L166: `export const proportionTypeSchema`
- L178: `export const createProportionSchema`
- L183: `export const updateProportionSchema`
- L190: `export const eventTypeSchema`
- L203: `export const historyFiltersSchema`
- L216: `export const importRwSchema`
- L227: `export const importDemandSchema`
- L243: `export const stockQueryFiltersSchema`
- L251: `export const adjustStockRequestSchema`
- L258: `export const importStockSchema`
- L278: `export const importOrderItemSchema`
- L287: `export const parsedOrderImportSchema`
- L297: `export const confirmOrderImportSchema`
- L313: `export type StockQueryFilters`
- L314: `export type AdjustStockRequest`
- L315: `export type ImportStockInput`
- L316: `export type CreateArticleInput`
- L317: `export type UpdateArticleInput`
- L318: `export type ArticleFilters`
- L319: `export type StockFilters`
- L320: `export type UpdateStockInput`
- L321: `export type AdjustStockInput`
- L322: `export type TransferStockInput`
- L323: `export type CreateDemandInput`
- L324: `export type UpdateDemandInput`
- L325: `export type DemandFilters`
- L326: `export type CreateOkucOrderInput`
- L327: `export type UpdateOkucOrderInput`
- L328: `export type ReceiveOrderInput`
- L329: `export type CreateProportionInput`
- L330: `export type UpdateProportionInput`
- L331: `export type HistoryFilters`
- L332: `export type ImportRwInput`
- L333: `export type ImportDemandInput`
- L334: `export type ImportOrderItem`
- L335: `export type ParsedOrderImport`
- L336: `export type ConfirmOrderImportInput`
- L345: `export const setReplacementSchema`
- L350: `export type SetReplacementInput`

### validators/operator-dashboard.ts
- L7: `export const operatorDashboardQuerySchema`
- L12: `export type OperatorDashboardQuery`
- L18: `export const completenessStatsSchema`
- L26: `export type CompletenessStats`
- L28: `export const recentActivitySchema`
- L41: `export type RecentActivity`
- L43: `export const operatorAlertSchema`
- L52: `export type OperatorAlert`
- L54: `export const operatorDashboardResponseSchema`
- L66: `export type OperatorDashboardResponse`

### validators/order.ts
- L27: `export const createOrderSchema`
- L36: `export const updateOrderSchema`
- L44: `export const patchOrderSchema`
- L60: `export const manualStatusSchema`
- L64: `export type ManualStatusInput`
- L72: `export const specialTypeSchema`
- L76: `export type SpecialTypeInput`
- L78: `export const orderParamsSchema`
- L80: `export const orderQuerySchema`
- L88: `export const bulkUpdateStatusSchema`
- L124: `export const revertProductionSchema`
- L129: `export const forProductionQuerySchema`
- L136: `export const monthlyProductionQuerySchema`
- L142: `export const variantTypeSchema`
- L148: `export type CreateOrderInput`
- L149: `export type UpdateOrderInput`
- L150: `export type PatchOrderInput`
- L151: `export type OrderParams`
- L152: `export type OrderQuery`
- L153: `export type BulkUpdateStatusInput`
- L154: `export type RevertProductionInput`
- L155: `export type ForProductionQuery`
- L156: `export type MonthlyProductionQuery`

### validators/pallet-stock.ts
- L17: `export const ProductionPalletTypeSchema`
- L30: `export const PalletDayStatusSchema`
- L40: `export const GetPalletDayParamsSchema`
- L49: `export const GetPalletMonthParamsSchema`
- L77: `export const UpdatePalletDayEntriesSchema`
- L85: `export const CorrectMorningStockSchema`
- L109: `export const UpdateAlertConfigSchema`
- L130: `export const SetInitialStocksSchema`
- L139: `export type ProductionPalletType`
- L140: `export type PalletDayStatus`
- L141: `export type GetPalletDayParams`
- L142: `export type GetPalletMonthParams`
- L143: `export type PalletDayEntry`
- L144: `export type UpdatePalletDayEntriesInput`
- L145: `export type CorrectMorningStockInput`
- L146: `export type AlertConfigEntry`
- L147: `export type UpdateAlertConfigInput`
- L148: `export type InitialStockEntry`
- L149: `export type SetInitialStocksInput`

### validators/pallet.ts
- L9: `export const optimizeDeliveryParamsSchema`
- L13: `export const optimizeDeliverySchema`
- L19: `export const optimizationOptionsSchema`
- L35: `export const optimizeDeliveryBodySchema`
- L41: `export const palletTypeSchema`
- L50: `export const updatePalletTypeSchema`
- L52: `export const palletTypeParamsSchema`
- L58: `export const packingRuleSchema`
- L65: `export const updatePackingRuleSchema`
- L67: `export const packingRuleParamsSchema`
- L73: `export type OptimizeDeliveryParams`
- L74: `export type OptimizeDeliveryInput`
- L75: `export type OptimizationOptionsInput`
- L76: `export type OptimizeDeliveryBody`
- L77: `export type PalletTypeInput`
- L78: `export type UpdatePalletTypeInput`
- L79: `export type PalletTypeParams`
- L80: `export type PackingRuleInput`
- L81: `export type UpdatePackingRuleInput`
- L82: `export type PackingRuleParams`

### validators/production-reports.ts
- L9: `export const productionReportParamsSchema`
- L15: `export const updateReportItemSchema`
- L27: `export const updateInvoiceSchema`
- L33: `export const updateAtypicalSchema`
- L42: `export type ProductionReportParams`
- L43: `export type UpdateReportItemInput`
- L44: `export type UpdateInvoiceInput`
- L45: `export type UpdateAtypicalInput`

### validators/productionPlanning.ts
- L8: `export const efficiencyConfigSchema`
- L18: `export const updateEfficiencyConfigSchema`
- L22: `export const efficiencyConfigIdSchema`
- L26: `export type EfficiencyConfigInput`
- L27: `export type UpdateEfficiencyConfigInput`
- L31: `export const productionSettingSchema`
- L37: `export const updateProductionSettingSchema`
- L42: `export type ProductionSettingInput`
- L46: `export const productionCalendarSchema`
- L53: `export const updateProductionCalendarSchema`
- L55: `export type ProductionCalendarInput`
- L59: `export const updateProfilePalletizedSchema`
- L63: `export const bulkUpdateProfilePalletizedSchema`
- L70: `export type UpdateProfilePalletizedInput`
- L71: `export type BulkUpdateProfilePalletizedInput`
- L75: `export const updateColorTypicalSchema`
- L79: `export const bulkUpdateColorTypicalSchema`
- L86: `export type UpdateColorTypicalInput`
- L87: `export type BulkUpdateColorTypicalInput`

### validators/profile.ts
- L8: `export const createProfileSchema`
- L15: `export const updateProfileSchema`
- L28: `export const profileParamsSchema`
- L30: `export const updateProfileOrderSchema`
- L39: `export type CreateProfileInput`
- L40: `export type UpdateProfileInput`
- L41: `export type ProfileParams`
- L42: `export type UpdateProfileOrderInput`

### validators/profileDepth.ts
- L9: `export const profileDepthSchema`
- L15: `export const updateProfileDepthSchema`
- L17: `export const profileDepthParamsSchema`
- L23: `export type ProfileDepthInput`
- L24: `export type UpdateProfileDepthInput`
- L25: `export type ProfileDepthParams`

### validators/profilePalletConfig.ts
- L10: `export const profilePalletConfigSchema`
- L15: `export const updateProfilePalletConfigSchema`
- L19: `export const profilePalletConfigParamsSchema`
- L25: `export type ProfilePalletConfigInput`
- L26: `export type UpdateProfilePalletConfigInput`
- L27: `export type ProfilePalletConfigParams`

### validators/schuco.ts
- L3: `export const getDeliveriesQuerySchema`
- L23: `export type GetDeliveriesQuery`

### validators/settings.ts
- L8: `export const settingKeySchema`
- L12: `export const settingValueSchema`
- L16: `export const upsertOneSettingSchema`
- L21: `export const upsertManySettingsSchema`
- L26: `export const createPalletTypeSchema`
- L36: `export const updatePalletTypeSchema`
- L49: `export const palletTypeIdSchema`
- L56: `export const createPackingRuleSchema`
- L65: `export const updatePackingRuleSchema`
- L77: `export const packingRuleIdSchema`
- L84: `export const updateUserFolderPathSchema`
- L90: `export const validateFolderSchema`
- L97: `export type SettingKeyParams`
- L98: `export type SettingValueBody`
- L99: `export type CreatePalletTypeBody`
- L100: `export type UpdatePalletTypeBody`
- L101: `export type CreatePackingRuleBody`
- L102: `export type UpdatePackingRuleBody`
- L103: `export type UpdateUserFolderPathBody`
- L104: `export type ValidateFolderBody`

### validators/steel.ts
- L7: `export const createSteelSchema`
- L16: `export const updateSteelSchema`
- L25: `export const updateSteelOrdersSchema`
- L35: `export const updateSteelStockSchema`
- L41: `export type CreateSteelInput`
- L42: `export type UpdateSteelInput`
- L43: `export type UpdateSteelOrdersInput`
- L44: `export type UpdateSteelStockInput`

### validators/timesheets.ts
- L13: `export const createWorkerSchema`
- L21: `export const updateWorkerSchema`
- L29: `export const workerParamsSchema`
- L31: `export const workerQuerySchema`
- L39: `export const createPositionSchema`
- L46: `export const updatePositionSchema`
- L53: `export const positionParamsSchema`
- L59: `export const createNonProductiveTaskTypeSchema`
- L65: `export const updateNonProductiveTaskTypeSchema`
- L71: `export const nonProductiveTaskTypeParamsSchema`
- L77: `export const createSpecialWorkTypeSchema`
- L84: `export const updateSpecialWorkTypeSchema`
- L91: `export const specialWorkTypeParamsSchema`
- L98: `export const absenceTypeSchema`
- L124: `export const createTimeEntrySchema`
- L144: `export const updateTimeEntrySchema`
- L164: `export const timeEntryParamsSchema`
- L167: `export const timeEntryQuerySchema`
- L185: `export const setStandardDaySchema`
- L192: `export const setAbsenceRangeSchema`
- L204: `export const calendarQuerySchema`
- L209: `export const daySummaryQuerySchema`
- L217: `export type CreateWorkerInput`
- L218: `export type UpdateWorkerInput`
- L219: `export type WorkerParams`
- L220: `export type WorkerQuery`
- L222: `export type CreatePositionInput`
- L223: `export type UpdatePositionInput`
- L224: `export type PositionParams`
- L226: `export type CreateNonProductiveTaskTypeInput`
- L227: `export type UpdateNonProductiveTaskTypeInput`
- L228: `export type NonProductiveTaskTypeParams`
- L230: `export type CreateSpecialWorkTypeInput`
- L231: `export type UpdateSpecialWorkTypeInput`
- L232: `export type SpecialWorkTypeParams`
- L234: `export type CreateTimeEntryInput`
- L235: `export type UpdateTimeEntryInput`
- L236: `export type TimeEntryParams`
- L237: `export type TimeEntryQuery`
- L239: `export type SetStandardDayInput`
- L240: `export type SetAbsenceRangeInput`
- L241: `export type CalendarQuery`
- L242: `export type DaySummaryQuery`
- L243: `export type AbsenceType`

### validators/warehouse-orders.ts
- L4: `export const warehouseOrderQuerySchema`
- L10: `export type WarehouseOrderQuery`
- L13: `export const warehouseOrderIdParamsSchema`
- L17: `export type WarehouseOrderIdParams`
- L20: `export const createWarehouseOrderSchema`
- L30: `export type CreateWarehouseOrderInput`
- L33: `export const updateWarehouseOrderSchema`
- L42: `export type UpdateWarehouseOrderInput`

### validators/warehouse.ts
- L12: `export const warehouseStatsQuerySchema`
- L17: `export const warehouseOrderParamsSchema`
- L19: `export const updateWarehouseOrderSchema`
- L24: `export type WarehouseStatsQuery`
- L25: `export type WarehouseOrderParams`
- L26: `export type UpdateWarehouseOrderInput`
- L36: `export const colorIdParamSchema`
- L46: `export const profileColorParamsSchema`
- L59: `export const updateStockBodySchema`
- L72: `export const monthlyUpdateBodySchema`
- L100: `export const rollbackInventoryBodySchema`
- L113: `export const finalizeMonthBodySchema`
- L124: `export const historyQuerySchema`
- L138: `export const averageQuerySchema`
- L152: `export type ColorIdParams`
- L153: `export type ProfileColorParams`
- L154: `export type UpdateStockBody`
- L155: `export type MonthlyUpdateBody`
- L156: `export type RollbackInventoryBody`
- L157: `export type FinalizeMonthBody`
- L158: `export type HistoryQuery`
- L159: `export type AverageQuery`

---

## Backend - Types & Config

### config/cleanup.ts
- L13: `export const CLEANUP_CONFIG`

### types/fastify.ts
- L18: `export type FastifyWithPrisma`

---

## Frontend - Shared Hooks

Lokalizacja: `apps/web/src/hooks/`

### hooks/useColors.ts
- L9: `export function useColors`

### hooks/useContextualToast.ts
- L5: `export type ContextualToastVariant`
- L15: `export function useContextualToast`

### hooks/useDebounce.ts
- L6: `export function useDebounce`

### hooks/useDestructiveAction.ts
- L12: `export function useDestructiveAction`

### hooks/useFormValidation.ts
- L3: `export type ValidationRule`
- L8: `export type ValidationSchema`
- L12: `export interface UseFormValidationReturn`
- L38: `export function useFormValidation`

### hooks/useHooksSafeOrder.ts
- L45: `export function useHooksSafeOrder`
- L116: `export const HOOKS_SAFE_CHECKLIST`

### hooks/useProfileStats.ts
- L8: `export const PROFILE_STATS_QUERY_KEY`
- L23: `export function useProfileStats`

### hooks/useRealtimeSync.ts
- L40: `export function useRealtimeSync`

### hooks/useToast.ts
- L4: `export type ToastActionElement`
- L84: `export const reducer`
- L199: `export re-export useToast`

### hooks/useToastMutation.ts
- L20: `export interface UseToastMutationOptions`
- L131: `export function useToastMutation`
- L262: `export function useToastMutationWithProgress`

### hooks/useUndoableAction.ts
- L19: `export interface UseUndoableActionOptions`
- L72: `export interface UseUndoableActionReturn`
- L142: `export function useUndoableAction`
- L269: `export function useConfirmAndUndo`

### hooks/useWebSocket.ts
- L24: `export function useWebSocket`

### hooks/useWindowStats.ts
- L8: `export const WINDOW_STATS_QUERY_KEY`
- L9: `export const WINDOW_STATS_BY_WEEKDAY_QUERY_KEY`
- L24: `export function useWindowStats`
- L45: `export function useWindowStatsByWeekday`

---

## Frontend - Lib / API Client

Lokalizacja: `apps/web/src/lib/`

### lib/api-client.ts
- L42: `export interface ApiError`
- L62: `export async function fetchApi`
- L134: `export async function uploadFile`
- L220: `export async function fetchBlob`
- L278: `export async function checkExists`
- L295: `export re-export API_URL`

### lib/api/dashboard.ts
- L9: `export const dashboardApi`

### lib/api/deliveries.ts
- L23: `export const deliveriesApi`

### lib/api/gmail.ts
- L7: `export interface GmailFetchLog`
- L21: `export interface GmailStatus`
- L39: `export interface GmailFetchResult`
- L48: `export interface GmailTestResult`
- L53: `export const gmailApi`

### lib/api/imports.ts
- L68: `export const importsApi`

### lib/api/index.ts
- L9: `export re-export dashboardApi`
- L12: `export re-export ordersApi`
- L22: `export re-export deliveriesApi`
- L56: `export re-export schucoApi`
- L59: `export re-export palletsApi`
- L62: `export re-export monthlyReportsApi`
- L65: `export re-export importsApi`
- L68: `export re-export gmailApi`
- L72: `export re-export usersApi`

### lib/api/monthly-reports.ts
- L9: `export const monthlyReportsApi`

### lib/api/orders.ts
- L32: `export type AggregatedReadinessStatus`
- L34: `export interface ReadinessResult`
- L45: `export interface ReadinessCheckResult`
- L57: `export type ReadinessSignal`
- L59: `export interface ChecklistItem`
- L67: `export const ordersApi`

### lib/api/pallets.ts
- L10: `export const palletsApi`

### lib/api/schuco.ts
- L8: `export const schucoApi`

### lib/api/settings.ts
- L26: `export interface DocumentAuthorMapping`
- L39: `export interface CreateDocumentAuthorMappingData`
- L44: `export interface UpdateDocumentAuthorMappingData`
- L50: `export const colorsApi`
- L67: `export const profilesApi`
- L84: `export const workingDaysApi`
- L108: `export const settingsApi`
- L138: `export const currencyConfigApi`
- L203: `export interface ProfileDepth`
- L212: `export const profileDepthsApi`
- L256: `export interface ProfilePalletConfig`
- L269: `export const profilePalletConfigApi`
- L291: `export const steelApi`

### lib/api/users.ts
- L8: `export interface User`
- L18: `export interface CreateUserData`
- L25: `export interface UpdateUserData`
- L34: `export const usersApi`

### lib/api/warehouse.ts
- L19: `export const warehouseApi`
- L37: `export const warehouseOrdersApi`
- L54: `export re-export remanentApi`

### lib/auth-token.ts
- L13: `export async function getAuthToken`
- L25: `export function getAuthTokenSync`
- L35: `export function setAuthToken`
- L45: `export function clearAuthToken`

### lib/date-utils.ts
- L27: `export const TIMEZONE`
- L38: `export function formatDateWarsaw`
- L46: `export function formatDateWarsawPolish`
- L54: `export function formatDateTimeWarsaw`
- L62: `export function formatDateTimeWarsawPolish`
- L71: `export function getTodayWarsaw`
- L78: `export function getStartOfDayWarsaw`
- L86: `export function getEndOfDayWarsaw`
- L95: `export function normalizeDateWarsaw`
- L103: `export function isSameDayWarsaw`
- L111: `export function parseDateWarsaw`
- L118: `export function getWeekNumberWarsaw`
- L126: `export function getStartOfWeekWarsaw`
- L134: `export function getEndOfWeekWarsaw`
- L142: `export function addDaysWarsaw`
- L149: `export function subDaysWarsaw`
- L156: `export function isPastWarsaw`
- L165: `export function isTodayWarsaw`
- L172: `export function isFutureWarsaw`
- L181: `export function dayjsWarsaw`
- L186: `export re-export dayjs`

### lib/design-tokens.ts
- L22: `export const COLORS`
- L78: `export const STATUS_COLORS`
- L129: `export const MODULE_COLORS`
- L183: `export const SPACING`
- L202: `export const TYPOGRAPHY`
- L224: `export const STATUS_CARD_STYLES`
- L235: `export const ORDER_STATUS_COLORS`
- L245: `export const DELIVERY_STATUS_COLORS`

### lib/dynamic-import.tsx
- L40: `export function createDynamicComponent`

### lib/error-logger.ts
- L6: `export interface ErrorContext`
- L13: `export type ErrorSeverity`
- L18: `export function logError`
- L49: `export function logApiError`
- L66: `export function logQueryError`
- L81: `export function logMutationError`
- L98: `export function logComponentError`
- L114: `export function logWebSocketError`
- L231: `export function getErrorLogs`
- L249: `export function clearErrorLogs`
- L260: `export function validateAndClearCorruptedCache`
- L284: `export function clearReactQueryCache`
- L298: `export function setupGlobalErrorHandler`

### lib/error-messages.ts
- L8: `export const ERROR_MESSAGES`
- L64: `export type ErrorCode`
- L89: `export interface ErrorDetails`
- L111: `export function getErrorMessage`
- L220: `export function getErrorAction`
- L268: `export function getErrorDetails`
- L291: `export function formatError`

### lib/logger.ts
- L88: `export const logger`
- L91: `export const wsLogger`
- L92: `export const apiLogger`
- L93: `export const dbLogger`
- L96: `export re-export Logger`

### lib/toast-extended.ts
- L16: `export interface PersistentToastOptions`
- L26: `export interface ProgressToastController`
- L37: `export interface ProgressToastOptions`
- L42: `export interface GroupedToastOptions`
- L74: `export function showPersistentToast`
- L141: `export function showProgressToast`
- L241: `export function showGroupedToast`

### lib/toast-helpers.ts
- L23: `export const showSuccessToast`
- L31: `export const showErrorToast`
- L39: `export const showInfoToast`
- L47: `export const showWarningToast`
- L59: `export const showRetryableErrorToast`
- L78: `export type ErrorCategory`
- L83: `export const categorizeError`
- L104: `export const showCategorizedErrorToast`
- L150: `export const getErrorMessage`
- L158: `export const showApiErrorToast`

### lib/toast-messages.ts
- L8: `export const TOAST_MESSAGES`
- L146: `export function getToastMessage`

### lib/toast-undo.ts
- L15: `export interface UndoToastOptions`
- L55: `export function showUndoToast`
- L136: `export function showUndoToastWithCountdown`

### lib/utils.ts
- L4: `export function cn`
- L8: `export function formatDate`
- L19: `export function formatCurrency`
- L29: `export function formatDateShort`
- L42: `export function formatDateWithWeekday`
- L57: `export function getWeekdayName`
- L68: `export function formatNumber`
- L78: `export function formatPercent`

---

## Frontend - Feature API

Lokalizacja: `apps/web/src/features/*/api/`

### features/admin/api/usersApi.ts
- L10: `export interface User`
- L22: `export interface CreateUserInput`
- L32: `export interface UpdateUserInput`
- L42: `export async function getAllUsers`
- L49: `export async function getUserById`
- L56: `export async function createUser`
- L66: `export async function updateUser`
- L76: `export async function deleteUser`

### features/akrobud-verification/api/verificationApi.ts
- L25: `export const verificationApi`

### features/attendance/api/attendanceApi.ts
- L12: `export const attendanceApi`

### features/auth/api/authApi.ts
- L12: `export async function loginApi`
- L32: `export async function logoutApi`
- L49: `export async function getCurrentUserApi`

### features/dashboard/api/dashboardApi.ts
- L8: `export interface WeekStats`
- L19: `export interface WeeklyStatsResponse`
- L23: `export const dashboardApi`

### features/dashboard/api/operatorDashboardApi.ts
- L13: `export interface CompletenessStats`
- L21: `export interface RecentActivity`
- L29: `export interface OperatorAlert`
- L38: `export interface OperatorDashboardUser`
- L44: `export interface OperatorDashboardResponse`
- L52: `export interface OperatorDashboardParams`
- L60: `export const operatorDashboardApi`

### features/deliveries/api/deliveriesApi.ts
- L16: `export const deliveriesApi`
- L160: `export interface ValidatedOrder`
- L177: `export interface ValidateOrdersResult`
- L184: `export interface BulkAssignResult`
- L200: `export interface DeliveryForDate`

### features/glass/api/glassDeliveriesApi.ts
- L15: `export const glassDeliveriesApi`
- L59: `export const glassValidationsApi`
- L76: `export const glassDeliveriesApi_extended`

### features/glass/api/glassOrdersApi.ts
- L9: `export const glassOrdersApi`

### features/help/api/helpApi.ts
- L7: `export const helpApi`

### features/imports/api/importsApi.ts
- L13: `export const importsApi`

### features/label-checks/api/labelChecksApi.ts
- L21: `export async function getLabelChecks`
- L43: `export async function getLabelCheck`
- L53: `export async function checkLabels`
- L64: `export async function deleteLabelCheck`
- L75: `export async function getLatestForDelivery`
- L85: `export function getExportUrl`
- L90: `export const labelChecksApi`

### features/logistics/api/index.ts
- L5: `export re-export logisticsApi`

### features/logistics/api/logisticsApi.ts
- L27: `export interface ParseEmailInput`
- L31: `export const logisticsApi`

### features/manager/api/managerApi.ts
- L12: `export const managerApi`

### features/moja-praca/api/mojaPracaApi.ts
- L21: `export const mojaPracaKeys`
- L104: `export function useConflicts`
- L113: `export function useConflictsCount`
- L122: `export function useConflictDetail`
- L131: `export function useResolveConflict`
- L145: `export function useBulkResolveConflicts`
- L159: `export function useUserOrders`
- L168: `export function useUserDeliveries`
- L177: `export function useUserGlassOrders`
- L186: `export function useDaySummary`
- L199: `export function useAlerts`
- L208: `export function useOrdersWithoutPrice`
- L216: `export function useLabelIssues`

### features/okuc/api/index.ts
- L15: `export re-export okucArticlesApi`
- L16: `export re-export okucStockApi`
- L17: `export re-export okucDemandApi`
- L18: `export re-export okucOrdersApi`
- L19: `export re-export okucProportionsApi`
- L20: `export re-export okucLocationsApi`
- L21: `export re-export okucReplacementsApi`

### features/okuc/api/okucArticlesApi.ts
- L24: `export const okucArticlesApi`

### features/okuc/api/okucDemandApi.ts
- L18: `export const okucDemandApi`

### features/okuc/api/okucLocationsApi.ts
- L12: `export const okucLocationsApi`

### features/okuc/api/okucOrdersApi.ts
- L20: `export const okucOrdersApi`

### features/okuc/api/okucProportionsApi.ts
- L16: `export const okucProportionsApi`

### features/okuc/api/okucReplacementsApi.ts
- L17: `export const okucReplacementsApi`

### features/okuc/api/okucStockApi.ts
- L24: `export const okucStockApi`

### features/orders/api/ordersApi.ts
- L16: `export const ordersApi`

### features/pallets/api/palletsApi.ts
- L5: `export re-export palletsApi`

### features/pallets/api/palletStockApi.ts
- L24: `export const palletDayApi`
- L69: `export const palletMonthApi`
- L87: `export const palletAlertConfigApi`
- L108: `export const palletInitialStockApi`
- L129: `export const palletStockApi`

### features/private-colors/api/privateColorsApi.ts
- L7: `export interface PrivateColor`
- L16: `export interface UpdatePrivateColorData`
- L23: `export async function getPrivateColors`
- L30: `export async function updatePrivateColor`
- L43: `export async function deletePrivateColor`

### features/production-planning/api/index.ts
- L8: `export interface EfficiencyConfig`
- L21: `export interface EfficiencyConfigInput`
- L31: `export interface ProfileWithPalletized`
- L38: `export interface ColorWithTypical`
- L47: `export async function getEfficiencyConfigs`
- L51: `export async function getEfficiencyConfig`
- L55: `export async function createEfficiencyConfig`
- L62: `export async function updateEfficiencyConfig`
- L69: `export async function deleteEfficiencyConfig`
- L77: `export async function getProfilesWithPalletized`
- L81: `export async function updateProfilePalletized`
- L88: `export async function bulkUpdateProfilePalletized`
- L97: `export async function getColorsWithTypical`
- L101: `export async function updateColorTypical`
- L108: `export async function bulkUpdateColorTypical`

### features/production-reports/api/productionReportsApi.ts
- L62: `export interface InvoiceAutoFillPreview`
- L76: `export interface InvoiceAutoFillResult`
- L247: `export const productionReportsApi`

### features/pvc-warehouse/api/pvcWarehouseApi.ts
- L15: `export interface GetStockParams`
- L21: `export interface GetDemandParams`
- L26: `export interface GetRwParams`
- L33: `export interface GetOrdersParams`
- L47: `export const pvcWarehouseApi`

### features/settings/api/colorsApi.ts
- L8: `export const colorsApi`

### features/settings/api/profilesApi.ts
- L8: `export const profilesApi`

### features/settings/api/settingsApi.ts
- L16: `export const settingsApi`
- L63: `export const workingDaysApi`

### features/timesheets/api/timesheetsApi.ts
- L35: `export const workersApi`
- L78: `export const positionsApi`
- L115: `export const taskTypesApi`
- L153: `export const specialWorkTypesApi`
- L191: `export const timeEntriesApi`
- L241: `export const bulkApi`
- L265: `export const calendarApi`
- L283: `export const timesheetsApi`

### features/warehouse/api/warehouseApi.ts
- L18: `export const warehouseApi`
- L58: `export const warehouseOrdersApi`

### features/warehouse/remanent/api/remanentApi.ts
- L11: `export const remanentApi`

### features/weather/api/weatherApi.ts
- L14: `export async function fetchWeatherForecast`
- L145: `export function getWeatherInfo`

---

## Frontend - Komponenty UI

Lokalizacja: `apps/web/src/components/ui/`

| Komponent | Plik | Opis |
|-----------|------|------|
| AlertDialog | `alert-dialog.tsx` | |
| Alert | `alert.tsx` | |
| BackButton | `back-button.tsx` | |
| Badge | `badge.tsx` | |
| Breadcrumb | `breadcrumb.tsx` | |
| Button | `button.tsx` | |
| Calendar | `calendar.tsx` | |
| Card | `card.tsx` | |
| Checkbox | `checkbox.tsx` | |
| Collapsible | `collapsible.tsx` | |
| ConfirmDialog | `confirm-dialog.tsx` | |
| ContextMenu | `context-menu.tsx` | |
| ContextualAlert | `contextual-alert.tsx` | |
| DestructiveActionDialog | `destructive-action-dialog.tsx` | |
| Dialog | `dialog.tsx` | |
| DropdownMenu | `dropdown-menu.tsx` | |
| EmptyState | `empty-state.tsx` | |
| ErrorUI | `error-ui.tsx` | |
| FolderBrowser | `folder-browser.tsx` | |
| FormField | `form-field.tsx` | |
| Input | `input.tsx` | |
| Label | `label.tsx` | |
| LoadingOverlay | `loading-overlay.tsx` | |
| MobileScrollHint | `mobile-scroll-hint.tsx` | |
| PeriodSelector | `period-selector.tsx` | |
| Popover | `popover.tsx` | |
| Progress | `progress.tsx` | |
| RadioGroup | `radio-group.tsx` | |
| ScrollArea | `scroll-area.tsx` | |
| SearchInput | `search-input.tsx` | |
| Select | `select.tsx` | |
| Separator | `separator.tsx` | |
| Sheet | `sheet.tsx` | |
| Skeleton | `skeleton.tsx` | |
| Slider | `slider.tsx` | |
| Switch | `switch.tsx` | |
| SyncIndicator | `sync-indicator.tsx` | |
| Table | `table.tsx` | |
| Tabs | `tabs.tsx` | |
| Textarea | `textarea.tsx` | |
| ToastProgress | `toast-progress.tsx` | |
| Toast | `toast.tsx` | |
| Toaster | `toaster.tsx` | |
| Tooltip | `tooltip.tsx` | |
| UseToast | `use-toast.ts` | |
| VariantTypeSelectionDialog | `variant-type-selection-dialog.tsx` | |

---

## Packages - Shared

Lokalizacja: `packages/shared/`

### src/constants.ts
- L2: `export const PROFILE_NUMBERS`
- L11: `export type ProfileNumber`
- L14: `export const TYPICAL_COLORS`
- L30: `export const ATYPICAL_COLORS`
- L40: `export const BEAM_LENGTH_MM`
- L43: `export const REST_ROUNDING_MM`
- L46: `export const ORDER_STATUS`
- L53: `export type OrderStatus`
- L56: `export const DELIVERY_STATUS`
- L64: `export type DeliveryStatus`
- L67: `export const FILE_IMPORT_TYPE`
- L74: `export type FileImportType`
- L77: `export const IMPORT_STATUS`
- L85: `export type ImportStatus`

### src/types/colors.ts
- L1: `export type ColorType`
- L3: `export interface Color`
- L13: `export interface CreateColorDto`
- L20: `export interface UpdateColorDto`
- L27: `export interface ProfileColor`

### src/types/deliveries.ts
- L3: `export interface Delivery`
- L16: `export interface CreateDeliveryDto`
- L21: `export interface UpdateDeliveryDto`
- L32: `export interface DeliveryOrder`
- L40: `export interface PalletType`
- L51: `export interface CreatePalletTypeDto`
- L60: `export interface PackingRule`
- L71: `export interface PalletOptimizationResult`
- L78: `export interface OptimizedPallet`
- L85: `export interface PalletItem`
- L96: `export interface DeliveryProtocol`
- L108: `export interface DeliveryProtocolOrder`

### src/types/orders.ts
- L3: `export interface Order`
- L17: `export interface CreateOrderDto`
- L26: `export interface UpdateOrderDto`
- L36: `export interface OrderRequirement`
- L47: `export interface CreateOrderRequirementDto`
- L57: `export interface OrderWindow`
- L68: `export interface CreateOrderWindowDto`
- L78: `export interface OrderRequirementTableRow`

### src/types/profiles.ts
- L1: `export interface Profile`
- L10: `export interface CreateProfileDto`
- L16: `export interface UpdateProfileDto`

### src/types/settings.ts
- L4: `export interface AppSettings`
- L26: `export interface FileImport`
- L39: `export interface CreateFileImportDto`
- L46: `export interface Note`
- L55: `export interface CreateNoteDto`
- L61: `export interface MonthlyReport`
- L74: `export interface MonthlyReportOrder`

### src/types/user-roles.ts
- L9: `export enum UserRole`
- L20: `export const ROLE_PERMISSIONS`
- L76: `export type Permission`
- L81: `export function hasPermission`
- L91: `export function canManageUsers`
- L98: `export function canAccessManagerPanel`
- L105: `export function canAccessReports`
- L112: `export function canAccessFinancial`

### src/types/warehouse.ts
- L2: `export interface WarehouseStock`
- L13: `export interface UpdateWarehouseStockDto`
- L20: `export interface WarehouseOrder`
- L32: `export interface CreateWarehouseOrderDto`
- L40: `export interface UpdateWarehouseOrderDto`
- L48: `export interface WarehouseHistory`
- L59: `export interface CreateWarehouseHistoryDto`
- L67: `export interface WarehouseTableRow`
- L81: `export interface MaterialShortageAlert`

### src/utils/money.ts
- L17: `export type Grosze`
- L18: `export type Centy`
- L19: `export type PLN`
- L20: `export type EUR`
- L28: `export function plnToGrosze`
- L47: `export function groszeToPln`
- L65: `export function eurToCenty`
- L84: `export function centyToEur`
- L103: `export function convertEurToPlnGrosze`
- L128: `export function convertPlnToEurCenty`
- L149: `export function formatGrosze`
- L163: `export function formatCenty`
- L178: `export function validateMonetaryValue`
- L204: `export function sumMonetary`

---
