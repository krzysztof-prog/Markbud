# Import Service Refactoring Plan

**Date:** 2025-12-30
**File:** `apps/api/src/services/importService.ts`
**Current Size:** 1350 lines
**Target Size:** 200-300 lines (orchestrator)
**Status:** Planning Phase

---

## Executive Summary

The `ImportService` is a monolithic service handling multiple responsibilities including CSV parsing, PDF parsing, folder management, import validation, conflict detection, variant resolution, and delivery management. This plan proposes breaking it into specialized modules following Single Responsibility Principle (SRP) and Clean Architecture principles.

### Key Objectives
1. Split 1350-line monolith into 6 focused services (200-300 lines each)
2. Improve testability through better separation of concerns
3. Enable independent evolution of file format parsers
4. Simplify maintenance and reduce cognitive load
5. Maintain backward compatibility for API routes

---

## Current State Analysis

### File Structure
```
ImportService (1350 lines)
├── Constructor & Dependencies (lines 39-46)
├── Settings Management (lines 48-69)
├── CRUD Operations (lines 71-94)
├── File Upload (lines 96-140)
├── PDF Auto-Import (lines 142-257)
├── Preview Generation (lines 259-335)
├── Import Approval (lines 337-412)
├── Variant Resolution (lines 414-569)
├── CSV Processing (lines 571-604)
├── Reject/Delete (lines 606-637)
├── Folder Import (lines 639-855)
├── Folder Operations (lines 857-1105)
├── File Discovery (lines 1107-1177)
├── Import Processing (lines 1179-1349)
└── Utilities (scattered)
```

### Dependencies
- **External Services:**
  - `OrderVariantService` - variant conflict detection
  - `ImportLockService` - concurrent import locking
  - `CsvParser` - CSV parsing logic
  - `PdfParser` - PDF parsing logic

- **Repository:**
  - `ImportRepository` - 20+ database methods mixing imports, orders, deliveries

- **Events:**
  - `emitDeliveryCreated()`
  - `emitOrderUpdated()`

### Identified Issues

#### 1. Mixed Responsibilities (Critical)
- **Import Orchestration** - managing import lifecycle
- **File Processing** - handling CSV, PDF formats
- **Folder Management** - scanning, archiving, deleting folders
- **Validation** - file validation, conflict detection
- **Business Logic** - variant resolution, delivery assignment
- **File System Operations** - reading directories, moving files

#### 2. Code Smells

**Long Methods** (Major)
- `performFolderImport()` - 168 lines (687-854)
- `scanFolder()` - 133 lines (972-1104)
- `processImport()` - 147 lines (1203-1349)
- `processUzyteBeleWithResolution()` - 156 lines (414-569)

**Feature Envy** (Major)
- Heavy reliance on `CsvParser` and `PdfParser` methods
- Direct Prisma calls bypassing repository in some places
- Tight coupling with variant and lock services

**God Object** (Critical)
- 30+ public methods
- 5 major responsibilities
- 3 external service dependencies
- Direct file system access

**Primitive Obsession** (Minor)
- Using raw strings for file types ('uzyte_bele', 'ceny_pdf')
- Action types as strings ('overwrite', 'add_new')

#### 3. Testing Challenges
- Difficult to test folder operations in isolation
- Mocking required for file system, parsers, services
- Integration tests needed for most functionality
- High cyclomatic complexity in main methods

#### 4. Repository Anti-patterns
`ImportRepository` mixes 3 concerns:
- Import CRUD
- Order operations
- Delivery operations

---

## Proposed Architecture

### Module Structure

```
services/import/
├── importOrchestrationService.ts    # Main orchestrator (200-300 lines)
├── csvImportService.ts              # CSV-specific logic (150-200 lines)
├── pdfImportService.ts              # PDF-specific logic (150-200 lines)
├── importValidationService.ts       # Validation & conflict detection (200-250 lines)
├── folderImportService.ts           # Folder scanning & batch import (250-300 lines)
├── importConflictService.ts         # Variant conflict resolution (150-200 lines)
└── types/
    ├── import-types.ts              # Shared types & interfaces
    └── import-enums.ts              # Enums for status, actions, file types
```

### Separated Repositories

