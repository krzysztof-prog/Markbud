# ImportService - OrderVariantService Integration

**Date:** 2025-12-29
**File:** `apps/api/src/services/importService.ts`

## Summary

Successfully integrated OrderVariantService into ImportService to detect and resolve order variant conflicts during import preview and processing.

## Changes Made

### 1. Service Initialization

Added OrderVariantService as a private member and initialized it in constructor:

```typescript
export class ImportService {
  private variantService: OrderVariantService;

  constructor(private repository: ImportRepository) {
    this.variantService = new OrderVariantService(prisma);
  }
}
```

### 2. Enhanced Preview Method (`getPreview`)

Updated to include variant conflict detection:

**Before:**
- Simply returned parsed preview data from CsvParser

**After:**
- Calls `OrderVariantService.detectConflicts()` for 'uzyte_bele' files
- Returns preview with `variantConflict` field containing:
  - Conflict type (base_exists, variant_exists, multiple_variants)
  - Existing orders information
  - Comparison metrics (window/sash/glass count differences)
  - AI-driven recommendation (merge, replace_base, use_latest, keep_both, manual)
  - Reasoning text explaining the recommendation
- Gracefully handles detection errors by logging and returning preview without conflict info

### 3. New Method: `processUzyteBeleWithResolution`

Implements comprehensive variant resolution logic:

```typescript
async processUzyteBeleWithResolution(
  id: number,
  resolution: VariantResolutionAction
): Promise<{ success: boolean; result: unknown }>
```

**Supported Resolution Actions:**

#### a. `replace` - Replace Existing Order
- Uses `replaceBase=true` flag
- Overwrites the base order with new data
- Preserves order ID and delivery associations

#### b. `keep_both` - Keep Both Variants
- Uses `add_new` action with `replaceBase=false`
- Creates new order with full variant number (e.g., "53335-a")
- Both orders exist independently

#### c. `use_latest` - Use Latest Version
- Optionally deletes older variants first
- Performs transactional deletion of:
  - Order requirements
  - Order windows
  - Delivery associations
  - The orders themselves
- Imports new order after cleanup
- Ensures data integrity with Prisma transactions

#### d. `merge` - Merge Variants (Placeholder)
- Currently logs warning and falls back to `add_new`
- Reserved for future implementation of requirement merging

#### e. `cancel` - Cancel Import
- Marks import as rejected
- Stores cancellation metadata
- Returns success: false

**Error Handling:**
- Validates import status (must be 'pending')
- Updates import status through lifecycle: pending → processing → completed/error
- Comprehensive logging at each step
- Stores resolution type in metadata for audit trail

### 4. Enhanced Folder Scanning (`scanFolder`)

Updated to detect variant conflicts during folder preview:

**Before:**
- Only checked for existing delivery assignments

**After:**
- Also checks for variant conflicts for each CSV file
- Returns `variantConflict` field with:
  - `hasConflict`: boolean
  - `conflictType`: string (optional)
  - `recommendation`: string (optional)
- Gracefully handles detection errors per file
- Allows UI to show conflict warnings before import

## Implementation Details

### Transaction Safety
The `use_latest` resolution uses Prisma transactions to ensure atomic deletion:

```typescript
await prisma.$transaction(async (tx) => {
  // Delete requirements
  await tx.orderRequirement.deleteMany({ where: { orderId } });
  // Delete windows
  await tx.orderWindow.deleteMany({ where: { orderId } });
  // Delete delivery associations
  await tx.deliveryOrder.deleteMany({ where: { orderId } });
  // Delete order
  await tx.order.delete({ where: { id: orderId } });
});
```

### Logging
Comprehensive logging at key decision points:
- Resolution type selected
- Orders being deleted
- Import completion status
- Error conditions

### Metadata Storage
Resolution metadata is stored in the FileImport record for audit purposes:
```typescript
{
  resolutionType: 'replace' | 'keep_both' | 'use_latest' | 'merge' | 'cancel',
  targetOrderNumber?: string,
  cancelledAt?: string,
  // ... existing import metadata
}
```

## API Surface

### Updated Methods

1. **`getPreview(id: number)`**
   - Returns: Preview with optional `variantConflict` field
   - Use case: Show conflict warning in UI before import

2. **New: `processUzyteBeleWithResolution(id: number, resolution: VariantResolutionAction)`**
   - Returns: `{ success: boolean; result: unknown }`
   - Use case: Process import with user-selected resolution strategy

3. **`scanFolder(folderPath: string)`**
   - Returns: Folder info with variant conflicts for each CSV
   - Use case: Bulk import preview with conflict detection

## Usage Example

```typescript
// 1. Preview import to detect conflicts
const preview = await importService.getPreview(importId);

if (preview.variantConflict) {
  console.log('Conflict detected:', preview.variantConflict.type);
  console.log('Recommendation:', preview.variantConflict.recommendation);
  console.log('Reasoning:', preview.variantConflict.reasoning);

  // 2. Let user choose resolution, then process
  const resolution: VariantResolutionAction = {
    type: 'use_latest',
    deleteOlder: true
  };

  const result = await importService.processUzyteBeleWithResolution(
    importId,
    resolution
  );
}
```

## Type Definitions

```typescript
export type VariantResolutionAction =
  | { type: 'merge'; targetOrderNumber: string }
  | { type: 'replace'; targetOrderNumber: string }
  | { type: 'use_latest'; deleteOlder: boolean }
  | { type: 'keep_both' }
  | { type: 'cancel' };
```

## Testing Considerations

### Unit Tests Needed
1. `getPreview()` with variant conflicts
2. `processUzyteBeleWithResolution()` for each resolution type
3. Transaction rollback on error in `use_latest`
4. Error handling when variant service fails

### Integration Tests Needed
1. Full flow: upload → preview → resolve → process
2. Folder import with multiple variant conflicts
3. Edge cases: missing orders, invalid resolutions

### Manual Testing Scenarios
1. Import order 53335, then 53335-a (base exists)
2. Import 53335-a, then 53335-b (variant exists)
3. Import with 3+ variants (multiple_variants)
4. Test each resolution action
5. Verify delivery associations preserved/updated correctly

## Next Steps

1. **Frontend Integration:**
   - Update import preview UI to show variant conflicts
   - Add resolution selection dialog
   - Call new `processUzyteBeleWithResolution` endpoint

2. **API Route:**
   - Add POST `/api/imports/:id/resolve` endpoint
   - Accept VariantResolutionAction in request body
   - Call `processUzyteBeleWithResolution` method

3. **Validation:**
   - Add Zod schema for VariantResolutionAction
   - Validate resolution type and parameters

4. **Complete Merge Implementation:**
   - Implement actual requirement merging logic
   - Handle window count aggregation
   - Update delivery associations appropriately

## Files Modified

- ✅ `apps/api/src/services/importService.ts` - All changes implemented
- 🔲 `apps/api/src/handlers/importHandler.ts` - Needs resolve endpoint
- 🔲 `apps/api/src/routes/imports.ts` - Needs route registration
- 🔲 `apps/api/src/validators/imports.ts` - Needs resolution validator
- 🔲 Frontend import components - Need UI for conflict resolution

## Breaking Changes

None. All changes are additive:
- Existing `getPreview()` returns same data + optional variantConflict field
- New method `processUzyteBeleWithResolution()` doesn't affect existing flows
- `scanFolder()` returns same data + optional variantConflict field
