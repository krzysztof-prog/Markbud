# Import Service Architecture Diagrams

## Current Architecture (Before Refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ImportService (1350 lines)                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ File Upload & Management                                 │  │
│  │ - uploadFile()                                           │  │
│  │ - getImportById()                                        │  │
│  │ - getAllImports()                                        │  │
│  │ - deleteImport()                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CSV Processing                                           │  │
│  │ - processUzyteBeleImport()                               │  │
│  │ - processUzyteBeleWithResolution()                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PDF Processing                                           │  │
│  │ - autoImportPdf()                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Folder Operations                                        │  │
│  │ - importFromFolder()                                     │  │
│  │ - performFolderImport()                                  │  │
│  │ - listFolders()                                          │  │
│  │ - scanFolder()                                           │  │
│  │ - archiveFolder()                                        │  │
│  │ - findCsvFilesRecursively()                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Validation & Conflict Detection                          │  │
│  │ - getPreview()                                           │  │
│  │ - previewByFilepath()                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Variant Resolution                                       │  │
│  │ - processImport()                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ depends on
                          ▼
    ┌──────────────────────────────────────────────────┐
    │                                                   │
    │  CsvParser    PdfParser    OrderVariantService   │
    │  ImportLockService    ImportRepository           │
    │  prisma (direct)    event-emitter               │
    │                                                   │
    └──────────────────────────────────────────────────┘

PROBLEMS:
✗ 1350 lines (God Object)
✗ 30+ public methods
✗ 5+ mixed responsibilities
✗ Hard to test
✗ High cyclomatic complexity
✗ Tight coupling
```

---

## Proposed Architecture (After Refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│                ImportOrchestrationService (250 lines)           │
│                                                                  │
│  Public API (Route Handlers use these):                        │
│  ✓ uploadFile()           ✓ getPreview()                       │
│  ✓ getAllImports()        ✓ approveImport()                    │
│  ✓ getImportById()        ✓ rejectImport()                     │
│  ✓ deleteImport()         ✓ importFromFolder()                 │
│                                                                  │
│  Role: Orchestration & Delegation ONLY                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ delegates to
                          ▼
    ┌─────────────────────────────────────────────────┐
    │                                                  │
    │         ┌──────────────────────────┐            │
    │         │  CsvImportService        │            │
    │         │  (200 lines)             │            │
    │         │                          │            │
    │         │  • importCsv()           │            │
    │         │  • parseAndPreview()     │            │
    │         │  • validateStructure()   │            │
    │         │  • assignToDelivery()    │            │
    │         └──────────────────────────┘            │
    │                                                  │
    │         ┌──────────────────────────┐            │
    │         │  PdfImportService        │            │
    │         │  (200 lines)             │            │
    │         │                          │            │
    │         │  • autoImport()          │            │
    │         │  • importPdf()           │            │
    │         │  • handlePendingPrice()  │            │
    │         │  • checkDuplicate()      │            │
    │         └──────────────────────────┘            │
    │                                                  │
    │         ┌──────────────────────────┐            │
    │         │  ImportValidationService │            │
    │         │  (250 lines)             │            │
    │         │                          │            │
    │         │  • validateFile()        │            │
    │         │  • detectConflicts()     │            │
    │         │  • validateStructure()   │            │
    │         │  • formatPreview()       │            │
    │         └──────────────────────────┘            │
    │                                                  │
    │         ┌──────────────────────────┐            │
    │         │  FolderImportService     │            │
    │         │  (300 lines)             │            │
    │         │                          │            │
    │         │  • importFolder()        │            │
    │         │  • scanFolder()          │            │
    │         │  • listFolders()         │            │
    │         │  • archiveFolder()       │            │
    │         │  • findCsvFiles()        │            │
    │         └──────────────────────────┘            │
    │                                                  │
    │         ┌──────────────────────────┐            │
    │         │ ImportConflictService    │            │
    │         │ (200 lines)              │            │
    │         │                          │            │
    │         │  • resolveConflict()     │            │
    │         │  • applyReplaceStrategy()│            │
    │         │  • applyMergeStrategy()  │            │
    │         │  • applyUseLatest()      │            │
    │         └──────────────────────────┘            │
    │                                                  │
    └─────────────────────────────────────────────────┘
                          │
                          │ uses
                          ▼
    ┌────────────────────────────────────────────────┐
    │           Repository Layer (Focused)           │
    │                                                │
    │  ┌──────────────┐  ┌──────────────┐          │
    │  │ ImportRepo   │  │ OrderRepo    │          │
    │  │ (150 lines)  │  │ (200 lines)  │          │
    │  └──────────────┘  └──────────────┘          │
    │                                                │
    │  ┌──────────────┐                             │
    │  │ DeliveryRepo │                             │
    │  │ (200 lines)  │                             │
    │  └──────────────┘                             │
    │                                                │
    └────────────────────────────────────────────────┘
                          │
                          │ accesses
                          ▼
                   ┌──────────────┐
                   │   Prisma     │
                   │   Database   │
                   └──────────────┘

BENEFITS:
✓ Single Responsibility per service
✓ ~200-300 lines per service
✓ Easy to test in isolation
✓ Clear dependencies
✓ Low cyclomatic complexity
✓ Loose coupling
```

