# ImportService Refactoring Plan

## Executive Summary

The `importService.ts` file is one of the largest files in the backend codebase at **1350 lines**. It handles multiple responsibilities including file uploads, folder operations, CSV/PDF imports, delivery associations, variant conflict resolution, and user-specific folder settings. This plan proposes splitting the service into focused, single-responsibility modules following SOLID principles and the existing backend architecture patterns.

**Priority**: HIGH - This is critical infrastructure code that impacts the entire import workflow.

**Estimated Effort**: 5-7 days for full refactoring with tests.

---

## Current State Analysis

### Lines of Code
- **Total**: 1350 lines
- **Class definition**: ~1310 lines
- **Interfaces/Types**: ~40 lines

### Main Responsibilities

1. **File Management** (35% of code)
   - Upload file handling and validation
   - Folder browsing and scanning
   - Archive operations (moving folders)
   - Recursive file search

2. **Import Processing** (30% of code)
   - CSV import workflow
   - PDF import workflow
   - Auto-import logic for PDFs
   - Pending order price management

3. **Delivery Integration** (15% of code)
   - Folder-based delivery creation
   - Order-to-delivery assignment
   - Bulk folder imports

4. **Variant Resolution** (10% of code)
   - Conflict detection
   - Resolution strategy execution
   - Order variant management

5. **User Settings** (5% of code)
   - Per-user folder paths
   - Global settings fallback

6. **Import Locking** (5% of code)
   - Concurrent import prevention
   - Lock acquisition/release

### Dependencies

**External Dependencies**:
- `fs/promises` - File system operations
- `path` - Path manipulation
- Prisma client
- `ImportRepository`
- `CsvParser`, `PdfParser`
- `OrderVariantService`
- `ImportLockService`
- `event-emitter`
- `file-validation`
- Error classes

**Database Tables Accessed**:
- `file_imports`
- `orders`
- `deliveries`
- `delivery_orders`
- `pending_order_prices`
- `user_folder_settings`
- `settings`

### Test Coverage
- Current: ~15% (only basic upload tests)
- Target: 80%+

---

## Problems Identified

### 1. Single Responsibility Principle Violations (Critical)

**Issue**: Service handles 6+ distinct responsibilities
- File upload/management
- Import processing
- Folder operations
- Delivery management
- Variant resolution orchestration
- Settings management

**Impact**:
- Difficult to test in isolation
- High coupling between concerns
- Hard to maintain and extend

### 2. Large Method Complexity (Major)

**Issue**: Several methods exceed 100 lines:
- `importFromFolder()` - 210 lines
- `performFolderImport()` - 170 lines
- `processUzyteBeleWithResolution()` - 155 lines
- `scanFolder()` - 130 lines
- `processImport()` - 145 lines

**Impact**:
- Hard to understand logic flow
- Difficult to test edge cases
- High cyclomatic complexity

### 3. File System Operations Mixed with Business Logic (Major)

**Issue**: Direct file system calls scattered throughout service
- No abstraction layer for file operations
- Hard to mock in tests
- Platform-dependent behavior

**Impact**:
- Cannot test without actual file system
- Difficult to handle errors consistently
- Hard to add features like S3 storage

### 4. Transaction Management Issues (Major)

**Issue**: Some operations lack proper transaction boundaries
- Folder import creates multiple records without rollback
- Partial failures leave inconsistent state

**Impact**:
- Data integrity risks
- Orphaned records on failures

### 5. Code Duplication (Minor)

**Issue**: Similar patterns repeated:
- File validation
- Path resolution
- Date extraction from folder names
- Error handling

**Impact**:
- Maintenance overhead
- Inconsistent behavior

### 6. Insufficient Error Context (Minor)

**Issue**: Generic error messages without context
- Example: "Folder must be in allowed location"
- Missing: which folder, what base path, why it failed

**Impact**:
- Poor debugging experience
- User confusion

---

## Proposed Structure

### Module Breakdown

```
services/
├── import/
│   ├── ImportService.ts                    [Orchestrator - 200 lines]
│   ├── FileUploadService.ts                [File uploads - 150 lines]
│   ├── FolderImportService.ts              [Folder operations - 250 lines]
│   ├── ImportProcessingService.ts          [Import workflow - 200 lines]
│   ├── PendingOrderPriceService.ts         [Pending prices - 100 lines]
│   ├── ImportSettingsService.ts            [Settings - 80 lines]
│   └── utils/
│       ├── FileSystemHelper.ts             [FS abstraction - 150 lines]
│       ├── FolderScanner.ts                [Recursive scan - 120 lines]
│       ├── DateExtractor.ts                [Date parsing - 60 lines]
│       └── PathValidator.ts                [Path security - 80 lines]
└── (existing services remain)
```