```
repositories/
├── ImportRepository.ts              # Import CRUD only (100-150 lines)
├── OrderRepository.ts               # Order operations (existing/new)
└── DeliveryRepository.ts            # Delivery operations (existing/new)
```

---

## Detailed Module Mapping

### 1. ImportOrchestrationService (Main Entry Point)

**Responsibility:** High-level orchestration of import workflow

**Methods Migrated:**
```typescript
// From ImportService (lines 71-94, 337-412, 606-637)
- getAllImports(status?: string)
- getPendingImports()
- getImportById(id: number)
- uploadFile(filename, buffer, mimeType)
- approveImport(id, action, replaceBase)
- rejectImport(id)
- deleteImport(id)
- getPreview(id)
```

**New Dependencies:**
- `ImportRepository`
- `CsvImportService`
- `PdfImportService`
- `ImportValidationService`
- `ImportConflictService`

**Key Changes:**
- Delegates to specialized services based on file type
- Maintains backward compatibility
- Handles file upload and record creation
- Coordinates preview generation

**Example:**
```typescript
async uploadFile(filename: string, buffer: Buffer, mimeType?: string) {
  // 1. Validate (ImportValidationService)
  this.validationService.validateUploadedFile(filename, mimeType, buffer);

  // 2. Save file and create record (local)
  const fileImport = await this.createImportRecord(filename, buffer);

  // 3. Delegate to appropriate service
  if (fileImport.fileType === 'ceny_pdf') {
    return this.pdfImportService.autoImport(fileImport);
  }

  return { fileImport, autoImportStatus: null };
}
```

---

### 2. CsvImportService

**Responsibility:** CSV-specific import processing

**Methods Migrated:**
```typescript
// From ImportService (lines 571-604)
- processUzyteBeleImport(fileImport, action, replaceBase)

// New methods
- parseAndPreview(filepath: string): Promise<ParsedUzyteBele>
- importCsv(importId: number, action: ImportAction): Promise<ImportResult>
- validateCsvStructure(filepath: string): Promise<ValidationResult>
```

**Dependencies:**
- `CsvParser` (existing parser)
- `ImportRepository`
- `OrderRepository`
- `DeliveryRepository`
- Event emitters

**Key Features:**
- Wraps CsvParser functionality
- Handles delivery assignment logic
- Emits events after successful import
- Transaction management for order creation

**Example:**
```typescript
async importCsv(
  importId: number,
  options: CsvImportOptions
): Promise<CsvImportResult> {
  const fileImport = await this.repository.findById(importId);

  // Parse CSV
  const parsed = await this.csvParser.processUzyteBele(
    fileImport.filepath,
    options.action,
    options.replaceBase
  );

  // Handle delivery assignment if needed
  if (options.deliveryId) {
    await this.assignToDelivery(options.deliveryId, parsed.orderId);
  }

  // Emit events
  emitOrderUpdated({ id: parsed.orderId });

  return { orderId: parsed.orderId, ...parsed };
}
```

---

### 3. PdfImportService

**Responsibility:** PDF-specific import processing

**Methods Migrated:**
```typescript
// From ImportService (lines 142-257)
- autoImportPdf(importId, filepath, filename)

// New methods
- parseAndPreview(filepath: string): Promise<ParsedPdfCeny>
- importPdf(importId: number): Promise<PdfImportResult>
- handlePendingPrice(orderNumber, priceData): Promise<void>
- checkDuplicatePdf(orderId, importId): Promise<boolean>
```

**Dependencies:**
- `PdfParser` (existing parser)
- `ImportRepository`
- `OrderRepository`
- `prisma` (for PendingOrderPrice)

