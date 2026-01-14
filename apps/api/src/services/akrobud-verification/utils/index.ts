/**
 * Akrobud Verification Utilities - Public API
 *
 * Eksportuje narzędzia pomocnicze dla weryfikacji list dostaw
 */

export {
  OrderNumberMatcher,
  type OrderMatchResult,
  type ParsedOrderNumber,
  type MatchStatus,
} from './OrderNumberMatcher.js';

export {
  VerificationListComparator,
  type MatchedItem,
  type MissingItem,
  type ExcessItem,
  type NotFoundItem,
  type DuplicateItem,
  type VerificationListItem,
  type DeliveryOrderItem,
  type ComparisonResult,
} from './VerificationListComparator.js';

export {
  VerificationChangeApplier,
  type ChangeResult,
  type ApplyChangesResult,
  type ApplyChangesOptions,
  type ChangeRecord,
} from './VerificationChangeApplier.js';