---

## Module Details

### 1. ImportService (Orchestrator)

**Responsibilities**:
- Coordinate import workflows
- Delegate to specialized services
- Handle cross-cutting concerns (events, logging)

**Methods** (simplified):
```typescript
class ImportService {
  constructor(
    private repository: ImportRepository,
    private fileUploadService: FileUploadService,
    private folderImportService: FolderImportService,
    private processingService: ImportProcessingService,
    private settingsService: ImportSettingsService
  ) {}

  // Main API
  async uploadFile(filename: string, buffer: Buffer, mimeType?: string)
  async getAllImports(status?: string)
  async getImportById(id: number)
  async getPreview(id: number)
  async approveImport(id: number, action, replaceBase)
  async processUzyteBeleWithResolution(id, resolution)
  async rejectImport(id: number)
  async deleteImport(id: number)

  // Folder operations (delegates)
  async importFromFolder(folderPath, deliveryNumber, userId)
  async listFolders(userId?)
  async archiveFolder(folderPath, userId?)
  async deleteFolder(folderPath, userId?)
  async scanFolder(folderPath, userId?)
}
```

**Estimated Lines**: ~200 (down from 1350)

---

### 2. FileUploadService

**Responsibilities**:
- Handle file uploads
- Validate uploaded files
- Create import records
- Trigger auto-import for PDFs

**Methods**:
```typescript
class FileUploadService {
  constructor(
    private repository: ImportRepository,
    private pdfAutoImporter: PdfAutoImporter
  ) {}

  async uploadFile(filename: string, buffer: Buffer, mimeType?: string): Promise<UploadResult>
  private determineFileType(filename: string): FileType
  private saveFile(filename: string, buffer: Buffer): Promise<string>
  private createImportRecord(fileData: FileData): Promise<FileImport>
}
```

**Estimated Lines**: ~150

**Dependencies**:
- `file-validation` utils
- `ImportRepository`
- `PdfAutoImporter` (new)

---

### 3. FolderImportService

**Responsibilities**:
- Manage folder-based imports
- Create deliveries from folder dates
- Handle bulk CSV processing
- Archive processed folders

**Methods**:
```typescript
class FolderImportService {
  constructor(
    private repository: ImportRepository,
    private lockService: ImportLockService,
    private folderScanner: FolderScanner,
    private deliveryManager: DeliveryManager,
    private csvProcessor: CsvProcessor,
    private pathValidator: PathValidator,
    private dateExtractor: DateExtractor
  ) {}

  async importFromFolder(folderPath: string, deliveryNumber: 'I'|'II'|'III', userId: number)
  async listFolders(userId?: number)
  async archiveFolder(folderPath: string, userId?: number)
  async deleteFolder(folderPath: string, userId?: number)
  async scanFolder(folderPath: string, userId?: number)

  private async performFolderImport(folderPath, deliveryNumber, userId)
  private async processCsvFiles(csvFiles, delivery)
}
```

**Estimated Lines**: ~250

**Key Improvements**:
- Uses `FolderScanner` for recursive file search
- Uses `DateExtractor` for folder date parsing
- Uses `PathValidator` for security checks
- Transaction boundaries around multi-file imports

---

### 4. ImportProcessingService

**Responsibilities**:
- Process individual imports (CSV/PDF)
- Handle variant resolution
- Update import status
- Manage pending order prices

**Methods**:
```typescript
class ImportProcessingService {
  constructor(
    private repository: ImportRepository,
    private csvParser: CsvParser,
    private pdfParser: PdfParser,
    private variantService: OrderVariantService,
    private pendingPriceService: PendingOrderPriceService
  ) {}

  async processUzyteBele(importId: number, action: Action, replaceBase: boolean)
  async processUzyteBeleWithResolution(importId: number, resolution: VariantResolutionAction)
  async processCenyPdf(importId: number)
  async getPreview(importId: number)
  async previewByFilepath(filepath: string)

  private async executeVariantResolution(resolution, preview, fileImport)
  private async handleCancelResolution(importId)
  private async handleReplaceResolution(importId, fileImport)
  private async handleKeepBothResolution(importId, fileImport)
  private async handleUseLatestResolution(importId, resolution, orderNumber)
}
```

