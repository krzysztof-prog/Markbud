# Import Conflict Handling Implementation

## Overview
Added conflict detection and handling for folder imports to prevent simultaneous imports of the same folder by multiple users.

## Changes Made

### 1. Updated `useImportMutations.ts` Hook
**File**: `apps/web/src/app/importy/hooks/useImportMutations.ts`

**Changes**:
- Added `onImportConflict` callback to `useFolderImportMutations` hook
- Enhanced error handling in `importFolderMutation.onError` to detect 409 Conflict errors
- Extract conflict details from error response and trigger conflict callback

**Key Implementation**:
```typescript
onError: (error: unknown) => {
  // Check if this is a conflict error (409)
  if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
    // Extract conflict details from error.data
    const errorData = 'data' in error ? (error.data as Record<string, unknown>) : {};
    const details = errorData.details as { userName?: string; lockedAt?: string } | undefined;

    if (details?.userName && details?.lockedAt) {
      // Parse the conflict info and call the callback
      callbacks?.onImportConflict?.({
        folderPath: errorData.folderPath as string || 'Unknown folder',
        lockedBy: details.userName,
        lockedAt: new Date(details.lockedAt),
      });
      return; // Don't show toast - modal will handle UI
    }
  }

  // For non-conflict errors, show toast
  const message = error instanceof Error ? error.message : 'Nie udalo sie zaimportowac plikow';
  toast({
    title: 'Blad importu',
    description: message,
    variant: 'destructive',
  });
}
```

### 2. Updated `page.tsx` - Imports Page
**File**: `apps/web/src/app/importy/page.tsx`

**Changes**:
- Added conflict modal state (`conflictModalOpen`, `conflictInfo`)
- Added `handleRetryImport` handler for retry functionality
- Added `handleCloseConflictModal` handler to close and reset modal state
- Integrated `ImportConflictModal` component
- Connected conflict callback from mutation hook to modal state

**Key Implementation**:
```typescript
// Conflict modal state
const [conflictModalOpen, setConflictModalOpen] = useState(false);
const [conflictInfo, setConflictInfo] = useState<{
  folderPath: string;
  lockedBy: string;
  lockedAt: Date;
} | null>(null);

// Mutation callbacks
const { scanFolderMutation, importFolderMutation } = useFolderImportMutations({
  onScanSuccess: (data) => setFolderScanResult(data),
  onScanError: () => setFolderScanResult(null),
  onImportSuccess: () => {
    setFolderPath('');
    setFolderScanResult(null);
    setSelectedDeliveryNumber(null);
  },
  onImportConflict: (conflict) => {
    setConflictInfo(conflict);
    setConflictModalOpen(true);
  },
});

// Retry handler
const handleRetryImport = () => {
  setConflictModalOpen(false);
  // Retry the import with same parameters
  if (folderPath && selectedDeliveryNumber) {
    importFolderMutation.mutate({
      path: folderPath,
      deliveryNumber: selectedDeliveryNumber,
    });
  }
};
```

### 3. Updated `ImportConflictModal` Component
**File**: `apps/web/src/components/imports/ImportConflictModal.tsx`

**Changes**:
- Added optional `onRetry` prop to handle retry functionality
- Updated `handleRetry` to call `onRetry` callback if provided

**Key Implementation**:
```typescript
interface ImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  conflictInfo: {
    folderPath: string;
    lockedBy: string;
    lockedAt: Date;
  } | null;
}

const handleRetry = () => {
  if (onRetry) {
    onRetry();
  } else {
    onClose();
  }
};
```

## Expected Backend Error Format

The implementation expects the backend to return a 409 Conflict error with the following format:

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Folder jest obecnie importowany przez: Jan Kowalski",
  "details": {
    "userName": "Jan Kowalski",
    "lockedAt": "2025-12-29T12:00:00Z"
  },
  "folderPath": "/path/to/folder"
}
```

## User Flow

1. **User attempts to import a folder** that is already being imported by another user
2. **Backend returns 409 Conflict** with details about who is currently importing
3. **Frontend detects conflict** in the mutation error handler
4. **Conflict modal opens** showing:
   - Which folder is locked
   - Who is currently importing it
   - When the import started (human-readable format)
5. **User can choose to**:
   - **Cancel**: Close the modal and give up on the import
   - **Retry**: Close the modal and attempt the import again (in case the lock was released)

## Testing

To test the conflict handling:

1. Start an import from one browser/user session
2. Attempt to import the same folder from another browser/user session
3. Verify that the conflict modal appears with correct information
4. Test the "Retry" button to ensure it re-attempts the import
5. Test the "Cancel" button to ensure it closes the modal cleanly

## Benefits

- **Prevents data corruption**: Users cannot import the same folder simultaneously
- **Clear user feedback**: Users know exactly why their import was blocked and by whom
- **Retry capability**: Users can easily retry if the conflict was temporary
- **Better UX**: Modal provides context-specific information instead of generic error toast
