# Import Service Refactoring - Implementation Checklist

**Project:** AKROBUD Import Service Refactoring
**Target:** Split 1350-line monolith into 6 focused services
**Timeline:** 17-24 days (3.5 - 5 weeks)

---

## Phase 1: Foundation (2-3 days)

### Day 1: Setup & Types

- [ ] **Create directory structure**
  ```bash
  mkdir -p apps/api/src/services/import/types
  ```

- [ ] **Create type definitions** (`import-types.ts`)
  - [ ] `ImportPreview` interface
  - [ ] `CsvImportOptions` interface
  - [ ] `CsvImportResult` interface
  - [ ] `PdfImportResult` interface
  - [ ] `PdfAutoImportResult` interface
  - [ ] `FolderImportResult` interface
  - [ ] `FolderImportFileResult` interface
  - [ ] `ConflictResolutionResult` interface

- [ ] **Create enum definitions** (`import-enums.ts`)
  - [ ] `FileType` enum (UZYTE_BELE, CENY_PDF, UNKNOWN)
  - [ ] `ImportStatus` enum (PENDING, PROCESSING, COMPLETED, ERROR, REJECTED)
  - [ ] `ImportAction` enum (OVERWRITE, ADD_NEW)
  - [ ] `DeliveryNumber` enum (I, II, III)

### Day 2-3: Replace String Literals

- [ ] **Update ImportService to use enums**
  - [ ] Replace `'uzyte_bele'` with `FileType.UZYTE_BELE`
  - [ ] Replace `'ceny_pdf'` with `FileType.CENY_PDF`
  - [ ] Replace `'pending'` with `ImportStatus.PENDING`
  - [ ] Replace `'completed'` with `ImportStatus.COMPLETED`
  - [ ] Replace `'overwrite'` with `ImportAction.OVERWRITE`
  - [ ] Replace `'add_new'` with `ImportAction.ADD_NEW`

- [ ] **Write tests for enums**
  - [ ] Test enum values
  - [ ] Test type safety

- [ ] **Commit Phase 1**
  ```bash
  git add .
  git commit -m "refactor(import): Phase 1 - Add types and enums"
  ```

**Acceptance Criteria:**
- ✅ All types defined and exported
- ✅ All enums defined and exported
- ✅ ImportService compiles without errors
- ✅ Tests pass

---

## Phase 2: Repository Refactoring (2-3 days)

### Day 1: Create Focused ImportRepository

- [ ] **Backup current repository**
  ```bash
  cp apps/api/src/repositories/ImportRepository.ts \
     apps/api/src/repositories/ImportRepository.backup.ts
  ```

- [ ] **Create new focused ImportRepository**
  - [ ] Keep only import CRUD methods:
    - [ ] `findAll(filters)`
    - [ ] `findById(id)`
    - [ ] `findPending()`
    - [ ] `create(data)`
    - [ ] `update(id, data)`
    - [ ] `delete(id)`
    - [ ] `findDuplicatePdfImport(orderId, excludeId)`
    - [ ] `getSetting(key)`
  - [ ] Remove order-related methods
  - [ ] Remove delivery-related methods

### Day 2: Create/Extend OrderRepository

- [ ] **Create OrderRepository** (or extend existing)
  ```typescript
  apps/api/src/repositories/OrderRepository.ts
  ```
  - [ ] `findByNumber(orderNumber)`
  - [ ] `findById(id)`
  - [ ] `delete(id)`
  - [ ] `findByNumberPattern(baseNumber)`
  - [ ] `create(data)`
  - [ ] `update(id, data)`

- [ ] **Write OrderRepository tests**
  - [ ] Test findByNumber
  - [ ] Test create with transaction

### Day 3: Extend DeliveryRepository

- [ ] **Extend DeliveryRepository** (if exists)
  - [ ] `findByDateAndNumber(date, number)`
  - [ ] `create(data)`
  - [ ] `findById(id)`
  - [ ] `findDeliveriesOnDate(date)`
  - [ ] `addOrderToDelivery(deliveryId, orderId, position)`
  - [ ] `findExistingDeliveryOrder(deliveryId, orderId)`
  - [ ] `getMaxDeliveryOrderPosition(deliveryId)`

- [ ] **Update ImportService to use new repositories**
  - [ ] Update constructor
  - [ ] Replace repository calls

- [ ] **Run tests**
  ```bash
  pnpm test:api
  ```

- [ ] **Commit Phase 2**
  ```bash
  git commit -m "refactor(import): Phase 2 - Separate repository concerns"
  ```

**Acceptance Criteria:**
- ✅ 3 focused repositories exist
- ✅ Each repository has single responsibility
- ✅ All tests pass
- ✅ No breaking changes to ImportService API