---

## Data Flow Diagrams

### Flow 1: CSV File Upload & Preview

```
┌──────────┐
│  User    │
│  Upload  │
└─────┬────┘
      │
      │ POST /api/imports/upload
      ▼
┌─────────────────────────────────────┐
│  ImportOrchestrationService         │
│  uploadFile(filename, buffer)       │
└──────────┬──────────────────────────┘
           │
           │ 1. Validate
           ▼
    ┌──────────────────────────┐
    │ ImportValidationService  │
    │ validateFile()           │
    └──────────┬───────────────┘
               │
               │ 2. Save file & create record
               ▼
         ┌─────────────┐
         │ ImportRepo  │
         │ create()    │
         └──────┬──────┘
                │
                │ FileImport created
                ▼
    ┌───────────────────────────┐
    │  Return to user           │
    │  { fileImport, status }   │
    └───────────────────────────┘

    User clicks "Preview"
    GET /api/imports/:id/preview
               │
               ▼
    ┌──────────────────────────────┐
    │ ImportOrchestrationService   │
    │ getPreview(id)               │
    └──────────┬───────────────────┘
               │
               │ Delegate based on file type
               ▼
    ┌──────────────────────────────┐
    │ ImportValidationService      │
    │ validateAndPreview()         │
    └──────────┬───────────────────┘
               │
               │ Parse CSV
               ▼
         ┌──────────┐
         │ CsvParser│
         │ preview()│
         └────┬─────┘
              │
              │ Check for conflicts
              ▼
    ┌─────────────────────┐
    │ OrderVariantService │
    │ detectConflicts()   │
    └──────────┬──────────┘
               │
               │ Return preview data
               ▼
    ┌────────────────────────────┐
    │ UI displays:               │
    │ • Order details            │
    │ • Requirements             │
    │ • Windows                  │
    │ • Variant conflicts (if)   │
    └────────────────────────────┘
```

---

### Flow 2: CSV Import with Variant Conflict Resolution

```
User approves import with resolution
POST /api/imports/:id/approve-with-resolution
            │
            ▼
┌────────────────────────────────┐
│ ImportOrchestrationService     │
│ processWithResolution()        │
└──────────┬─────────────────────┘
           │
           │ Delegate to conflict service
           ▼
    ┌──────────────────────────┐
    │ ImportConflictService    │
    │ resolveConflict()        │
    └──────────┬───────────────┘
               │
               │ Apply strategy (e.g., "use_latest")
               │
               │ 1. Delete older variants?
               ▼
         ┌────────────┐
         │ OrderRepo  │
         │ delete()   │
         └──────┬─────┘
                │
                │ 2. Import CSV
                ▼
    ┌────────────────────────┐
    │ CsvImportService       │
    │ importCsv()            │
    └──────────┬─────────────┘
               │
               │ 3. Process via parser
               ▼
         ┌──────────┐
         │ CsvParser│
         │ process()│
         └────┬─────┘
              │
              │ Transaction: Create Order + Requirements + Windows
              ▼
         ┌─────────────┐
         │   Prisma    │
         │ Transaction │
         └──────┬──────┘
                │
                │ 4. Emit events
                ▼
         ┌────────────────┐
         │ EventEmitter   │
         │ orderUpdated() │
         └────────────────┘
```