**Estimated Lines**: ~200

**Key Improvements**:
- Clear separation of CSV vs PDF processing
- Variant resolution logic extracted to dedicated methods
- Transaction boundaries for multi-step operations

---

### 5. PendingOrderPriceService

**Responsibilities**:
- Save pending order prices
- Link pending prices to orders when they appear
- Cleanup expired pending prices

**Methods**:
```typescript
class PendingOrderPriceService {
  constructor(private prisma: PrismaClient) {}

  async savePendingPrice(data: PendingPriceData): Promise<PendingOrderPrice>
  async linkPendingPriceToOrder(orderNumber: string, orderId: number): Promise<void>
  async findPendingPrice(orderNumber: string): Promise<PendingOrderPrice | null>
  async cleanupExpired(daysOld: number = 90): Promise<number>
}
```

**Estimated Lines**: ~100

**This service already exists** - reference it in refactored code.

---

### 6. ImportSettingsService

**Responsibilities**:
- Get user-specific settings
- Get global settings
- Manage imports base path logic

**Methods**:
```typescript
class ImportSettingsService {
  constructor(private repository: ImportRepository) {}

  async getImportsBasePath(userId?: number): Promise<string>
  async setUserImportsBasePath(userId: number, path: string): Promise<void>
  async getUserSettings(userId: number): Promise<UserFolderSettings | null>
}
```

**Estimated Lines**: ~80

---

### 7. FileSystemHelper (Utility)

**Responsibilities**:
- Abstract file system operations
- Provide mockable interface
- Handle cross-platform paths

**Methods**:
```typescript
class FileSystemHelper {
  async createDirectory(path: string): Promise<void>
  async writeFile(path: string, buffer: Buffer): Promise<void>
  async copyFile(source: string, dest: string): Promise<void>
  async moveFile(source: string, dest: string): Promise<void>
  async deleteFile(path: string): Promise<void>
  async deleteDirectory(path: string, recursive?: boolean): Promise<void>
  async exists(path: string): Promise<boolean>
  async isDirectory(path: string): Promise<boolean>
  async getStats(path: string): Promise<Stats>
  async readDirectory(path: string): Promise<Dirent[]>
}
```

**Estimated Lines**: ~150

**Key Benefits**:
- Easy to mock in tests
- Consistent error handling
- Can be swapped for S3/cloud storage later

---

### 8. FolderScanner (Utility)

**Responsibilities**:
- Recursively scan folders for CSV files
- Filter by filename patterns
- Return structured results

**Methods**:
```typescript
class FolderScanner {
  constructor(private fileSystem: FileSystemHelper) {}

  async scanForCsvFiles(
    dirPath: string,
    maxDepth?: number
  ): Promise<CsvFileData[]>

  private async scanRecursive(
    dir: string,
    baseDir: string,
    depth: number,
    maxDepth: number
  ): Promise<CsvFileData[]>

  private matchesCsvPattern(filename: string): boolean
}
```

**Estimated Lines**: ~120

---

### 9. DateExtractor (Utility)

**Responsibilities**:
- Extract dates from folder names
- Validate date formats
- Convert to Date objects

**Methods**:
```typescript
class DateExtractor {
  extractFromFolderName(folderName: string): Date | null
  validateDateFormat(dateStr: string): boolean
  parseDDMMYYYY(dateStr: string): Date | null
}
```

**Estimated Lines**: ~60

---

### 10. PathValidator (Utility)

**Responsibilities**:
- Validate paths are within allowed base
- Security checks for path traversal
- Cross-platform path normalization

**Methods**:
```typescript
class PathValidator {
  constructor(private fileSystem: FileSystemHelper) {}

  async validateWithinBasePath(path: string, basePath: string): Promise<void>
  async validateIsDirectory(path: string): Promise<void>
  normalizeAndResolve(path: string): string

  private isWithinBase(path: string, base: string): boolean
}
```

**Estimated Lines**: ~80

---

## Implementation Steps

### Phase 1: Extract Utilities (Week 1, Days 1-2)
**Goal**: Create reusable utilities with no business logic

