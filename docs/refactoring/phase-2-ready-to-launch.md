# Phase 2 - Ready to Launch
**Created:** 2025-12-30 17:40
**Status:** PREPARED - Waiting for Phase 1 completion

---

## 🚀 Quick Start - Phase 2

Po zakończeniu Fazy 1, uruchom natychmiast te 5 agentów równolegle:

```bash
# Agent 1: importService.ts Phase 2 (Medium Risk)
Task: code-refactor-master
Description: "Implement importService Phase 2"
Priority: HIGH

# Agent 2: importService.ts Phase 3 (High Risk - Parsers)
Task: code-refactor-master
Description: "Implement importService Phase 3"
Priority: HIGH

# Agent 3: deliveryService.ts Phase 2 & 3
Task: code-refactor-master
Description: "Implement deliveryService optimization"
Priority: MEDIUM

# Agent 4: DostawyPageContent.tsx Component Splitting
Task: code-refactor-master
Description: "Split DostawyPageContent components"
Priority: HIGH

# Agent 5: Repository Tests
Task: code-refactor-master / TDD
Description: "Write repository tests"
Priority: HIGH
```

---

## 📋 Phase 2 Overview

### Cel
Implementacja średnio i wysoko-ryzykownych refaktoryzacji:
- Wyodrębnienie parsersów (CSV, PDF, Excel)
- Wyodrębnienie algorytmów optymalizacji
- Rozbicie dużych komponentów React
- Zwiększenie pokrycia testami

### Czas trwania
2-3 dni robocze

### Agenci
5 agentów równolegle (podobnie jak Faza 1)

---

## 🎯 Zadania Phase 2

### Backend - HIGH PRIORITY

#### 1. importService.ts Phase 2 (Agent 1)
**Moduły do wyodrębnienia:**

```typescript
// services/import/importValidationService.ts
export class ImportValidationService {
  validateFile(file: File): ValidationResult
  checkConflicts(data: ImportData): ConflictResult
  validateBusinessRules(data: ImportData): RuleResult
}

// services/import/importTransactionService.ts
export class ImportTransactionService {
  executeImport(data: ImportData): Promise<Result>
  rollback(transactionId: string): Promise<void>
  handleError(error: Error): void
}

// services/import/importConflictService.ts
export class ImportConflictService {
  detectVariantConflicts(orders: Order[]): Conflict[]
  resolveConflict(conflict: Conflict, decision: Decision): Resolution
  mergeVariants(variants: Variant[]): Variant
}
```

**Kryteria sukcesu:**
- [ ] 3 nowe serwisy utworzone
- [ ] importService.ts zmniejszony o ~400 linii
- [ ] Wszystkie testy przechodzą
- [ ] Transakcje działają poprawnie

---

#### 2. importService.ts Phase 3 (Agent 2)
**Moduły do wyodrębnienia:**

```typescript
// services/import/csvImportService.ts
export class CsvImportService {
  parse(file: Buffer): Promise<ParsedData>
  transform(data: RawData): ImportData
  validate(data: ImportData): ValidationResult
}

// services/import/pdfImportService.ts
export class PdfImportService {
  extractText(file: Buffer): Promise<string>
  parseDeliveryNote(text: string): DeliveryData
  extractTables(text: string): TableData[]
}

// services/import/excelImportService.ts
export class ExcelImportService {
  readWorkbook(file: Buffer): Workbook
  parseSheet(sheet: Sheet): ImportData
  validateColumns(sheet: Sheet): boolean
}
```

**Kryteria sukcesu:**
- [ ] 3 parser serwisy utworzone
- [ ] importService.ts < 300 linii (orchestrator)
- [ ] Import CSV/PDF/Excel działa bez regresji
- [ ] Real data testing passed

**⚠️ HIGH RISK** - Wymaga szczególnej uwagi i testowania

---

#### 3. deliveryService.ts Phase 2 & 3 (Agent 3)
**Moduły do wyodrębnienia:**

