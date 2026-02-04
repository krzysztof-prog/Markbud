/**
 * System agregacji statusów gotowości dostawy
 *
 * Eksportuje:
 * - DeliveryReadinessAggregator - główny serwis agregacji
 * - Typy i interfejsy
 * - Moduły sprawdzające (dla testów i rozszerzeń)
 */

export { DeliveryReadinessAggregator } from './DeliveryReadinessAggregator';

export type {
  ReadinessCheckStatus,
  ReadinessModuleName,
  ReadinessCheckResult,
  ReadinessCheckDetail,
  ReadinessCheckModule,
  AggregatedReadinessStatus,
  AggregatedReadinessResult,
  ReadinessChecklistItem,
} from './types';

export { MODULE_SEVERITY, MODULE_LABELS, BaseReadinessCheckModule } from './types';

// Eksport modułów dla testów
export {
  MailCompletenessCheck,
  LabelCheckModule,
  GlassDeliveryCheck,
  OkucDeliveryCheck,
  PalletValidationCheck,
  OrdersCompletedCheck,
} from './modules';