---

## Phase 3: Core Services (4-5 days)

### Day 1-2: CsvImportService

- [ ] **Create CsvImportService**
  ```typescript
  apps/api/src/services/import/csvImportService.ts
  ```

- [ ] **Move CSV methods from ImportService**
  - [ ] `processUzyteBeleImport()` → `importCsv()`
  - [ ] Add `parseAndPreview(filepath)`
  - [ ] Add `validateCsvStructure(filepath)`

- [ ] **Update dependencies**
  - [ ] Inject CsvParser
  - [ ] Inject ImportRepository
  - [ ] Inject OrderRepository
  - [ ] Inject DeliveryRepository

- [ ] **Write unit tests**
  - [ ] Test importCsv with mocked parser
  - [ ] Test delivery assignment
  - [ ] Test event emission

### Day 2-3: PdfImportService

- [ ] **Create PdfImportService**
  ```typescript
  apps/api/src/services/import/pdfImportService.ts
  ```

- [ ] **Move PDF methods from ImportService**
  - [ ] `autoImportPdf()` → `autoImport()`
  - [ ] Add `importPdf(importId)`
  - [ ] Add `handlePendingPrice(orderNumber, priceData)`
  - [ ] Add `checkDuplicatePdf(orderId, importId)`

- [ ] **Write unit tests**
  - [ ] Test autoImport success case
  - [ ] Test pending price creation
  - [ ] Test duplicate detection

### Day 3-4: ImportValidationService

- [ ] **Create ImportValidationService**
  ```typescript
  apps/api/src/services/import/importValidationService.ts
  ```

- [ ] **Move validation logic**
  - [ ] Extract from `getPreview()` → `validateAndPreview()`
  - [ ] Add `validateFile(filename, mimeType, size)`
  - [ ] Add `detectConflicts(orderNumber, parsedData)`
  - [ ] Add `formatPreview(fileImport, parsed, conflicts)`

- [ ] **Write unit tests**
  - [ ] Test file validation (security)
  - [ ] Test conflict detection
  - [ ] Test preview formatting

### Day 5: Update Orchestrator

- [ ] **Update ImportService to use new services**
  - [ ] Inject CsvImportService
  - [ ] Inject PdfImportService
  - [ ] Inject ImportValidationService
  - [ ] Update `uploadFile()` to delegate
  - [ ] Update `getPreview()` to delegate
  - [ ] Update `approveImport()` to delegate

- [ ] **Run integration tests**
  ```bash
  pnpm test:api
  ```

- [ ] **Commit Phase 3**
  ```bash
  git commit -m "refactor(import): Phase 3 - Extract core services"
  ```

**Acceptance Criteria:**
- ✅ 3 new services created (CSV, PDF, Validation)
- ✅ ImportService delegates to new services
- ✅ Unit tests for each service (80%+ coverage)
- ✅ All integration tests pass

---

## Phase 4: Folder Operations (3-4 days)

### Day 1-2: FolderImportService

- [ ] **Create FolderImportService**
  ```typescript
  apps/api/src/services/import/folderImportService.ts
  ```

- [ ] **Move folder methods from ImportService**
  - [ ] `importFromFolder()` → `importFolder()`
  - [ ] `performFolderImport()` → `processBatch()`
  - [ ] `listFolders()`
  - [ ] `scanFolder()`
  - [ ] `archiveFolder()`
  - [ ] `deleteFolder()`
  - [ ] `findCsvFilesRecursively()` → `findCsvFiles()`
  - [ ] `moveFolderToArchive()` (private)

- [ ] **Add new methods**
  - [ ] `validateFolderPath(path, userId)`
  - [ ] `extractDateFromFolder(name)`
  - [ ] `getOrCreateDelivery(date, number)`

### Day 2-3: Write Tests

- [ ] **Write unit tests with mocked file system**
  - [ ] Test folder validation
  - [ ] Test CSV file discovery
  - [ ] Test batch processing
  - [ ] Test folder archiving
  - [ ] Test lock acquisition/release

- [ ] **Write integration tests**
  - [ ] Test full folder import flow
  - [ ] Test concurrent import prevention

### Day 3-4: Update Orchestrator

- [ ] **Update ImportService**
  - [ ] Inject FolderImportService
  - [ ] Update `importFromFolder()` to delegate
  - [ ] Update `listFolders()` to delegate
  - [ ] Update `scanFolder()` to delegate
  - [ ] Update `archiveFolder()` to delegate
  - [ ] Update `deleteFolder()` to delegate

- [ ] **Test folder operations**
  ```bash
  pnpm test:api -- folder
  ```

- [ ] **Commit Phase 4**
  ```bash
  git commit -m "refactor(import): Phase 4 - Extract folder operations"
  ```

