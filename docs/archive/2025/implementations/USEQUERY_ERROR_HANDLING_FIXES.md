# useQuery Error Handling Fixes

## Summary
Fixed critical error handling issues in three frontend pages where useQuery was missing error state handling, which could cause application crashes when API calls fail.

## Files Modified

### 1. DostawyPageContent.tsx
**Location:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Changes:**
- Added `error` to useQuery destructuring (line 254)
- Added error boundary UI before rendering calendar (lines 948-964)
- Error UI displays:
  - Red X icon
  - Error message using `getErrorMessage(error)` helper
  - "Spróbuj ponownie" button that invalidates the query

**Pattern:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['deliveries-calendar-batch', monthsToFetch],
  queryFn: async () => {
    return deliveriesApi.getCalendarBatch(monthsToFetch);
  },
});

// In render:
{isLoading ? (
  <TableSkeleton rows={10} columns={7} />
) : error ? (
  <ErrorStateUI />
) : (
  <CalendarContent />
)}
```

### 2. importy/page.tsx
**Location:** `apps/web/src/app/importy/page.tsx`

**Changes:**
- Added `error` to useQuery destructuring (line 56)
- Added full-page error state before main render (lines 194-219)
- Error UI displays:
  - Warning triangle icon (SVG)
  - Error message from error object
  - "Odśwież stronę" button

**Pattern:**
```typescript
const { data: imports, isLoading, error } = useQuery({
  queryKey: ['imports'],
  queryFn: () => importsApi.getAll(),
});

// Early return for error state
if (error) {
  return <ErrorPage />;
}
```

### 3. ustawienia/page.tsx
**Location:** `apps/web/src/app/ustawienia/page.tsx`

**Changes:**
- Added error states to all queries:
  - `error: settingsError` for settings query (line 145)
  - `error: palletTypesError` for pallet types query (line 150)
  - `error: colorsError` for colors query (line 155)
  - `error: profilesError` for profiles query (line 160)
- Added combined error handling (lines 351-382)
- Error UI displays first available error message

**Pattern:**
```typescript
const { data: initialSettings, isLoading, error: settingsError } = useQuery({
  queryKey: ['settings'],
  queryFn: settingsApi.getAll,
});

const { data: palletTypes, error: palletTypesError } = useQuery({
  queryKey: ['pallet-types'],
  queryFn: settingsApi.getPalletTypes,
});

// ... more queries

// Combined error check
const hasError = settingsError || palletTypesError || colorsError || profilesError;
if (hasError) {
  return <ErrorPage />;
}
```

## Error Handling Benefits

1. **Prevents crashes**: Application no longer crashes when API returns errors
2. **User-friendly feedback**: Clear error messages instead of blank screens
3. **Recovery options**: All error states include retry/refresh mechanisms
4. **Graceful degradation**: Loading and error states properly separated
5. **Type safety**: Error objects properly typed with TypeScript

## Common Error Scenarios Handled

- Network failures (API server down)
- Authentication errors (401/403)
- Server errors (500)
- Timeout errors
- Invalid responses

## Testing Recommendations

1. Test with API server stopped
2. Test with invalid authentication tokens
3. Test with slow network (throttling)
4. Test with malformed API responses
5. Verify error messages are user-friendly

## Notes

- All error UIs follow consistent pattern across pages
- Error messages use `getErrorMessage()` helper or direct error message access
- Reload/retry mechanisms vary by page complexity:
  - Simple pages: `window.location.reload()`
  - Complex pages: `queryClient.invalidateQueries()`