1. Create `FileSystemHelper.ts`
   - Extract all fs/promises calls
   - Add interface for mocking
   - Write unit tests (80% coverage target)

2. Create `FolderScanner.ts`
   - Extract `findCsvFilesRecursively()`
   - Add tests with mock file system

3. Create `DateExtractor.ts`
   - Extract date parsing logic
   - Add comprehensive tests for various formats

4. Create `PathValidator.ts`
   - Extract path validation logic
   - Add security tests (path traversal, etc.)

**Deliverable**: 4 utility classes with >80% test coverage

**Risk**: LOW - No changes to existing service yet

---

### Phase 2: Extract Settings Service (Week 1, Day 3)
**Goal**: Isolate settings management

1. Create `ImportSettingsService.ts`
   - Move `getImportsBasePath()`
   - Move user settings logic
   - Add tests

2. Update `ImportService` to use new settings service
   - Inject as dependency
   - Update all calls to settings

**Deliverable**: Settings service with tests, ImportService updated

**Risk**: LOW - Settings logic is independent

---

### Phase 3: Extract File Upload Service (Week 1, Days 4-5)
**Goal**: Isolate file upload and auto-import

1. Create `FileUploadService.ts`
   - Move `uploadFile()`
   - Move `autoImportPdf()`
   - Extract file type detection
   - Add tests

2. Create `PdfAutoImporter.ts` (sub-service)
   - Move auto-import logic
   - Handle pending price creation
   - Add tests

3. Update `ImportService`
   - Delegate upload calls
   - Update references

**Deliverable**: File upload service with tests

**Risk**: MEDIUM - Auto-import logic is complex

---

### Phase 4: Extract Import Processing Service (Week 2, Days 1-3)
**Goal**: Isolate core import processing

1. Create `ImportProcessingService.ts`
   - Move `getPreview()`
   - Move `approveImport()`
   - Move `processUzyteBeleWithResolution()`
   - Move `processImport()`
   - Add transaction boundaries
   - Add tests

2. Extract variant resolution handlers
   - Create helper methods for each resolution type
   - Add tests for each strategy

3. Update `ImportService`
   - Delegate to processing service
   - Simplify orchestration

**Deliverable**: Processing service with tests

**Risk**: HIGH - Complex variant resolution logic

---

### Phase 5: Extract Folder Import Service (Week 2, Days 4-5)
**Goal**: Isolate folder operations

1. Create `FolderImportService.ts`
   - Move `importFromFolder()`
   - Move `performFolderImport()`
   - Move `listFolders()`
   - Move `archiveFolder()`
   - Move `deleteFolder()`
   - Move `scanFolder()`
   - Use utility services
   - Add transaction boundaries
   - Add tests

2. Create `DeliveryManager.ts` (helper)
   - Extract delivery creation logic
   - Handle delivery-order associations
   - Add tests

3. Update `ImportService`
   - Delegate folder operations
   - Remove duplicate code

**Deliverable**: Folder import service with tests

**Risk**: HIGH - Multi-step folder import with state changes

---

### Phase 6: Simplify Main Service (Week 3, Day 1)
**Goal**: Reduce ImportService to orchestrator only

1. Review `ImportService`
   - Ensure all heavy lifting delegated
   - Keep only coordination logic
   - Add integration tests

2. Update all handlers
   - Review handler calls to ImportService
   - Ensure no breaking changes

**Deliverable**: Simplified ImportService (<200 lines)

**Risk**: LOW - If previous phases done correctly

---

### Phase 7: Integration Testing (Week 3, Days 2-3)
**Goal**: Ensure all pieces work together

1. Create integration tests
   - Test full upload → process → approve flow
   - Test folder import flow
   - Test variant resolution flows
   - Test error scenarios

2. Performance testing
   - Test with large folders (100+ files)
   - Test concurrent imports with locks
   - Ensure no regressions

**Deliverable**: Integration test suite

**Risk**: MEDIUM - May discover integration issues

---

### Phase 8: Documentation & Migration (Week 3, Days 4-5)
**Goal**: Document changes and create migration guide

1. Update API documentation
2. Create migration guide for handlers
3. Update CLAUDE.md if needed
4. Code review and cleanup

**Deliverable**: Complete documentation

**Risk**: LOW

---

## Breaking Changes

### API Changes (None Expected)
The refactoring maintains the same public API for `ImportService`. All handlers continue to work without changes.

