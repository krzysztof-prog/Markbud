# Comprehensive Refactoring Plan - AKROBUD Project
**Date:** 2025-12-30
**Agent:** code-refactor-master
**Status:** In Progress

---

## Executive Summary

### Critical Issues Identified

1. **Large Files (Unmaintainable)**
   - `DostawyPageContent.tsx` - 1937 lines
   - `importService.ts` - 1350 lines
   - **Impact:** HIGH - Code review impossible, bug-prone

2. **Duplicate Warehouse Services**
   - `warehouseService.ts` vs `warehouse-service.ts`
   - `warehouse.old.ts` (dead code)
   - **Impact:** HIGH - Confusion, inconsistent behavior

3. **Error Handling Anti-Patterns**
   - 24 handlers with try-catch blocks
   - Violates `docs/guides/anti-patterns.md`
   - **Impact:** MEDIUM - Should delegate to middleware

4. **Low Test Coverage**
   - Repositories: 0%
   - Services: 24%
   - **Impact:** HIGH - Stability risk

5. **Inconsistent Feature Modules**
   - `orders`, `settings` modules incomplete
   - Missing `components/` and `hooks/` directories
   - **Impact:** MEDIUM - Code organization

---

## Detailed Analysis

### Backend (apps/api/src/)

#### Routes
- **Total:** 20+ route files
- **Issues:**
  - `warehouse.old.ts` - Dead code, must remove
  - Duplicate routes for warehouse module

#### Handlers
- **Total:** ~15 handler files
- **Issues:**
  - 24 handlers with explicit try-catch (should use middleware)
  - Examples: `deliveryHandler.ts`, `orderHandler.ts`, `glassOrderHandler.ts`

#### Services
- **Large Files:**
  - `importService.ts` (1350 lines) - CRITICAL
  - `deliveryService.ts` (800+ lines)
  - `orderService.ts` (700+ lines)
- **Duplicates:**
  - `warehouseService.ts` vs `warehouse-service.ts`

#### Repositories
- **Test Coverage:** 0%
- **Risk:** Database operations untested

### Frontend (apps/web/src/)

#### Large Components
- `DostawyPageContent.tsx` (1937 lines) - CRITICAL
  - Should be split into:
    - `DeliveriesListView.tsx`
    - `DeliveryFilters.tsx`
    - `DeliveryActions.tsx`
    - `DeliveryStats.tsx`

#### Feature Modules Organization
```
Incomplete:
├── orders/ (missing components/, hooks/)
├── settings/ (missing components/, hooks/)

Complete:
├── deliveries/ ✓
├── glass/ ✓
├── warehouse/ (partial)
```

---

## Refactoring Plan (4 Weeks)

### Week 1: Cleanup & Error Handling
**Priority:** HIGH
**Goal:** Remove technical debt, fix anti-patterns

#### Tasks:
1. **Remove Dead Code** (Day 1)
   - [ ] Delete `apps/api/src/routes/warehouse.old.ts`
   - [ ] Remove unused imports
   - [ ] Clean up commented code

2. **Consolidate Warehouse Services** (Day 2)
   - [ ] Analyze differences between `warehouseService.ts` and `warehouse-service.ts`
   - [ ] Merge into single `warehouse-service.ts`
   - [ ] Update all imports
   - [ ] Run tests

3. **Fix Error Handling** (Day 3-5)
   - [ ] Remove try-catch from handlers (delegate to middleware)
   - [ ] Ensure all errors use custom error classes
   - [ ] Update error messages to Polish
   - [ ] Files to fix:
     - `deliveryHandler.ts`
     - `orderHandler.ts`
     - `glassOrderHandler.ts`
     - `glassDeliveryHandler.ts`
     - `profileHandler.ts`
     - `schucoHandler.ts`

**Estimated Impact:** Medium risk, high reward

---

### Week 2: Backend Service Refactoring
**Priority:** HIGH
**Goal:** Break down large services

#### Tasks:
1. **Split `importService.ts` (1350 lines)** (Day 1-3)
   ```
   Split into:
   ├── services/import/
   │   ├── importService.ts (orchestrator - 200 lines)
   │   ├── csvImportService.ts (CSV logic - 300 lines)
   │   ├── pdfImportService.ts (PDF logic - 300 lines)
   │   ├── excelImportService.ts (Excel logic - 300 lines)
   │   └── importValidationService.ts (validation - 250 lines)
   ```

2. **Refactor `deliveryService.ts` (800+ lines)** (Day 4-5)
   ```
   Split into:
   ├── services/delivery/
   │   ├── deliveryService.ts (main - 300 lines)
   │   ├── deliveryOptimizationService.ts (pallet optimization - 300 lines)
   │   └── deliverySchedulingService.ts (scheduling - 200 lines)
   ```

**Estimated Impact:** High risk, high reward

---

### Week 3: Frontend Component Refactoring
**Priority:** HIGH
**Goal:** Break down large components

#### Tasks:
1. **Split `DostawyPageContent.tsx` (1937 lines)** (Day 1-3)
   ```
   Split into:
   ├── dostawy/
   │   ├── DostawyPageContent.tsx (orchestrator - 200 lines)
   │   ├── components/
   │   │   ├── DeliveriesListView.tsx (table - 400 lines)
   │   │   ├── DeliveryFilters.tsx (filters - 300 lines)
   │   │   ├── DeliveryActions.tsx (actions - 200 lines)
   │   │   ├── DeliveryStats.tsx (statistics - 200 lines)
   │   │   ├── DeliveryCalendar.tsx (calendar - 300 lines)
   │   │   └── DeliveryExport.tsx (export - 200 lines)
   │   └── hooks/
   │       ├── useDeliveryFilters.ts
   │       ├── useDeliveryActions.ts
   │       └── useDeliveryStats.ts
   ```