```typescript
// services/delivery/deliveryOptimizationService.ts
export class DeliveryOptimizationService {
  optimizePallets(windows: Window[]): PalletLayout[]
  calculateDimensions(items: Item[]): Dimensions
  findBestFit(items: Item[], constraints: Constraints): Layout
}

// services/delivery/deliveryNotificationService.ts
export class DeliveryNotificationService {
  sendEmail(delivery: Delivery, type: NotificationType): Promise<void>
  emitWebSocketEvent(delivery: Delivery, event: EventType): void
  notifyStatusChange(delivery: Delivery, oldStatus: Status, newStatus: Status): void
}

// Integration - deliveryService.ts becomes orchestrator
export class DeliveryService {
  constructor(
    private optimization: DeliveryOptimizationService,
    private notification: DeliveryNotificationService,
    private calendar: DeliveryCalendarService,
    private statistics: DeliveryStatisticsService,
    private protocol: DeliveryProtocolService
  ) {}

  async createDelivery(data: CreateDeliveryInput): Promise<Delivery> {
    // Orchestrate all services
  }
}
```

**Kryteria sukcesu:**
- [ ] deliveryService.ts < 200 linii
- [ ] 6 wyspecjalizowanych serwisów
- [ ] Algorytmy pakowania bez regresji
- [ ] WebSocket events działają
- [ ] Email notifications działają

---

### Frontend - HIGH PRIORITY

#### 4. DostawyPageContent.tsx Splitting (Agent 4)

**Phase 2A: Component Extraction**

```typescript
// components/DeliveriesListView.tsx (~400 lines)
export function DeliveriesListView({
  deliveries,
  onEdit,
  onDelete,
  onSort,
  filters
}: DeliveriesListViewProps) {
  // TanStack Table implementation
}

// components/DeliveryFilters.tsx (~300 lines)
export function DeliveryFilters({
  onFilterChange,
  initialFilters
}: DeliveryFiltersProps) {
  // Filters UI + logic
}

// components/DeliveryActions.tsx (~200 lines)
export function DeliveryActions({
  selectedIds,
  onBulkDelete,
  onBulkArchive,
  onExport
}: DeliveryActionsProps) {
  // Bulk actions
}

// components/DeliveryStats.tsx (~200 lines)
export function DeliveryStats({
  deliveries,
  dateRange
}: DeliveryStatsProps) {
  // Statistics + Charts
}

// components/DeliveryCalendar.tsx (~300 lines)
export function DeliveryCalendar({
  deliveries,
  onDateChange,
  onDragDrop
}: DeliveryCalendarProps) {
  // Calendar view
}

// components/DeliveryDialogs.tsx (~200 lines)
export function DeliveryDialogs({
  open,
  type,
  delivery,
  onClose,
  onSubmit
}: DeliveryDialogsProps) {
  // Create/Edit/Delete modals
}
```

**Phase 2B: Container Refactoring**

```typescript
// DostawyPageContent.tsx (~200 lines - orchestrator)
export default function DostawyPageContent() {
  // Custom hooks (już wyodrębnione w Phase 1)
  const filters = useDeliveryFilters();
  const stats = useDeliveryStats(deliveries);
  const actions = useDeliveryActions(deliveries);
  const selection = useDeliverySelection();
  const exportHandlers = useDeliveryExport();

  return (
    <div className="deliveries-page">
      <DeliveryFilters {...filters} />
      <DeliveryStats {...stats} />
      <DeliveryActions {...actions} {...selection} {...exportHandlers} />
      <DeliveriesListView
        deliveries={filteredDeliveries}
        {...selection}
        {...actions}
      />
      <DeliveryCalendar deliveries={filteredDeliveries} />
      <DeliveryDialogs {...dialogState} />
    </div>
  );
}
```

**Kryteria sukcesu:**
- [ ] DostawyPageContent.tsx < 200 linii
- [ ] 6 nowych komponentów w `components/`
- [ ] Wszystkie hooki w `hooks/` (z Phase 1)
- [ ] UI identyczne (pixel-perfect)
- [ ] Performance bez regresji
- [ ] TypeScript errors: 0

---

### Testing - HIGH PRIORITY