---

### Flow 3: Folder Batch Import

```
User imports folder
POST /api/imports/folder
      │
      │ { folderPath, deliveryNumber, userId }
      ▼
┌──────────────────────────────┐
│ ImportOrchestrationService   │
│ importFromFolder()           │
└──────────┬───────────────────┘
           │
           │ Delegate to folder service
           ▼
    ┌──────────────────────────┐
    │ FolderImportService      │
    │ importFolder()           │
    └──────────┬───────────────┘
               │
               │ 1. Acquire lock (prevent concurrent)
               ▼
         ┌────────────────┐
         │ ImportLockSvc  │
         │ acquireLock()  │
         └────────┬───────┘
                  │
                  │ 2. Extract date from folder name
                  │ 3. Find/create delivery
                  ▼
            ┌───────────────┐
            │ DeliveryRepo  │
            │ findOrCreate()│
            └────────┬──────┘
                     │
                     │ 4. Find CSV files recursively
                     ▼
              ┌─────────────────┐
              │ File System     │
              │ readdir()       │
              └────────┬────────┘
                       │
                       │ 5. Process each CSV
                       ▼
            ┌───────────────────────┐
            │ For each CSV file:    │
            │                       │
            │  • Check duplicates   │
            │  • Copy to uploads    │
            │  • Create import rec  │
            │  • Process CSV        │
            │  • Add to delivery    │
            └───────────┬───────────┘
                        │
                        │ 6. Archive folder on success
                        ▼
                 ┌──────────────┐
                 │ File System  │
                 │ rename()     │
                 └──────┬───────┘
                        │
                        │ 7. Release lock (ALWAYS)
                        ▼
                  ┌────────────────┐
                  │ ImportLockSvc  │
                  │ releaseLock()  │
                  └────────────────┘
```

---

### Flow 4: PDF Auto-Import

```
User uploads PDF price file
POST /api/imports/upload
      │
      ▼
┌──────────────────────────────┐
│ ImportOrchestrationService   │
│ uploadFile()                 │
└──────────┬───────────────────┘
           │
           │ Detect file type = 'ceny_pdf'
           │ Trigger auto-import
           ▼
    ┌──────────────────────┐
    │ PdfImportService     │
    │ autoImport()         │
    └──────────┬───────────┘
               │
               │ 1. Parse PDF
               ▼
         ┌──────────┐
         │ PdfParser│
         │ preview()│
         └────┬─────┘
              │
              │ Extract: orderNumber, currency, value
              │
              │ 2. Check if order exists
              ▼
         ┌────────────┐
         │ OrderRepo  │
         │ findByNum()│
         └──────┬─────┘
                │
                ├─── Order NOT found
                │    │
                │    │ 3a. Save as PendingOrderPrice
                │    ▼
                │    ┌──────────────────────────┐
                │    │ prisma.pendingOrderPrice │
                │    │ create()                 │
                │    └────────────┬─────────────┘
                │                 │
                │                 │ Will auto-apply when order is created
                │                 ▼
                │          ┌────────────────┐
                │          │ Status: pending│
                │          └────────────────┘
                │
                └─── Order found
                     │
                     │ 3b. Check for duplicates
                     ▼
               ┌────────────┐
               │ ImportRepo │
               │ findDupe() │
               └──────┬─────┘
                      │
                      ├─── Duplicate found
                      │    │
                      │    │ Mark as pending (requires manual approval)
                      │    ▼
                      │    ┌──────────────────┐
                      │    │ Status: pending  │
                      │    │ (user reviews)   │
                      │    └──────────────────┘
                      │
                      └─── No duplicate
                           │
                           │ 4. Apply price immediately
                           ▼
                     ┌────────────┐
                     │ OrderRepo  │
                     │ update()   │
                     └──────┬─────┘
                            │
                            │ Set valueEur or valuePln
                            ▼
                     ┌────────────────┐
                     │ Status:        │
                     │ completed      │
                     └────────────────┘
```

