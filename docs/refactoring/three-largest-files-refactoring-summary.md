# Three Largest Files - Refactoring Summary

## Overview

This document summarizes the refactoring plans for the three largest files in the AKROBUD project:

1. **apps/api/src/services/importService.ts** (1350 lines)
2. **apps/web/src/app/dostawy/DostawyPageContent.tsx** (1937 lines)
3. **apps/api/src/services/deliveryService.ts** (682 lines)

Combined, these three files represent **3969 lines of code** with multiple responsibilities and high complexity. Refactoring them will significantly improve code quality, testability, and maintainability.

---

## Quick Comparison

| File | Current Lines | Target Lines | Modules Created | Effort (Days) | Priority | Risk |
|------|---------------|--------------|-----------------|---------------|----------|------|
| **importService.ts** | 1350 | ~200 (main) | 10 modules | 5-7 | HIGH | HIGH |
| **DostawyPageContent.tsx** | 1937 | ~200 (main) | 15+ modules | 5-7 | HIGH | MEDIUM |
| **deliveryService.ts** | 682 | ~200 (main) | 6 modules | 3-4 | MEDIUM | LOW |
| **TOTAL** | **3969** | **~600** | **31 modules** | **13-18** | - | - |

---

## Common Problems Across All Files

### 1. Single Responsibility Principle Violations
All three files handle multiple distinct responsibilities:
- **importService**: File management, imports, folders, variants, settings, locking
- **DostawyPageContent**: State, data, UI, dialogs, drag-drop, stats
- **deliveryService**: CRUD, associations, analytics, calendar, batch ops

### 2. Large Method Complexity
Complex methods exceeding 100 lines:
- `importService.performFolderImport()` - 170 lines
- `importService.importFromFolder()` - 210 lines
- `DostawyPageContent.render()` - 1400+ lines of JSX
- `deliveryService.getMonthlyProfileStats()` - 60 lines

### 3. Insufficient Test Coverage
- importService: ~15%
- DostawyPageContent: ~5%
- deliveryService: ~30%
- **Target**: 85%+ for all

### 4. Hard to Maintain & Extend
Adding new features requires:
- Understanding entire 700-2000 line file
- Risk of breaking unrelated features
- Long code review time
- Frequent merge conflicts

---

## Refactoring Strategy

### Common Pattern

All three refactorings follow the same pattern:

```
Monolithic File (700-2000 lines)
    ↓
Split into focused modules
    ↓
Main Orchestrator (<250 lines)
  + Specialized Services/Components (~100-250 lines each)
  + Utility Helpers (~50-150 lines each)
```

### Phased Approach

Each refactoring is broken into phases:
1. **Extract utilities** (low risk, high value)
2. **Extract specialized services** (medium risk)
3. **Simplify main service/component** (low risk if previous phases done)
4. **Integration testing** (validate all pieces work)
5. **Documentation** (capture new structure)

---

## Detailed Plans

### 1. ImportService Refactoring

**Full Plan**: [importService-refactor-plan.md](./importService-refactor-plan.md)

**Modules Created** (10):
- `ImportService.ts` - Orchestrator (200 lines)
- `FileUploadService.ts` - File uploads (150 lines)
- `FolderImportService.ts` - Folder operations (250 lines)
- `ImportProcessingService.ts` - Import workflow (200 lines)
- `PendingOrderPriceService.ts` - Pending prices (100 lines)
- `ImportSettingsService.ts` - Settings (80 lines)
- `FileSystemHelper.ts` - FS abstraction (150 lines)
- `FolderScanner.ts` - Recursive scan (120 lines)
- `DateExtractor.ts` - Date parsing (60 lines)
- `PathValidator.ts` - Path security (80 lines)

**Key Benefits**:
- File system abstraction (easier to test, can swap for S3)
- Variant resolution logic separated
- Transaction boundaries explicit
- Lock handling isolated

**Timeline**: 3 weeks (15-21 days)

**Phases**:
1. Extract utilities (2 days) - LOW RISK
2. Extract settings (1 day) - LOW RISK
3. Extract file upload (2 days) - MEDIUM RISK
4. Extract processing (3 days) - HIGH RISK
5. Extract folder import (2 days) - HIGH RISK
6. Simplify main (1 day) - LOW RISK
7. Integration tests (2 days) - MEDIUM RISK
8. Documentation (2 days) - LOW RISK