#### 5. Repository Tests (Agent 5)

**OrderRepository.test.ts**
```typescript
describe('OrderRepository', () => {
  describe('findById', () => {
    it('should return order when exists', async () => {});
    it('should return null when not exists', async () => {});
    it('should include relations when specified', async () => {});
  });

  describe('create', () => {
    it('should create order with valid data', async () => {});
    it('should throw on duplicate order number', async () => {});
    it('should create with nested relations', async () => {});
  });

  describe('complex queries', () => {
    it('should filter by multiple criteria', async () => {});
    it('should paginate correctly', async () => {});
    it('should sort by multiple fields', async () => {});
  });
});
```

**DeliveryRepository.test.ts**
```typescript
describe('DeliveryRepository', () => {
  describe('calendar queries', () => {
    it('should find deliveries in date range', async () => {});
    it('should handle timezone correctly', async () => {});
    it('should filter by status and date', async () => {});
  });

  describe('statistics', () => {
    it('should calculate total deliveries', async () => {});
    it('should group by status', async () => {});
    it('should aggregate metrics', async () => {});
  });
});
```

**WarehouseRepository.test.ts**
```typescript
describe('WarehouseRepository', () => {
  describe('optimistic locking', () => {
    it('should update with correct version', async () => {});
    it('should throw on version mismatch', async () => {});
    it('should retry on conflict', async () => {});
  });

  describe('stock updates', () => {
    it('should update stock atomically', async () => {});
    it('should track history', async () => {});
    it('should handle concurrent updates', async () => {});
  });
});
```

**Target coverage:** 80%+

---

## 🎯 Success Metrics - Phase 2

### Code Quality
- [ ] importService.ts: 1350 → 250 lines (-81%)
- [ ] deliveryService.ts: 682 → 200 lines (-71%)
- [ ] DostawyPageContent.tsx: 1937 → 200 lines (-90%)
- [ ] Nowe moduły: 3 → 25+ (+733%)
- [ ] Średnia wielkość modułu: 1323 → 150 lines (-89%)

### Test Coverage
- [ ] Repository coverage: 0% → 80% (+80%)
- [ ] Service coverage: 24% → 60% (+36%)
- [ ] Overall backend: 15% → 50% (+35%)

### Stability
- [ ] All tests passing: ✅
- [ ] Zero regressions: ✅
- [ ] Zero breaking changes: ✅
- [ ] Performance maintained: ✅

---

## ⚠️ Risk Mitigation

### Critical Risks - Phase 2

1. **Parser Refactoring (HIGH RISK)**
   - CSV, PDF, Excel parsers są core functionality
   - Błąd = broken imports dla użytkowników
   - **Mitigation:**
     - Feature flag: `ENABLE_NEW_PARSERS=true/false`
     - Real data testing (100+ actual files)
     - Manual QA before rollout
     - Rollback plan ready
     - Parallel implementation (old + new)

2. **Optimization Algorithm (MEDIUM RISK)**
   - Pakowanie palet to złożona logika
   - Błąd = źle zapakowane dostawy
   - **Mitigation:**
     - Unit tests dla edge cases
     - Regression tests z historical data
     - Visual comparison old vs new
     - A/B testing in production

3. **Component Splitting (MEDIUM RISK)**
   - UI może się zepsuć
   - Interakcje mogą nie działać
   - **Mitigation:**
     - Visual regression testing
     - E2E tests critical flows
     - Screenshot comparison
     - Gradual rollout

---

## 🚀 Launch Commands - Phase 2

### Moment rozpoczęcia
**Trigger:** Gdy wszystkie 5 agentów z Fazy 1 zakończą pracę i zmiany zostaną zweryfikowane.

### Agent Launch Sequence