**Key Features:**
- Automatic import for PDF price files
- Pending price management (order doesn't exist yet)
- Duplicate detection
- Currency handling (EUR/PLN)

**Example:**
```typescript
async autoImport(fileImport: FileImport): Promise<PdfAutoImportResult> {
  const preview = await this.pdfParser.previewCenyPdf(fileImport.filepath);

  // Check if order exists
  const order = await this.orderRepository.findByNumber(preview.orderNumber);

  if (!order) {
    // Save as pending price
    return this.savePendingPrice(fileImport, preview);
  }

  // Check duplicates
  const duplicate = await this.checkDuplicate(order.id, fileImport.id);
  if (duplicate) {
    return this.handleDuplicate(fileImport, duplicate);
  }

  // Import immediately
  return this.importPdfPrice(fileImport, order, preview);
}
```

---

### 4. ImportValidationService

**Responsibility:** Pre-import validation and conflict detection

**Methods Migrated:**
```typescript
// From ImportService (lines 262-335)
- getPreview(id) [validation logic]

// New methods
- validateFile(filename, mimeType, size): void
- detectConflicts(orderNumber, parsedData): Promise<ConflictInfo>
- validateCsvStructure(data): ValidationResult
- validatePdfStructure(data): ValidationResult
- checkDuplicateOrder(orderNumber): Promise<boolean>
```

**Dependencies:**
- `OrderVariantService` (conflict detection)
- `ImportRepository`
- File validation utilities

**Key Features:**
- File security validation (from file-validation.ts)
- Variant conflict detection
- Preview generation for UI
- Structural validation

**Example:**
```typescript
async validateAndPreview(
  fileImport: FileImport
): Promise<ImportPreview> {
  // 1. Parse based on type
  const parsed = await this.parseFile(fileImport);

  // 2. Check for conflicts (CSV only)
  let conflicts = null;
  if (fileImport.fileType === FileType.UZYTE_BELE) {
    conflicts = await this.variantService.detectConflicts(
      parsed.orderNumber,
      parsed
    );
  }

  // 3. Format for UI
  return this.formatPreview(fileImport, parsed, conflicts);
}
```

---

### 5. FolderImportService

**Responsibility:** Batch folder import operations

**Methods Migrated:**
```typescript
// From ImportService (lines 639-855, 857-1105)
- importFromFolder(folderPath, deliveryNumber, userId)
- performFolderImport(normalizedFolder, deliveryNumber, userId)
- listFolders(userId?)
- scanFolder(folderPath, userId?)
- archiveFolder(folderPath, userId?)
- deleteFolder(folderPath, userId?)
- findCsvFilesRecursively(dirPath, maxDepth, currentDepth)
- moveFolderToArchive(folderPath)

// New methods
- validateFolderPath(path, userId): Promise<void>
- extractDateFromFolder(name): Date | null
- processFolderBatch(files, delivery): Promise<BatchResult>
```

**Dependencies:**
- `ImportLockService` (prevent concurrent imports)
- `CsvImportService` (process individual files)
- `ImportRepository`
- `DeliveryRepository`
- File system operations

**Key Features:**
- Distributed locking for concurrent safety
- Recursive CSV discovery
- Batch processing with error handling
- Folder archiving after successful import
- Per-user folder settings support

**Example:**
```typescript
async importFromFolder(
  folderPath: string,
  deliveryNumber: DeliveryNumber,
  userId: number
): Promise<FolderImportResult> {
  // 1. Validate and lock
  await this.validateAndLockFolder(folderPath, userId);

  try {
    // 2. Extract date and find/create delivery
    const date = this.extractDateFromFolder(folderPath);
    const delivery = await this.getOrCreateDelivery(date, deliveryNumber);

    // 3. Find CSV files
    const csvFiles = await this.findCsvFiles(folderPath);

    // 4. Batch process
    const results = await this.processBatch(csvFiles, delivery, userId);

    // 5. Archive folder on success
    if (results.successCount > 0) {
      await this.archiveFolder(folderPath);
    }

    return results;
  } finally {
    // 6. ALWAYS release lock
    await this.lockService.release(folderPath);
  }
}
```

---

### 6. ImportConflictService

**Responsibility:** Variant conflict resolution strategies

**Methods Migrated:**
```typescript
// From ImportService (lines 414-569, 1203-1349)
- processUzyteBeleWithResolution(id, resolution)
- processImport(filepath, deliveryNumber?, resolution?)

// New methods
- resolveConflict(importId, resolution): Promise<ResolutionResult>
- applyReplaceStrategy(orderNumber, newData): Promise<Order>
- applyMergeStrategy(orderNumber, newData): Promise<Order>
- applyUseLatestStrategy(baseNumber, deleteOlder): Promise<Order>
- applyKeepBothStrategy(orderNumber, newData): Promise<Order>
```

**Dependencies:**
- `OrderVariantService` (find related orders)
- `CsvImportService` (actual import)
- `ImportRepository`
- `OrderRepository`
- `prisma` (for transactions)

**Key Features:**
- Strategy pattern for resolution types
- Transactional variant deletion
- Logging and audit trail
- Integration with import approval flow

**Example:**
```typescript
async resolveConflict(
  importId: number,
  resolution: VariantResolutionAction
): Promise<ConflictResolutionResult> {
  const fileImport = await this.repository.findById(importId);

  // Apply strategy based on resolution type
  switch (resolution.type) {
    case 'replace':
      return this.applyReplaceStrategy(fileImport, resolution);

    case 'use_latest':
      return this.applyUseLatestStrategy(fileImport, resolution);

    case 'keep_both':
      return this.applyKeepBothStrategy(fileImport);

    case 'merge':
      return this.applyMergeStrategy(fileImport, resolution);

    case 'cancel':
      return this.applyCancelStrategy(fileImport);
  }
}

private async applyUseLatestStrategy(
  fileImport: FileImport,
  resolution: UseLatestResolution
): Promise<ConflictResolutionResult> {
  if (resolution.deleteOlder) {
    await this.deleteOlderVariants(fileImport.orderNumber);
  }

  // Import as new
  return this.csvImportService.importCsv(fileImport.id, {
    action: 'add_new',
    replaceBase: false,
  });
}
```

---

## Type System Refactoring

### Enums (New File: `import-enums.ts`)

```typescript
export enum FileType {
  UZYTE_BELE = 'uzyte_bele',
  CENY_PDF = 'ceny_pdf',
  UNKNOWN = 'unknown',
}

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  REJECTED = 'rejected',
}

export enum ImportAction {
  OVERWRITE = 'overwrite',
  ADD_NEW = 'add_new',
}

export enum DeliveryNumber {
  I = 'I',
  II = 'II',
  III = 'III',
}
```

### Interfaces (New File: `import-types.ts`)

```typescript
export interface ImportPreview {
  import: FileImport;
  data: any[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
  metadata?: Record<string, any>;
  message?: string;
}

export interface CsvImportOptions {
  action: ImportAction;
  replaceBase?: boolean;
  deliveryId?: number;
}

export interface CsvImportResult {
  orderId: number;
  requirementsCount: number;
  windowsCount: number;
}

export interface PdfImportResult {
  orderId: number;
  updated: boolean;
  currency: 'EUR' | 'PLN';
  valueNetto: number;
}

export interface PdfAutoImportResult {
  fileImport: FileImport;
  autoImportStatus: 'success' | 'error' | 'warning' | 'pending_order' | null;
  autoImportError?: string;
  autoImportMessage?: string;
  result?: any;
}

export interface FolderImportResult {
  delivery: {
    id: number;
    deliveryDate: Date;
    deliveryNumber: string;
    created: boolean;
  };
  summary: {
    totalFiles: number;
    successCount: number;
    skippedCount: number;
    failCount: number;
  };
  results: FolderImportFileResult[];
  archivedPath: string | null;
}

export interface FolderImportFileResult {
  filename: string;
  relativePath: string;
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface ConflictResolutionResult {
  success: boolean;
  orderId?: number;
  message: string;
}
```

---

## Repository Separation

### Current: ImportRepository (Mixed Concerns)

**Problem:**
- 20+ methods mixing imports, orders, deliveries
- Hard to test in isolation
- Violates Single Responsibility Principle

### Proposed: Split into 3 Repositories

#### 1. ImportRepository (Focused)
```typescript
// Only import-related data access
- findAll(filters)
- findById(id)
- findPending()
- create(data)
- update(id, data)
- delete(id)
- findDuplicatePdfImport(orderId, excludeId)
- getSetting(key)
```

#### 2. OrderRepository (New/Extend Existing)
```typescript
// Order-related operations
- findByNumber(orderNumber)
- findById(id)
- delete(id)
- findByNumberPattern(baseNumber) // for variants
- create(data)
- update(id, data)
```

#### 3. DeliveryRepository (Extend Existing)
```typescript
// Delivery-related operations
- findByDateAndNumber(date, number)
- create(data)
- findById(id)
- findDeliveriesOnDate(date)
- addOrderToDelivery(deliveryId, orderId, position)
- findExistingDeliveryOrder(deliveryId, orderId)
- getMaxDeliveryOrderPosition(deliveryId)
```

**Migration Strategy:**
1. Create new repositories with focused methods
2. Update services to use new repositories
3. Deprecate old mixed repository
4. Remove after all services migrated

---

## Implementation Phases

### Phase 1: Foundation (Priority: Critical, Effort: 2-3 days)

**Goal:** Setup types and base structure

**Tasks:**
1. Create `services/import/` directory structure
2. Create `types/import-types.ts` with all interfaces
3. Create `types/import-enums.ts` with enums
4. Replace string literals with enums in existing code
5. Write unit tests for types/enums

**Deliverables:**
- Type definitions
- Enum definitions
- Updated imports in ImportService

**Breaking Changes:** None (backward compatible)

**Testing:** Type compilation, enum usage tests

---

### Phase 2: Repository Refactoring (Priority: Critical, Effort: 2-3 days)

**Goal:** Separate data access concerns

**Tasks:**
1. Create new focused ImportRepository (import-only methods)
2. Extract order methods to OrderRepository
3. Extract delivery methods to DeliveryRepository
4. Update ImportService to use new repositories
5. Write integration tests for repositories

**Deliverables:**
- 3 focused repositories
- Updated ImportService constructor
- Repository tests

**Breaking Changes:** None (internal refactoring)

**Testing:**
- Repository unit tests
- Integration tests with Prisma
- Existing ImportService tests should still pass

---

### Phase 3: Core Services (Priority: High, Effort: 4-5 days)

**Goal:** Extract CSV and PDF services

**Tasks:**
1. Create `CsvImportService` with CSV-specific logic
2. Create `PdfImportService` with PDF-specific logic
3. Create `ImportValidationService` with validation logic
4. Update ImportService to delegate to new services
5. Write unit tests for each service

**Deliverables:**
- 3 new services (CSV, PDF, Validation)
- Updated ImportOrchestrationService
- Service unit tests

**Breaking Changes:** None (internal refactoring)

**Testing:**
- Mock parsers and repositories
- Test each service in isolation
- Integration tests for orchestration

**Dependencies:**
```
ImportOrchestrationService
  ├─> CsvImportService (depends on CsvParser, OrderRepo)
  ├─> PdfImportService (depends on PdfParser, OrderRepo)
  └─> ImportValidationService (depends on VariantService)
```

---

### Phase 4: Folder Operations (Priority: High, Effort: 3-4 days)

**Goal:** Extract folder management

**Tasks:**
1. Create `FolderImportService` with folder operations
2. Move folder scanning, archiving, deletion methods
3. Integrate with ImportLockService
4. Update ImportService to delegate folder operations
5. Write tests with mocked file system

**Deliverables:**
- FolderImportService
- Updated orchestrator
- File system mocks for testing

**Breaking Changes:** None

**Testing:**
- Mock fs operations
- Test recursive file discovery
- Test folder archiving
- Test lock acquisition/release

---

### Phase 5: Conflict Resolution (Priority: Medium, Effort: 2-3 days)

**Goal:** Extract variant resolution logic

**Tasks:**
1. Create `ImportConflictService` with resolution strategies
2. Move variant resolution methods
3. Implement strategy pattern for resolutions
4. Update ImportService to use conflict service
5. Write unit tests for each strategy

**Deliverables:**
- ImportConflictService
- Strategy implementations
- Conflict resolution tests

**Breaking Changes:** None

**Testing:**
- Test each resolution strategy
- Test transaction rollback on error
- Integration tests with OrderVariantService

---

### Phase 6: Orchestrator Cleanup (Priority: Medium, Effort: 2-3 days)

**Goal:** Simplify main service to pure orchestration

**Tasks:**
1. Remove all delegated logic from ImportService
2. Rename to `ImportOrchestrationService`
3. Update route handlers to use orchestrator
4. Ensure backward compatibility
5. Update documentation

**Deliverables:**
- Clean orchestrator (200-300 lines)
- Updated routes
- API documentation

**Breaking Changes:**
- Service name change (internal only)
- Route handlers need import updates

**Testing:**
- Full integration tests
- API endpoint tests
- Backward compatibility tests

---

### Phase 7: Testing & Documentation (Priority: High, Effort: 2-3 days)

**Goal:** Comprehensive test coverage

**Tasks:**
1. Write integration tests for full import flows
2. Write end-to-end tests for folder import
3. Update API documentation
4. Create architecture diagrams
5. Document migration for developers

**Deliverables:**
- 80%+ test coverage
- Updated API docs
- Architecture diagrams
- Migration guide

**Testing Strategy:**
```
Unit Tests (per service)
  ├─> CsvImportService (mock parser, repos)
  ├─> PdfImportService (mock parser, repos)
  ├─> ImportValidationService (mock variant service)
  ├─> FolderImportService (mock fs, lock service)
  └─> ImportConflictService (mock repos, transactions)

Integration Tests
  ├─> Repository tests with test database
  ├─> Service integration (real repos, mocked parsers)
  └─> Full flow tests (upload -> preview -> approve)

E2E Tests
  └─> API endpoint tests (real services, test database)
```

---

## Dependencies & Risks

### External Service Dependencies

| Service | Used By | Risk Level | Mitigation |
|---------|---------|------------|------------|
| `OrderVariantService` | ImportValidationService | Low | Well-tested, stable API |
| `ImportLockService` | FolderImportService | Low | Simple, focused service |
| `CsvParser` | CsvImportService | Medium | Large, complex parser (future refactor candidate) |
| `PdfParser` | PdfImportService | Medium | PDF parsing fragile, needs robust error handling |
| Event Emitters | Multiple services | Low | Simple pub/sub, no side effects |

### Data Migration

**None required** - This is a pure code refactoring, no database schema changes.

### Breaking Changes Assessment

**API Routes:** No breaking changes
**Service Interface:** Internal only, backward compatible during migration
**Database:** No changes
**File System:** No changes

### Rollback Strategy

**Per-Phase Rollback:**
1. Keep old ImportService intact until Phase 6
2. Feature flags for using new services
3. Git tags after each phase
4. Easy revert via git

**Example:**
```typescript
// Feature flag pattern
const USE_NEW_SERVICES = process.env.USE_REFACTORED_IMPORT === 'true';

async uploadFile() {
  if (USE_NEW_SERVICES) {
    return this.orchestrator.uploadFile(...);
  }
  return this.legacyService.uploadFile(...);
}
```

### Performance Implications

**Expected Impact:** Neutral to Positive

**Reasoning:**
- No additional database queries
- Same transaction boundaries
- Potential for better caching (service-level)
- More granular error handling

**Monitoring:**
- Track import duration before/after
- Monitor memory usage (more service instances)
- Watch transaction counts

---

## Testing Strategy

### Unit Testing (Per Service)

**Coverage Target:** 90%+

**Mock Strategy:**
```typescript
// Example: CsvImportService tests
describe('CsvImportService', () => {
  let service: CsvImportService;
  let mockParser: jest.Mocked<CsvParser>;
  let mockRepository: jest.Mocked<ImportRepository>;
  let mockOrderRepo: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockParser = createMockCsvParser();
    mockRepository = createMockImportRepository();
    mockOrderRepo = createMockOrderRepository();

    service = new CsvImportService(
      mockParser,
      mockRepository,
      mockOrderRepo
    );
  });

  it('should import CSV and emit events', async () => {
    // Test implementation
  });
});
```

### Integration Testing

**Focus Areas:**
1. Repository + Database interactions
2. Service + Service interactions
3. Transaction handling
4. Event emission

**Example:**
```typescript
describe('CSV Import Integration', () => {
  let testDb: PrismaClient;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  it('should import CSV and create order in database', async () => {
    // Use real repositories with test database
    // Use real services
    // Verify database state
  });
});
```

### End-to-End Testing

**Scenarios:**
1. Upload CSV -> Preview -> Approve -> Verify in DB
2. Upload PDF -> Auto-import -> Check order price
3. Folder import -> Batch process -> Verify delivery
4. Variant conflict -> Resolve -> Verify outcome

**Example:**
```typescript
describe('Folder Import E2E', () => {
  it('should import folder and archive after success', async () => {
    // 1. Setup test folder with CSV files
    // 2. Call API endpoint
    // 3. Verify delivery created
    // 4. Verify orders created
    // 5. Verify folder archived
    // 6. Verify events emitted
  });
});
```

---

## Success Metrics

### Code Quality Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Service Size | 1350 lines | 200-300 lines | Critical |
| Cyclomatic Complexity | 15-25 (high) | 5-10 (low) | High |
| Test Coverage | ~40% | 85%+ | Critical |
| Method Count | 30+ public | 10-15 public | High |
| Dependencies | 5 mixed | 2-3 focused | Medium |

### Performance Metrics

| Metric | Baseline | Target | Alert Threshold |
|--------|----------|--------|-----------------|
| Import Duration | Measure | ±5% | +20% |
| Memory Usage | Measure | ±10% | +30% |
| Transaction Count | Measure | Same | +10% |

### Maintainability Metrics

| Metric | Target |
|--------|--------|
| Time to Add New File Type | <2 hours |
| Time to Fix Import Bug | <1 hour |
| New Developer Onboarding | <1 day |
| Service Compilation Time | <5 seconds |

---

## Migration Checklist

### Pre-Migration
- [ ] Review plan with team
- [ ] Setup feature flags
- [ ] Create backup branch
- [ ] Document current API behavior
- [ ] Setup monitoring/logging

### During Migration
- [ ] Complete Phase 1: Foundation
- [ ] Complete Phase 2: Repositories
- [ ] Complete Phase 3: Core Services
- [ ] Complete Phase 4: Folder Operations
- [ ] Complete Phase 5: Conflict Resolution
- [ ] Complete Phase 6: Orchestrator Cleanup
- [ ] Complete Phase 7: Testing & Docs

### Post-Migration
- [ ] Performance testing
- [ ] Load testing
- [ ] Security review
- [ ] Documentation review
- [ ] Team training
- [ ] Feature flag cleanup
- [ ] Remove legacy code

---

## Alternative Approaches Considered

### Option A: Keep Monolithic Service (Rejected)
**Pros:** No refactoring effort, no risk
**Cons:** Unmaintainable, untestable, high cognitive load
**Verdict:** Technical debt will compound

### Option B: Microservices (Rejected)
**Pros:** Ultimate separation
**Cons:** Overkill for monorepo, network overhead, complexity
**Verdict:** Too much for current scale

### Option C: Single Service with Internal Modules (Alternative)
**Pros:** Simpler than proposed plan
**Cons:** Less reusability, harder to test
**Verdict:** Good middle ground if timeline is tight

**Recommended if:**
- Team size is small (1-2 developers)
- Timeline is very tight (<1 week)
- Low confidence in testing infrastructure

### Option D: Gradual Strangler Pattern (Alternative)
**Pros:** Lowest risk, incremental
**Cons:** Longer timeline, dual code paths
**Verdict:** Best for production systems with zero downtime requirements

---

## Estimated Timeline

### Full Refactoring (Recommended)
- **Phase 1:** 2-3 days
- **Phase 2:** 2-3 days
- **Phase 3:** 4-5 days
- **Phase 4:** 3-4 days
- **Phase 5:** 2-3 days
- **Phase 6:** 2-3 days
- **Phase 7:** 2-3 days

**Total:** 17-24 days (3.5 - 5 weeks)

### Minimal Viable Refactoring (Phases 1-3 only)
- **Total:** 8-11 days (1.5 - 2 weeks)
- **Result:** Core services separated, folder logic remains

### Strangler Pattern (Incremental)
- **Phase 1:** 2-3 days
- **Each Service:** 3-5 days
- **Total:** 20-30 days spread over 2-3 months

---

## Conclusion

This refactoring plan transforms a 1350-line monolithic service into a maintainable, testable architecture with 6 focused services. The phased approach minimizes risk while delivering incremental value.

**Key Benefits:**
1. **Maintainability:** Easier to find, understand, and modify code
2. **Testability:** Each service can be tested in isolation
3. **Extensibility:** New file types can be added with minimal changes
4. **Performance:** Better opportunity for optimization and caching
5. **Team Velocity:** Multiple developers can work on different services

**Recommendation:** Execute full refactoring over 4-5 weeks with proper testing and documentation. The investment will pay dividends in reduced maintenance costs and faster feature development.

---

## Next Steps

1. **Review & Approval:** Present plan to team
2. **Timeline Allocation:** Reserve 4-5 week sprint
3. **Branch Setup:** Create feature branch for refactoring
4. **Kick-off Phase 1:** Start with foundation (types & enums)
5. **Weekly Check-ins:** Review progress and adjust plan

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Author:** Claude Sonnet 4.5
**Review Status:** Pending Team Review