### Internal Changes
- Constructor parameters change (dependency injection)
- Private methods move to new services
- Tests need updates

### Configuration Changes (None)
No environment variables or settings changes needed.

---

## Testing Strategy

### Unit Tests (Target: 85% coverage)

**Per Module**:
```
FileSystemHelper: 100% coverage
  - All file operations
  - Error scenarios
  - Platform-specific behavior

FolderScanner: 95% coverage
  - Recursive scanning
  - Depth limits
  - Pattern matching

DateExtractor: 100% coverage
  - Valid date formats
  - Invalid formats
  - Edge cases

PathValidator: 100% coverage
  - Security checks
  - Path traversal attempts
  - Cross-platform paths

ImportSettingsService: 90% coverage
  - User settings
  - Global fallback
  - Missing settings

FileUploadService: 85% coverage
  - Upload success
  - Validation failures
  - Auto-import triggers

ImportProcessingService: 80% coverage
  - CSV processing
  - PDF processing
  - Variant resolution strategies
  - Error handling

FolderImportService: 80% coverage
  - Folder scanning
  - Delivery creation
  - Multi-file processing
  - Lock handling

ImportService (orchestrator): 75% coverage
  - Integration scenarios
  - Error propagation
```

### Integration Tests

**Critical Flows**:
1. Upload CSV → Preview → Approve → Order created
2. Upload PDF → Auto-import → Price assigned
3. Upload PDF → No order → Pending price saved
4. Folder import → Multiple CSVs → Delivery created
5. Folder import with locks → Concurrent attempts
6. Variant conflict → Resolution → Order updated
7. Import with errors → Rollback → Clean state

### E2E Tests

**User Workflows**:
1. User uploads file via UI → Sees preview → Approves → Order appears
2. User selects folder → Imports → Delivery created with orders
3. Admin configures per-user folders → User sees only their folders

---

## Risk Assessment

### High Risk Areas

1. **Variant Resolution Logic** (Phase 4)
   - **Risk**: Complex state transitions, multiple DB updates
   - **Mitigation**:
     - Extensive unit tests for each resolution type
     - Transaction boundaries
     - Rollback testing
   - **Contingency**: Keep old code commented until confirmed working

2. **Folder Import with Locking** (Phase 5)
   - **Risk**: Race conditions, deadlocks, partial imports
   - **Mitigation**:
     - Lock service handles timeout
     - Transaction for each file
     - Comprehensive error handling
   - **Contingency**: Add retry logic and better error messages

3. **File System Abstraction** (Phase 1)
   - **Risk**: Platform-specific bugs (Windows vs Linux)
   - **Mitigation**:
     - Test on both platforms
     - Use path.normalize() consistently
   - **Contingency**: Add platform-specific workarounds

### Medium Risk Areas

1. **Auto-Import PDF Logic** (Phase 3)
   - **Risk**: Pending price linking failures
   - **Mitigation**: Transaction boundaries, duplicate detection
   - **Contingency**: Manual price assignment UI

2. **Integration Testing** (Phase 7)
   - **Risk**: Tests too slow or flaky
   - **Mitigation**: Mock external dependencies, use test database
   - **Contingency**: Reduce test scope, focus on critical paths

### Low Risk Areas

1. **Utility Extraction** (Phase 1)
   - Pure functions, easy to test
2. **Settings Service** (Phase 2)
   - Simple CRUD operations
3. **Documentation** (Phase 8)
   - No code changes

---

## Success Metrics

### Code Quality Metrics

- **Lines per file**: Target <250 lines (from 1350)
- **Cyclomatic complexity**: Target <10 per method (from 20+)
- **Test coverage**: Target 85%+ (from 15%)
- **Number of responsibilities**: 1 per class (from 6+)

### Performance Metrics

- **Folder import time**: Same or better (no regression)
- **Concurrent imports**: Support 5+ simultaneous (with locks)
- **Memory usage**: No significant increase

### Maintainability Metrics

- **Time to add new import type**: <1 day (vs 3+ days now)
- **Time to understand module**: <30 min per module
- **Code review time**: <2 hours per PR (vs 5+ hours for large changes)

---

## Dependencies & Migration

### Service Dependencies Graph