**Acceptance Criteria:**
- ✅ FolderImportService created
- ✅ All folder operations moved
- ✅ Lock service integrated
- ✅ Tests pass

---

## Phase 5: Conflict Resolution (2-3 days)

### Day 1: ImportConflictService

- [ ] **Create ImportConflictService**
  ```typescript
  apps/api/src/services/import/importConflictService.ts
  ```

- [ ] **Move conflict resolution from ImportService**
  - [ ] `processUzyteBeleWithResolution()` → `resolveConflict()`
  - [ ] Extract from `processImport()`

- [ ] **Implement strategies**
  - [ ] `applyReplaceStrategy()`
  - [ ] `applyMergeStrategy()`
  - [ ] `applyUseLatestStrategy()`
  - [ ] `applyKeepBothStrategy()`
  - [ ] `applyCancelStrategy()`

### Day 2: Write Tests

- [ ] **Write unit tests**
  - [ ] Test replace strategy
  - [ ] Test use_latest strategy (with/without delete)
  - [ ] Test keep_both strategy
  - [ ] Test cancel strategy

- [ ] **Write integration tests**
  - [ ] Test conflict resolution with real database
  - [ ] Test transaction rollback on error

### Day 3: Update Orchestrator

- [ ] **Update ImportService**
  - [ ] Inject ImportConflictService
  - [ ] Update `processUzyteBeleWithResolution()` to delegate
  - [ ] Update `processImport()` to delegate

- [ ] **Commit Phase 5**
  ```bash
  git commit -m "refactor(import): Phase 5 - Extract conflict resolution"
  ```

**Acceptance Criteria:**
- ✅ ImportConflictService created
- ✅ All strategies implemented
- ✅ Tests pass
- ✅ Transaction handling works

---

## Phase 6: Orchestrator Cleanup (2-3 days)

### Day 1: Remove Delegated Code

- [ ] **Clean up ImportService**
  - [ ] Remove all CSV processing logic
  - [ ] Remove all PDF processing logic
  - [ ] Remove all folder operations
  - [ ] Remove all conflict resolution
  - [ ] Keep only orchestration methods:
    - [ ] `getAllImports()`
    - [ ] `getPendingImports()`
    - [ ] `getImportById()`
    - [ ] `uploadFile()`
    - [ ] `approveImport()`
    - [ ] `rejectImport()`
    - [ ] `deleteImport()`
    - [ ] `getPreview()`
    - [ ] `importFromFolder()`

- [ ] **Verify service size**
  ```bash
  wc -l apps/api/src/services/import/importOrchestrationService.ts
  # Should be 200-300 lines
  ```

### Day 2: Rename & Update Routes

- [ ] **Rename service**
  ```bash
  mv apps/api/src/services/importService.ts \
     apps/api/src/services/import/importOrchestrationService.ts
  ```

- [ ] **Update route handlers**
  - [ ] Update imports in `routes/imports.ts`
  - [ ] Update handler file

- [ ] **Update tests**
  - [ ] Rename test files
  - [ ] Update imports

### Day 3: Verify Everything

- [ ] **Run all tests**
  ```bash
  pnpm test:api
  ```

- [ ] **Test API endpoints manually**
  - [ ] POST /api/imports/upload
  - [ ] GET /api/imports/:id/preview
  - [ ] POST /api/imports/:id/approve
  - [ ] POST /api/imports/:id/reject
  - [ ] DELETE /api/imports/:id
  - [ ] POST /api/imports/folder

- [ ] **Commit Phase 6**
  ```bash
  git commit -m "refactor(import): Phase 6 - Final orchestrator cleanup"
  ```

**Acceptance Criteria:**
- ✅ ImportOrchestrationService is 200-300 lines
- ✅ No business logic in orchestrator
- ✅ All routes updated
- ✅ All tests pass

---

## Phase 7: Testing & Documentation (2-3 days)

### Day 1: Comprehensive Testing

- [ ] **Write missing unit tests**
  - [ ] Ensure 90%+ coverage per service
  - [ ] Test error cases
  - [ ] Test edge cases

- [ ] **Write integration tests**
  - [ ] Full CSV import flow
  - [ ] Full PDF import flow
  - [ ] Full folder import flow
  - [ ] Conflict resolution flow

- [ ] **Write E2E tests**
  - [ ] API endpoint tests
  - [ ] Multi-user scenarios
  - [ ] Error handling

- [ ] **Run test coverage**
  ```bash
  pnpm test:api --coverage
  ```

### Day 2: Documentation

- [ ] **Update API documentation**
  - [ ] Document new service structure
  - [ ] Update endpoint descriptions
  - [ ] Add examples