---

## Service Dependencies Graph

```
                    ┌────────────────────────┐
                    │ Route Handlers         │
                    │ (imports.ts)           │
                    └──────────┬─────────────┘
                               │
                               │ uses
                               ▼
         ┌─────────────────────────────────────────┐
         │  ImportOrchestrationService             │
         └──┬────────┬────────┬────────┬───────┬───┘
            │        │        │        │       │
            │        │        │        │       │
   ┌────────▼──┐  ┌─▼──────┐ │  ┌─────▼─┐   ┌─▼────────┐
   │CsvImport  │  │PdfImport│ │  │Folder │   │Conflict  │
   │Service    │  │Service  │ │  │Import │   │Service   │
   └────┬──────┘  └───┬─────┘ │  │Service│   └────┬─────┘
        │             │        │  └───┬───┘        │
        │             │        │      │            │
        │             │        ▼      │            │
        │             │   ┌────────────────┐      │
        │             │   │ Validation     │      │
        │             │   │ Service        │      │
        │             │   └────────┬───────┘      │
        │             │            │              │
        │             │            │ uses         │
        └─────────────┴────────────▼──────────────┘
                                   │
                      ┌────────────┴────────────┐
                      │                         │
                ┌─────▼──────┐           ┌─────▼────────┐
                │ CsvParser  │           │OrderVariant  │
                │ (existing) │           │Service       │
                └────────────┘           │(existing)    │
                                         └──────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   ┌────▼──────┐  ┌────────────┐   │
   │ImportRepo │  │OrderRepo   │   │
   └─────┬─────┘  └──────┬─────┘   │
         │               │          │
         └───────────────┴──────────┘
                         │
                    ┌────▼─────┐
                    │ Prisma   │
                    │ Database │
                    └──────────┘

Legend:
  ──▶  Direct dependency
  ━━▶  Uses/calls
```

---

## Module Interaction Matrix

| Service | Depends On | Used By | Responsibility |
|---------|-----------|---------|----------------|
| **ImportOrchestrationService** | All other services | Route handlers | API orchestration, delegation |
| **CsvImportService** | CsvParser, ImportRepo, OrderRepo, DeliveryRepo | Orchestrator, FolderService | CSV file processing |
| **PdfImportService** | PdfParser, ImportRepo, OrderRepo, Prisma | Orchestrator | PDF file processing |
| **ImportValidationService** | OrderVariantService, ImportRepo | Orchestrator, FolderService | Validation, conflict detection |
| **FolderImportService** | CsvImportService, ValidationService, LockService, DeliveryRepo | Orchestrator | Batch folder import |
| **ImportConflictService** | CsvImportService, OrderVariantService, OrderRepo | Orchestrator | Variant conflict resolution |

---

## File System Structure (After Refactoring)

