# Import Parsers - Phase 3 Refactoring

## Overview

This module contains refactored parser services extracted from the monolithic `CsvParser` and `PdfParser` classes. Each parser now has a dedicated service with improved:

- Error handling
- Type safety
- Testability
- Separation of concerns

## IMPORTANT: Feature Flags

**New parsers are DISABLED by default!**

This is a HIGH RISK refactoring area. Parsers are core to the import functionality and any bugs could break imports for users.

### Enabling New Parsers

Set environment variables to enable new parsers:

```bash
# Enable all new parsers at once
ENABLE_NEW_PARSERS=true

# Or enable individually
ENABLE_NEW_CSV_PARSER=true
ENABLE_NEW_PDF_PARSER=true
ENABLE_NEW_EXCEL_PARSER=true
```

### Recommended Rollout Strategy

1. **Development Testing**
   - Enable in development environment first
   - Run all tests with new parsers enabled
   - Test with 50+ real import files

2. **Staging Validation**
   - Enable in staging environment
   - Compare old vs new parser outputs
   - Validate no regressions

3. **Production Rollout**
   - Enable for a subset of users first
   - Monitor for errors
   - Gradual rollout to all users

## Rollback Plan

If issues are discovered after enabling new parsers:

### Immediate Rollback

```bash
# Disable all new parsers
ENABLE_NEW_PARSERS=false

# Or disable individually
ENABLE_NEW_CSV_PARSER=false
ENABLE_NEW_PDF_PARSER=false
ENABLE_NEW_EXCEL_PARSER=false
```

No code changes required - just update environment variables and restart the application.

### Rollback Verification

After rollback, verify:
1. Imports are working correctly
2. No errors in logs
3. New imports succeed
4. Existing data is intact

## Architecture

```
parsers/
├── index.ts              # Main exports and factory functions
├── types.ts              # Shared type definitions
├── feature-flags.ts      # Feature flag management
├── csvImportService.ts   # CSV parser (uzyte bele files)
├── pdfImportService.ts   # PDF parser (price files)
├── excelImportService.ts # Excel parser (placeholder)
└── README.md             # This file
```

### Service Interfaces

All parsers implement standard interfaces:

```typescript
interface ICsvImportService {
  parseEurAmountFromSchuco(amountStr: string): number | null;
  parseOrderNumber(orderNumber: string): OrderNumberParsed;
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string };
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number };
  previewUzyteBele(filepath: string): Promise<ParsedUzyteBele>;
  processUzyteBele(filepath: string, action: 'overwrite' | 'add_new', replaceBase?: boolean): Promise<CsvProcessResult>;
}

interface IPdfImportService {
  previewCenyPdf(filepath: string): Promise<ParsedPdfCeny>;
  processCenyPdf(filepath: string): Promise<PdfProcessResult>;
}
```

### Factory Functions

Use factory functions to get the appropriate parser based on feature flags:

```typescript
import { getCsvParser, getPdfParser } from './parsers';

// Returns either new CsvImportService or legacy CsvParser
const csvParser = getCsvParser(prisma);

// Returns either new PdfImportService or legacy PdfParser
const pdfParser = getPdfParser(prisma);
```

## Testing

### Running Tests

```bash
# Run parser tests only
pnpm test -- --filter="parsers"

# Run with coverage
pnpm test:coverage -- --filter="parsers"
```

### Parity Testing

The test files include parity tests that compare old vs new parser behavior:

```typescript
// In csvImportService.test.ts
describe('CsvImportService vs CsvParser Parity', () => {
  it.each(testCases)('produces identical results for $input', ({ input, expected }) => {
    const newResult = newService.method(input);
    const legacyResult = legacyParser.method(input);
    expect(newResult).toEqual(legacyResult);
  });
});
```

### Testing with Real Files

Before enabling in production, test with real import files:

1. Collect 50+ real CSV files from production
2. Run both old and new parsers
3. Compare outputs
4. Document any differences

## Migration Path

### Current State

- Legacy parsers (`CsvParser`, `PdfParser`) in `services/parsers/`
- New parsers in `services/import/parsers/`
- Feature flags control which parser is used

### Future State (after validation)

1. Enable new parsers by default
2. Deprecate legacy parsers
3. Remove legacy parsers after deprecation period

### Timeline

1. **Phase 1** (current): New parsers behind feature flags
2. **Phase 2** (after testing): Enable by default in dev/staging
3. **Phase 3** (after validation): Enable by default in production
4. **Phase 4** (after stabilization): Remove legacy parsers

## Troubleshooting

### Parser Output Differences

If new and old parsers produce different outputs:

1. Check the specific method that differs
2. Compare input data
3. Check for edge cases in parsing logic
4. File a bug report with test case

### Import Failures

If imports fail after enabling new parsers:

1. Check error logs for specific error message
2. Identify the failing file
3. Test the file with old parser
4. Rollback if needed
5. Fix the issue in new parser
6. Add test case for the edge case

### Performance Issues

If new parsers are slower:

1. Profile the slow method
2. Check for unnecessary database calls
3. Optimize as needed
4. Consider enabling debug mode for details

```bash
# Enable debug logging
DEBUG=akrobud:parsers pnpm dev:api
```

## Contact

For issues with this refactoring:
- File issue in project repository
- Include test case if possible
- Note whether rollback was needed
