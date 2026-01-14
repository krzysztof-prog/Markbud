/**
 * Akrobud Verification - Public API
 *
 * Export serwisów i typów dla weryfikacji list dostaw Akrobud
 */

// Główny serwis
export {
  AkrobudVerificationService,
  type VerificationItemInput,
  type ParsedOrderNumber,
  type VerificationResult,
} from './AkrobudVerificationService.js';

// Typy z serwisu (re-eksport dla kompatybilności wstecznej)
export type {
  MatchedItem,
  MissingItem,
  ExcessItem,
  NotFoundItem,
  DuplicateItem,
  ApplyChangesResult,
} from './AkrobudVerificationService.js';

// Utilities - eksport dla zaawansowanych przypadków użycia
export {
  OrderNumberMatcher,
  type OrderMatchResult,
  type MatchStatus,
} from './utils/OrderNumberMatcher.js';

export {
  VerificationListComparator,
  type VerificationListItem,
  type DeliveryOrderItem,
  type ComparisonResult,
} from './utils/VerificationListComparator.js';

export {
  VerificationChangeApplier,
  type ChangeResult,
  type ApplyChangesOptions,
  type ChangeRecord,
} from './utils/VerificationChangeApplier.js';