- [ ] **Create architecture diagrams**
  - [ ] Service dependency graph
  - [ ] Data flow diagrams
  - [ ] Component interaction

- [ ] **Write migration guide**
  - [ ] For developers using ImportService
  - [ ] Breaking changes (if any)
  - [ ] Example code updates

### Day 3: Code Review & Polish

- [ ] **Code review checklist**
  - [ ] TypeScript strict mode compliance
  - [ ] Error handling consistency
  - [ ] Logging consistency
  - [ ] Comment quality
  - [ ] No dead code

- [ ] **Performance testing**
  - [ ] Benchmark import duration
  - [ ] Check memory usage
  - [ ] Monitor transaction counts

- [ ] **Final commit**
  ```bash
  git commit -m "refactor(import): Phase 7 - Complete testing and docs"
  git tag import-refactor-v1.0
  ```

**Acceptance Criteria:**
- ✅ 90%+ test coverage
- ✅ All documentation updated
- ✅ Architecture diagrams complete
- ✅ Migration guide written
- ✅ Code review passed

---

## Post-Refactoring Tasks

### Monitoring Setup

- [ ] **Add metrics**
  - [ ] Track import duration
  - [ ] Track import success/failure rate
  - [ ] Monitor service performance

- [ ] **Setup alerts**
  - [ ] High error rate
  - [ ] Slow imports
  - [ ] Lock timeouts

### Cleanup

- [ ] **Remove legacy code**
  - [ ] Delete `ImportRepository.backup.ts`
  - [ ] Remove feature flags (if used)
  - [ ] Clean up commented code

- [ ] **Update team documentation**
  - [ ] Add to onboarding guide
  - [ ] Update development workflow docs
  - [ ] Create troubleshooting guide

### Team Training

- [ ] **Knowledge sharing session**
  - [ ] Present new architecture
  - [ ] Demo import flows
  - [ ] Q&A session

- [ ] **Code walkthrough**
  - [ ] Show service responsibilities
  - [ ] Explain testing strategy
  - [ ] Discuss best practices

---

## Rollback Plan

If critical issues arise, follow this rollback procedure:

### Step 1: Assess Impact
- [ ] Identify which phase introduced the issue
- [ ] Determine if rollback is necessary

### Step 2: Revert to Last Good State
```bash
# Rollback to specific phase
git log --oneline | grep "refactor(import)"
git revert <commit-hash>

# Or rollback entire refactoring
git revert import-refactor-v1.0
```

### Step 3: Deploy Hotfix
- [ ] Deploy reverted code
- [ ] Verify system stability
- [ ] Communicate to team

### Step 4: Post-Mortem
- [ ] Document what went wrong
- [ ] Update refactoring plan
- [ ] Schedule retry

---

## Success Metrics Tracking

### Code Quality

| Metric | Before | Target | After | Status |
|--------|--------|--------|-------|--------|
| Service Size | 1350 lines | 200-300 | _____ | ⏳ |
| Cyclomatic Complexity | 15-25 | 5-10 | _____ | ⏳ |
| Test Coverage | ~40% | 85%+ | _____ | ⏳ |
| Method Count | 30+ | 10-15 | _____ | ⏳ |

### Performance

| Metric | Baseline | After | Change | Status |
|--------|----------|-------|--------|--------|
| CSV Import Duration | _____ ms | _____ ms | _____ % | ⏳ |
| PDF Import Duration | _____ ms | _____ ms | _____ % | ⏳ |
| Folder Import Duration | _____ ms | _____ ms | _____ % | ⏳ |
| Memory Usage | _____ MB | _____ MB | _____ % | ⏳ |

---

## Quick Reference

### File Locations

```
apps/api/src/services/import/
├── importOrchestrationService.ts    # Main entry point
├── csvImportService.ts              # CSV processing
├── pdfImportService.ts              # PDF processing
├── importValidationService.ts       # Validation
├── folderImportService.ts           # Folder operations
├── importConflictService.ts         # Conflict resolution
└── types/
    ├── import-types.ts
    └── import-enums.ts
```

### Key Commands

```bash
# Run tests
pnpm test:api

# Run tests with coverage
pnpm test:api --coverage

# Check TypeScript
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Build
pnpm build
```

### Common Issues

**Issue:** Service compilation fails after moving methods
**Solution:** Check all imports, ensure types are exported

**Issue:** Tests fail after repository split
**Solution:** Update mocks to match new repository interfaces

**Issue:** Circular dependency detected
**Solution:** Review service dependencies, may need to extract shared logic

---

**Checklist Version:** 1.0
**Last Updated:** 2025-12-30
**Companion Documents:**
- import-service-refactor-plan-2025-12-30.md
- import-service-architecture-diagram.md