```
ImportService (orchestrator)
  ├─> FileUploadService
  │     ├─> ImportRepository
  │     ├─> PdfAutoImporter
  │     └─> file-validation
  │
  ├─> FolderImportService
  │     ├─> ImportRepository
  │     ├─> ImportLockService
  │     ├─> FolderScanner
  │     ├─> DeliveryManager
  │     ├─> CsvProcessor
  │     ├─> PathValidator
  │     └─> DateExtractor
  │
  ├─> ImportProcessingService
  │     ├─> ImportRepository
  │     ├─> CsvParser
  │     ├─> PdfParser
  │     ├─> OrderVariantService
  │     └─> PendingOrderPriceService
  │
  └─> ImportSettingsService
        └─> ImportRepository

Utilities (shared):
  ├─> FileSystemHelper
  ├─> FolderScanner
  ├─> DateExtractor
  └─> PathValidator
```

### Backward Compatibility

**Handlers remain unchanged**:
```typescript
// importHandler.ts - NO CHANGES NEEDED
async uploadFile(request, reply) {
  // Still calls importService.uploadFile()
  const result = await this.importService.uploadFile(...)
  return result
}
```

**Migration checklist**:
- [ ] Update ImportService constructor in dependency injection
- [ ] Update tests to use new structure
- [ ] Update mocks to use new services
- [ ] No handler changes needed
- [ ] No API changes needed

---

## Next Steps

1. **Get approval** for this refactoring plan
2. **Create feature branch**: `refactor/import-service-split`
3. **Start Phase 1**: Extract utilities (2 days)
4. **Daily standup**: Review progress, adjust plan
5. **PR per phase**: Smaller PRs for easier review
6. **Monitor metrics**: Track coverage, complexity

---

## Appendix: Code Examples

### Before (Current)

```typescript
// importService.ts - 1350 lines
class ImportService {
  async importFromFolder(folderPath: string, deliveryNumber: 'I' | 'II' | 'III', userId: number) {
    // 210 lines of mixed concerns:
    // - Path validation
    // - Lock acquisition
    // - Date extraction
    // - File scanning
    // - Delivery creation
    // - CSV processing
    // - Archive operations
    // - Error handling
  }
}
```

### After (Refactored)

```typescript
// ImportService.ts - 200 lines (orchestrator)
class ImportService {
  constructor(
    private folderImportService: FolderImportService,
    private settingsService: ImportSettingsService,
    // ... other services
  ) {}

  async importFromFolder(folderPath: string, deliveryNumber: 'I' | 'II' | 'III', userId: number) {
    // Validate permissions and settings
    const basePath = await this.settingsService.getImportsBasePath(userId)

    // Delegate to specialized service
    const result = await this.folderImportService.importFromFolder(
      folderPath,
      deliveryNumber,
      userId,
      basePath
    )

    // Emit events
    emitImportCompleted(result)

    return result
  }
}

// FolderImportService.ts - 250 lines (focused)
class FolderImportService {
  async importFromFolder(folderPath, deliveryNumber, userId, basePath) {
    // Validate path
    await this.pathValidator.validateWithinBasePath(folderPath, basePath)

    // Acquire lock
    const lock = await this.lockService.acquireLock(folderPath, userId)

    try {
      // Extract date
      const date = this.dateExtractor.extractFromFolderName(folderPath)

      // Scan for files
      const csvFiles = await this.folderScanner.scanForCsvFiles(folderPath)

      // Create or find delivery
      const delivery = await this.deliveryManager.findOrCreate(date, deliveryNumber)

      // Process files in transaction
      const results = await this.processCsvFiles(csvFiles, delivery)

      // Archive folder
      await this.archiveFolder(folderPath)

      return { delivery, results }
    } finally {
      await this.lockService.releaseLock(lock.id)
    }
  }
}
```

**Benefits of refactored version**:
- Clear separation of concerns
- Easy to test each service in isolation
- Can replace file system with S3 by swapping FileSystemHelper
- Transaction boundaries explicit
- Lock handling in try/finally ensures cleanup
- Each class < 250 lines

---

## Conclusion

This refactoring plan transforms a monolithic 1350-line service into 10 focused, testable modules. The work is broken into 8 phases over 3 weeks, with clear milestones and risk mitigation strategies.

**Expected Benefits**:
- 85%+ test coverage (from 15%)
- <250 lines per file (from 1350)
- Easier to maintain and extend
- Better error handling
- Clearer architecture

**Next Action**: Approve plan and start Phase 1 (utility extraction).
