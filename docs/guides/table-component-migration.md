# Table Component Migration Guide

**Date:** 2025-12-18
**Status:** Completed (FAZA 3 - Task #15)

## Summary

The three separate table components (`DataTable`, `SimpleTable`, `StickyTable`) have been consolidated into a single unified `Table` component that supports all features.

## Changes

### Old Components (Deprecated)
- `DataTable` - Generic table with sticky header, zebra stripes, hover
- `SimpleTable` - Compact table for modals
- `StickyTable` - Table with sticky columns (left/right)

### New Component (Recommended)
- `Table` - Unified component with all features + options

## Migration Examples

### 1. DataTable → Table

**Before:**
```tsx
import { DataTable } from '@/components/tables';

<DataTable
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
  maxHeight="600px"
  stickyHeader={true}
  zebraStripes={true}
  hoverEffect={true}
/>
```

**After:**
```tsx
import { Table } from '@/components/tables';

<Table
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
  maxHeight="600px"
  stickyHeader={true}
  zebraStripes={true}
  hoverEffect={true}
/>
```

**Result:** Drop-in replacement, no changes needed!

---

### 2. SimpleTable → Table

**Before:**
```tsx
import { SimpleTable } from '@/components/tables';

<SimpleTable
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
  maxHeight="400px"
/>
```

**After:**
```tsx
import { Table } from '@/components/tables';

<Table
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
  maxHeight="400px"
  compact={true}  // ← Add this for SimpleTable style
/>
```

**Changes:**
- Add `compact={true}` for smaller padding (px-3 py-2 instead of px-4 py-3)

---

### 3. StickyTable → Table

**Before:**
```tsx
import { StickyTable } from '@/components/tables';

<StickyTable
  columns={[
    { key: 'id', label: 'ID', sticky: 'left' },
    { key: 'name', label: 'Name' },
    { key: 'actions', label: 'Actions', sticky: 'right' },
  ]}
  data={data}
  keyExtractor={(item) => item.id}
/>
```

**After:**
```tsx
import { Table } from '@/components/tables';

<Table
  columns={[
    { key: 'id', label: 'ID', sticky: 'left' },
    { key: 'name', label: 'Name' },
    { key: 'actions', label: 'Actions', sticky: 'right' },
  ]}
  data={data}
  keyExtractor={(item) => item.id}
/>
```

**Result:** Drop-in replacement, no changes needed!

---

## Props Reference

### Table Component Props

```typescript
interface TableColumn<T extends Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  sticky?: 'left' | 'right';           // From StickyTable
  width?: string;                      // From StickyTable
  className?: string;
  headerClassName?: string;            // From StickyTable
}

interface TableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;

  // Visual options
  maxHeight?: string;                  // Default: '600px'
  stickyHeader?: boolean;              // Default: true
  zebraStripes?: boolean;              // Default: true
  hoverEffect?: boolean;               // Default: true
  compact?: boolean;                   // Default: false (NEW - for SimpleTable style)

  // Advanced options
  headerRows?: ReactNode[];            // From StickyTable (multi-row headers)
  className?: string;
  emptyState?: ReactNode;
}
```

---

## Feature Comparison

| Feature | DataTable | SimpleTable | StickyTable | **Table (Unified)** |
|---------|-----------|-------------|-------------|---------------------|
| Sticky header | ✅ | ✅ | ✅ | ✅ |
| Zebra stripes | ✅ | ✅ | ✅ | ✅ |
| Hover effect | ✅ | ✅ | ✅ | ✅ |
| Configurable max height | ✅ | ✅ | ✅ | ✅ |
| Sticky columns (left/right) | ❌ | ❌ | ✅ | ✅ |
| Compact mode (smaller padding) | ❌ | ✅ | ❌ | ✅ |
| Multi-row headers | ❌ | ❌ | ✅ | ✅ |
| Custom column width | ❌ | ❌ | ✅ | ✅ |
| Header className | ❌ | ❌ | ✅ | ✅ |

---

## Usage Examples

### Standard Table
```tsx
<Table
  columns={columns}
  data={orders}
  keyExtractor={(order) => order.id}
/>
```

### Compact Modal Table
```tsx
<Table
  columns={columns}
  data={items}
  keyExtractor={(item) => item.id}
  compact={true}
  maxHeight="400px"
/>
```

### Table with Sticky Columns
```tsx
<Table
  columns={[
    { key: 'id', label: 'ID', sticky: 'left', width: '80px' },
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'actions', label: '', sticky: 'right', width: '100px' },
  ]}
  data={orders}
  keyExtractor={(order) => order.id}
/>
```

### Table with Custom Empty State
```tsx
<Table
  columns={columns}
  data={[]}
  keyExtractor={(item) => item.id}
  emptyState={
    <div className="text-center py-12">
      <p className="text-slate-500">No orders found</p>
      <button className="mt-4 btn-primary">Create Order</button>
    </div>
  }
/>
```

---

## Migration Checklist

- [ ] Replace `DataTable` imports with `Table`
- [ ] Replace `SimpleTable` imports with `Table` and add `compact={true}`
- [ ] Replace `StickyTable` imports with `Table`
- [ ] Test all table instances
- [ ] Remove old component files after migration (optional)

---

## Deprecation Timeline

**Phase 1 (Current):** All old components marked as deprecated but still functional
**Phase 2 (Future):** Remove old components after full codebase migration

---

## Benefits

1. **Single source of truth** - One component to maintain
2. **Consistent API** - All tables use same props interface
3. **Feature rich** - All features available in one component
4. **Type safe** - Full TypeScript support
5. **Smaller bundle** - Only one implementation loaded
6. **Easier maintenance** - Bug fixes in one place

---

## Implementation Details

**File:** `apps/web/src/components/tables/Table.tsx`

**LOC:** ~150 lines (vs. 100 + 90 + 130 = 320 lines for three components)

**Code reduction:** ~50% reduction in code

**Features added:**
- `compact` mode (from SimpleTable)
- All options now optional with sensible defaults
- Better TypeScript inference
- Consolidated styling logic

---

## Questions?

See: `docs/table-components-examples.md` for more usage examples.