```
apps/api/src/
├── services/
│   ├── import/
│   │   ├── importOrchestrationService.ts   (250 lines) ⭐ Main entry
│   │   ├── csvImportService.ts             (200 lines)
│   │   ├── pdfImportService.ts             (200 lines)
│   │   ├── importValidationService.ts      (250 lines)
│   │   ├── folderImportService.ts          (300 lines)
│   │   ├── importConflictService.ts        (200 lines)
│   │   └── types/
│   │       ├── import-types.ts             (interfaces)
│   │       └── import-enums.ts             (enums)
│   │
│   ├── parsers/
│   │   ├── csv-parser.ts                   (existing)
│   │   └── pdf-parser.ts                   (existing)
│   │
│   ├── orderVariantService.ts              (existing)
│   ├── importLockService.ts                (existing)
│   └── event-emitter.ts                    (existing)
│
├── repositories/
│   ├── ImportRepository.ts                 (150 lines) ♻️ Refactored
│   ├── OrderRepository.ts                  (200 lines) 🆕 New/Extended
│   └── DeliveryRepository.ts               (200 lines) 🆕 Extended
│
├── routes/
│   └── imports.ts                          (updated imports)
│
└── handlers/
    └── importHandler.ts                    (updated to use orchestrator)
```

---

## Testing Architecture

```
Unit Tests (Isolated)
├── CsvImportService.test.ts
│   ├── Mock: CsvParser
│   ├── Mock: ImportRepository
│   ├── Mock: OrderRepository
│   └── Test: CSV import logic
│
├── PdfImportService.test.ts
│   ├── Mock: PdfParser
│   ├── Mock: ImportRepository
│   ├── Mock: OrderRepository
│   └── Test: PDF import logic
│
├── ImportValidationService.test.ts
│   ├── Mock: OrderVariantService
│   ├── Mock: ImportRepository
│   └── Test: Validation logic
│
├── FolderImportService.test.ts
│   ├── Mock: File System
│   ├── Mock: ImportLockService
│   ├── Mock: CsvImportService
│   └── Test: Folder operations
│
└── ImportConflictService.test.ts
    ├── Mock: OrderVariantService
    ├── Mock: OrderRepository
    └── Test: Conflict resolution strategies

Integration Tests
├── CSV Import Flow
│   ├── Real: ImportRepository
│   ├── Real: OrderRepository
│   ├── Mock: CsvParser
│   ├── Test DB: SQLite in-memory
│   └── Verify: Order + Requirements created
│
├── PDF Import Flow
│   ├── Real: Repositories
│   ├── Mock: PdfParser
│   ├── Test DB: SQLite in-memory
│   └── Verify: Price updated or pending created
│
└── Folder Import Flow
    ├── Real: All services
    ├── Mock: File System
    ├── Test DB: SQLite in-memory
    └── Verify: Multiple orders + delivery created

E2E Tests
└── API Endpoint Tests
    ├── POST /api/imports/upload
    ├── GET /api/imports/:id/preview
    ├── POST /api/imports/:id/approve
    └── POST /api/imports/folder
```

---

## Migration Phases Visualization

```
Phase 1: Foundation (2-3 days)
├── Create directory structure
├── Define types & enums
├── Replace string literals
└── ✅ No breaking changes

Phase 2: Repositories (2-3 days)
├── Split ImportRepository
├── Extract OrderRepository methods
├── Extract DeliveryRepository methods
└── ✅ No breaking changes (internal)

Phase 3: Core Services (4-5 days)
├── Create CsvImportService
├── Create PdfImportService
├── Create ImportValidationService
└── Update orchestrator to delegate
    ✅ No breaking changes (internal)

Phase 4: Folder Operations (3-4 days)
├── Create FolderImportService
├── Move folder scanning logic
├── Move archiving logic
└── Update orchestrator
    ✅ No breaking changes

Phase 5: Conflict Resolution (2-3 days)
├── Create ImportConflictService
├── Extract variant resolution strategies
└── Update orchestrator
    ✅ No breaking changes

Phase 6: Orchestrator Cleanup (2-3 days)
├── Remove all delegated code
├── Keep only orchestration logic
├── Rename to ImportOrchestrationService
└── Update route handlers
    ⚠️  Internal import changes only

Phase 7: Testing & Docs (2-3 days)
├── Write unit tests (90% coverage)
├── Write integration tests
├── Write E2E tests
└── Update documentation

Total: 17-24 days (3.5 - 5 weeks)
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Companion Document:** import-service-refactor-plan-2025-12-30.md