2. **Complete Feature Modules** (Day 4-5)
   - [ ] Add missing `components/` to `orders/`
   - [ ] Add missing `hooks/` to `orders/`
   - [ ] Add missing `components/` to `settings/`
   - [ ] Add missing `hooks/` to `settings/`

**Estimated Impact:** Medium risk, high reward

---

### Week 4: Testing & Finalization
**Priority:** MEDIUM
**Goal:** Increase test coverage, stabilize

#### Tasks:
1. **Repository Tests** (Day 1-2)
   - [ ] Write tests for all repositories (target: 80% coverage)
   - [ ] Focus on: `DeliveryRepository`, `WarehouseRepository`, `OrderRepository`

2. **Service Tests** (Day 3-4)
   - [ ] Increase service test coverage from 24% to 60%
   - [ ] Focus on newly refactored services

3. **Integration Tests** (Day 5)
   - [ ] Test refactored modules end-to-end
   - [ ] Verify no regressions

**Estimated Impact:** Low risk, high reward

---

## File Changes Overview

### Files to Delete
- `apps/api/src/routes/warehouse.old.ts`
- Unused imports and commented code

### Files to Merge
- `apps/api/src/services/warehouseService.ts` + `apps/api/src/services/warehouse-service.ts`
  → `apps/api/src/services/warehouse-service.ts`

### Files to Refactor (Split)
1. `apps/api/src/services/importService.ts` → 5 files
2. `apps/api/src/services/deliveryService.ts` → 3 files
3. `apps/web/src/app/dostawy/DostawyPageContent.tsx` → 10+ files

### Files to Update (Error Handling)
- ~24 handler files (remove try-catch, use middleware)

---

## Breaking Changes

### Week 1
- ✅ **Low Risk:** Removing dead code, consolidating services
- **Migration:** Update imports in consuming files

### Week 2
- ⚠️ **Medium Risk:** Service refactoring
- **Migration:** Update all service imports
- **Testing:** Comprehensive integration tests required

### Week 3
- ⚠️ **Medium Risk:** Component refactoring
- **Migration:** Update dynamic imports
- **Testing:** E2E tests for critical flows

### Week 4
- ✅ **Low Risk:** Adding tests
- **Migration:** None

---

## Implementation Order

### Phase 1: Foundation (Week 1)
**Goal:** Clean codebase, fix anti-patterns
**Blockers:** None
**Can Start:** Immediately

### Phase 2: Backend (Week 2)
**Goal:** Refactor services
**Blockers:** Phase 1 completion
**Dependencies:** Updated error handling

### Phase 3: Frontend (Week 3)
**Goal:** Refactor components
**Blockers:** None (can run parallel to Phase 2)
**Dependencies:** None

### Phase 4: Stabilization (Week 4)
**Goal:** Testing and verification
**Blockers:** Phases 1, 2, 3 completion
**Dependencies:** All refactored code

---

## Success Metrics

### Week 1 (Cleanup)
- [ ] `warehouse.old.ts` removed
- [ ] Single warehouse service
- [ ] 0 try-catch blocks in handlers
- [ ] All errors using custom error classes

### Week 2 (Backend)
- [ ] `importService.ts` < 300 lines
- [ ] `deliveryService.ts` < 400 lines
- [ ] All services follow single responsibility

### Week 3 (Frontend)
- [ ] `DostawyPageContent.tsx` < 300 lines
- [ ] All feature modules have `components/` and `hooks/`
- [ ] No components > 500 lines

### Week 4 (Testing)
- [ ] Repository coverage > 80%
- [ ] Service coverage > 60%
- [ ] 0 regressions in integration tests

---

## Risk Assessment

### High Risk Items
1. **Service refactoring (Week 2)** - Complex business logic
   - Mitigation: Extensive testing, feature flags
2. **Component splitting (Week 3)** - User-facing changes
   - Mitigation: E2E tests, gradual rollout

### Medium Risk Items
1. **Error handling changes** - Could affect error reporting
   - Mitigation: Verify all error paths
2. **Warehouse service merge** - Multiple consumers
   - Mitigation: Comprehensive testing

### Low Risk Items
1. **Dead code removal** - No dependencies
2. **Test additions** - No functional changes

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Create this refactoring plan
2. [ ] Review and approve plan with team
3. [ ] Set up feature branch: `refactor/comprehensive-cleanup`
4. [ ] Begin Phase 1, Task 1: Remove dead code

### This Week (Week 1)
- Focus on cleanup and error handling
- Daily commits with clear messages
- Run full test suite after each change

---

## Notes

- **Backward Compatibility:** Maintain during refactoring
- **Feature Freeze:** Consider during Weeks 2-3
- **Rollback Plan:** Keep feature branch until verified
- **Documentation:** Update as we refactor

---

**Plan Created By:** code-refactor-master agent
**Reviewed By:** [Pending]
**Approved By:** [Pending]
**Start Date:** 2025-12-30