---

### 2. DostawyPageContent Refactoring

**Full Plan**: [dostawyPageContent-refactor-plan.md](./dostawyPageContent-refactor-plan.md)

**Modules Created** (15+):

**Hooks**:
- `useDeliveryCalendar.ts` - Calendar state (150 lines)
- `useDeliveryDragDrop.ts` - Drag & drop (120 lines)
- `useDeliveryMutations.ts` - Mutations (200 lines)
- `useCalendarData.ts` - Data fetching (100 lines)
- `useDateCalculations.ts` - Date helpers (150 lines)
- `useDeliveryDialogs.ts` - Dialog state (100 lines)
- `useDeliveryStats.ts` - Statistics (100 lines)

**Components**:
- `DostawyPageContent.tsx` - Container (200 lines)
- `DeliveryCalendar.tsx` - Calendar orchestrator (150 lines)
- `CalendarGrid.tsx` - Grid layout (100 lines)
- `DayCell.tsx` - Single day (120 lines)
- `WeekSummary.tsx` - Week stats (60 lines)
- `UnassignedOrdersPanel.tsx` - Right panel (100 lines)
- 5+ Dialog components (50-150 lines each)

**Key Benefits**:
- Testable hooks (can test logic without UI)
- Reusable components (Storybook)
- Better performance (targeted re-renders)
- Easier to add features

**Timeline**: 3 weeks (15-21 days)

**Phases**:
1. Extract hooks (3 days) - LOW RISK
2. Extract dialog management (1 day) - LOW RISK
3. Extract drag & drop (1 day) - MEDIUM RISK
4. Extract calendar components (3 days) - MEDIUM RISK
5. Extract dialog components (2 days) - LOW RISK
6. Assemble container (1 day) - MEDIUM RISK
7. Testing & optimization (2 days) - LOW RISK
8. Documentation (2 days) - LOW RISK

---

### 3. DeliveryService Refactoring

**Full Plan**: [deliveryService-refactor-plan.md](./deliveryService-refactor-plan.md)

**Modules Created** (6):
- `DeliveryService.ts` - CRUD + orchestration (200 lines)
- `DeliveryOrderService.ts` - Order associations (180 lines)
- `DeliveryCalendarService.ts` - Calendar data (150 lines)
- `DeliveryStatisticsService.ts` - Analytics (250 lines)
- `DeliveryNumberGenerator.ts` - Number generation (80 lines)
- `DeliveryEventEmitter.ts` - Event handling (60 lines)

**Key Benefits**:
- Statistics isolated (easier to optimize)
- Calendar data aggregation separated
- Event emission centralized
- Clear CRUD boundaries

**Timeline**: 1 week (3-4 days)

**Phases**:
1. Extract event emitter (4 hours) - LOW RISK
2. Extract number generator (4 hours) - LOW RISK
3. Extract statistics (1 day) - MEDIUM RISK
4. Extract calendar service (4 hours) - LOW RISK
5. Extract order service (4 hours) - MEDIUM RISK
6. Simplify main (4 hours) - LOW RISK
7. Integration testing (4 hours) - LOW RISK

---

## Recommended Order

### Option A: Sequential (Lower Risk)
Tackle one file at a time, complete all phases before moving to next:

1. **Week 1-2**: deliveryService (lower risk, faster)
2. **Week 3-5**: importService (highest complexity)
3. **Week 6-8**: DostawyPageContent (frontend)

**Benefits**: Lower risk, can learn from first refactoring
**Drawbacks**: Longer total time, no parallel work

### Option B: Parallel (Faster, Higher Risk)
Work on multiple files simultaneously:

1. **Week 1**: Extract utilities from all three
2. **Week 2**: Extract specialized services/hooks
3. **Week 3**: Simplify main files
4. **Week 4**: Integration testing all three

**Benefits**: Faster completion, parallel work
**Drawbacks**: Higher risk, coordination needed

### Option C: Hybrid (Recommended)
Start with deliveryService, then parallelize:

1. **Week 1**: deliveryService (complete) - builds confidence
2. **Week 2-3**: importService + DostawyPageContent utilities (parallel)
3. **Week 4-5**: importService + DostawyPageContent specialized modules (parallel)
4. **Week 6**: Integration testing + documentation

**Benefits**: Balanced risk/speed, learns from first refactoring
**Drawbacks**: Requires 2 developers for parallel phases

---

## Risk Mitigation

### High Risk Areas

1. **ImportService variant resolution** (Phase 4)
   - Mitigation: Extensive tests, keep old code commented
   - Contingency: Rollback plan ready

2. **ImportService folder import locking** (Phase 5)
   - Mitigation: Transaction boundaries, error handling
   - Contingency: Add retry logic

3. **DostawyPageContent drag & drop** (Phase 3)
   - Mitigation: Test all drag scenarios
   - Contingency: Feature flag for new implementation

### Medium Risk Areas

1. **Statistics calculations** (all files)
   - Mitigation: Compare old vs new results in tests
   - Contingency: Keep old calculations for comparison

2. **Dialog state coordination** (DostawyPageContent)
   - Mitigation: Centralized hook, clear API
   - Contingency: Gradual migration dialog by dialog

### Low Risk Areas

1. Utility extraction
2. Settings services
3. Event emitters
4. Number generators

---

## Success Metrics

### Code Quality

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg lines/file | 1323 | <250 | 81% reduction |
| Test coverage | 17% | 85%+ | 5x increase |
| Cyclomatic complexity | 15+ | <10 | 33% reduction |
| Files >500 lines | 3 | 0 | 100% reduction |

### Performance

- No regression in bundle size
- Improved re-render performance (DostawyPageContent)
- Better query batching (deliveryService)

### Maintainability

- Time to understand module: <30 min (vs 2+ hours)
- Time to add feature: <1 day (vs 3+ days)
- Code review time: <2 hours (vs 5+ hours)

---

## Testing Requirements

### Coverage Targets

| File/Module | Current | Target |
|-------------|---------|--------|
| importService | 15% | 85% |
| DostawyPageContent | 5% | 85% |
| deliveryService | 30% | 85% |
| New utilities | 0% | 95% |
| New hooks | 0% | 90% |

### Test Types

**Unit Tests**: 85%+ coverage
- All hooks
- All services
- All utilities
- Complex calculations

**Integration Tests**: Critical flows
- Full import workflow
- Full delivery lifecycle
- Calendar data fetching
- Drag & drop scenarios

**E2E Tests**: User workflows
- Upload → Approve → Order created
- Folder import → Delivery created
- Drag order → Delivery updated

---

## Documentation Deliverables

For each refactoring:

1. **Architecture diagram** - New module structure
2. **API documentation** - Public methods
3. **Migration guide** - How to use new services
4. **Test strategy** - What to test
5. **Storybook stories** (DostawyPageContent only)

---

## Next Steps

1. **Review plans** with team
2. **Choose approach** (Sequential, Parallel, or Hybrid)
3. **Assign resources** (1-2 developers)
4. **Create feature branches**:
   - `refactor/import-service`
   - `refactor/delivery-service`
   - `refactor/dostawy-page`
5. **Start with Phase 1** of chosen approach
6. **Daily standups** to track progress

---

## Conclusion

These three refactorings represent a significant investment (~13-18 days) but will dramatically improve code quality:

- **3969 lines → ~600 lines** in main files (85% reduction)
- **3 monolithic files → 31 focused modules**
- **17% → 85%+ test coverage** (5x improvement)
- **Easier to maintain, test, and extend**

The recommended **Hybrid approach** balances risk and speed, completing the work in approximately **6 weeks**.

---

## References

- [importService-refactor-plan.md](./importService-refactor-plan.md)
- [deliveryService-refactor-plan.md](./deliveryService-refactor-plan.md)
- [dostawyPageContent-refactor-plan.md](./dostawyPageContent-refactor-plan.md)
- [CLAUDE.md](../../CLAUDE.md) - Project guidelines
- [backend-dev-guidelines](../../.claude/skills/backend-dev-guidelines.md)
- [frontend-dev-guidelines](../../.claude/skills/frontend-dev-guidelines.md)