```typescript
// Launch all 5 agents in parallel

Agent1 = Task(
  subagent_type: "code-refactor-master",
  description: "importService Phase 2 - validation, transactions, conflicts",
  prompt: `
    Implement Phase 2 of importService.ts refactoring according to plan:
    docs/refactoring/importService-refactor-plan.md

    Extract these modules:
    1. importValidationService.ts
    2. importTransactionService.ts
    3. importConflictService.ts

    Update importService.ts to use new modules.
    Run tests and fix any issues.
  `,
  run_in_background: true
);

Agent2 = Task(
  subagent_type: "code-refactor-master",
  description: "importService Phase 3 - CSV, PDF, Excel parsers",
  prompt: `
    Implement Phase 3 of importService.ts refactoring.

    Extract parsers:
    1. csvImportService.ts
    2. pdfImportService.ts
    3. excelImportService.ts

    ⚠️ HIGH RISK - Test thoroughly with real data.
    Add feature flag for gradual rollout.
  `,
  run_in_background: true
);

Agent3 = Task(
  subagent_type: "code-refactor-master",
  description: "deliveryService optimization & notifications",
  prompt: `
    Complete deliveryService.ts refactoring Phase 2 & 3.

    Extract:
    1. deliveryOptimizationService.ts
    2. deliveryNotificationService.ts
    3. Update deliveryService.ts to orchestrator pattern

    Verify pallet optimization algorithm correctness.
  `,
  run_in_background: true
);

Agent4 = Task(
  subagent_type: "code-refactor-master",
  description: "DostawyPageContent component splitting",
  prompt: `
    Split DostawyPageContent.tsx into components according to plan:
    docs/refactoring/dostawyPageContent-refactor-plan.md

    Create:
    1. DeliveriesListView.tsx
    2. DeliveryFilters.tsx
    3. DeliveryActions.tsx
    4. DeliveryStats.tsx
    5. DeliveryCalendar.tsx
    6. DeliveryDialogs.tsx

    Container stays < 200 lines.
    Use hooks from Phase 1.
  `,
  run_in_background: true
);

Agent5 = Task(
  subagent_type: "code-refactor-master",
  description: "Repository tests - Order, Delivery, Warehouse",
  prompt: `
    Write comprehensive tests for repositories:

    1. OrderRepository.test.ts
    2. DeliveryRepository.test.ts
    3. WarehouseRepository.test.ts

    Target: 80% coverage
    Focus: CRUD, complex queries, edge cases
  `,
  run_in_background: true
);
```

---

## 📊 Timeline - Phase 2

### Dzień 1 (Medium Risk Backend)
- Agent 1: importService Phase 2 ✓
- Agent 3: deliveryService Phase 2 ✓
- Agent 5: Repository tests (start) ✓

**Expected output:** ~1000 lines refactored, validation/transactions extracted

### Dzień 2 (High Risk Backend + Frontend)
- Agent 2: importService Phase 3 ✓
- Agent 3: deliveryService Phase 3 (finish) ✓
- Agent 4: DostawyPageContent splitting (start) ✓
- Agent 5: Repository tests (continue) ✓

**Expected output:** Parsers extracted, components split begins

### Dzień 3 (Frontend + Testing)
- Agent 4: DostawyPageContent splitting (finish) ✓
- Agent 5: Repository tests (finish) ✓
- Service tests for new modules ✓
- Integration testing ✓

**Expected output:** All refactoring complete, tests passing

---

## ✅ Phase 2 Checklist

### Pre-Launch
- [ ] Phase 1 complete and verified
- [ ] All Phase 1 tests passing
- [ ] Phase 2 plan reviewed and approved
- [ ] backend-dev-guidelines skill loaded
- [ ] frontend-dev-guidelines skill loaded (if available)

### During Execution
- [ ] Monitor agent progress every 30 min
- [ ] Review outputs as they complete
- [ ] Run tests after each agent
- [ ] Fix issues immediately

### Post-Completion
- [ ] All agents completed successfully
- [ ] Full test suite passing
- [ ] No regressions detected
- [ ] Code review done
- [ ] Documentation updated
- [ ] Atomic git commits
- [ ] Phase 2 completion report

---

**Document created:** 2025-12-30 17:40
**Status:** READY TO LAUNCH
**Waiting for:** Phase 1 completion + verification
**Estimated start:** Today, ~18:00-19:00
**Estimated completion:** 2-3 days
