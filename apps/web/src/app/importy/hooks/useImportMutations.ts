/**
 * Import Mutations - All mutations for imports page
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/error-messages';
import { TOAST_MESSAGES } from '@/lib/toast-messages';

interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

interface ImportFolderResult {
  summary: {
    successCount: number;
    skippedCount: number;
    failCount: number;
    totalFiles: number;
    /** P0-3: Number of files that had validation errors (rows skipped) */
    filesWithValidationErrors?: number;
    /** P0-3: Total validation errors across all files */
    totalValidationErrors?: number;
  };
  delivery: {
    deliveryNumber: string;
    created: boolean;
  };
  archivedPath: string | null;
  results: Array<{
    filename: string;
    success: boolean;
    skipped?: boolean;
    skipReason?: string;
    orderNumber?: string;
    /** P0-3: Validation errors for this specific file */
    validationErrors?: Array<{
      row: number;
      field?: string;
      reason: string;
    }>;
    /** P0-3: Validation summary for this file */
    validationSummary?: {
      totalRows: number;
      successRows: number;
      failedRows: number;
    };
  }>;
}

/**
 * Hook for upload mutation with progress tracking
 */
export function useUploadMutation(callbacks?: {
  onProgress?: (progress: number) => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      let currentProgress = 0;
      callbacks?.onProgress?.(0);
      const progressInterval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 90) {
          clearInterval(progressInterval);
          callbacks?.onProgress?.(90);
        } else {
          callbacks?.onProgress?.(currentProgress);
        }
      }, 200);

      try {
        const result = await importsApi.upload(file);
        clearInterval(progressInterval);
        callbacks?.onProgress?.(100);
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        callbacks?.onProgress?.(0);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast({
        title: TOAST_MESSAGES.import.uploaded,
        description: TOAST_MESSAGES.import.uploadedDesc,
        variant: 'success',
      });
      callbacks?.onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorUpload,
        description: message,
        variant: 'destructive',
      });
      callbacks?.onError?.(error instanceof Error ? error : new Error(message));
    },
  });
}

/**
 * Hook for approve/reject mutations
 */
export function useImportActionMutations(callbacks?: {
  onApproveSuccess?: () => void;
  onRejectSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      action,
      resolution,
    }: {
      id: number;
      action: 'overwrite' | 'add_new';
      resolution?: { type: 'keep_existing' | 'use_latest'; deleteOlder?: boolean };
    }) => importsApi.approve(id, action, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: TOAST_MESSAGES.import.approved,
        description: TOAST_MESSAGES.import.approvedDesc,
        variant: 'success',
      });
      callbacks?.onApproveSuccess?.();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorApprove,
        description: message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => importsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast({
        title: TOAST_MESSAGES.import.rejected,
        description: TOAST_MESSAGES.import.rejectedDesc,
        variant: 'info',
      });
      callbacks?.onRejectSuccess?.();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorReject,
        description: message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => importsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: TOAST_MESSAGES.import.deleted,
        description: TOAST_MESSAGES.import.deletedDesc,
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorDelete,
        description: message,
        variant: 'destructive',
      });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: 'approve' | 'reject' }) =>
      importsApi.bulkAction(ids, action),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      const { summary } = data;
      const actionLabel = variables.action === 'approve' ? 'zatwierdzono' : 'odrzucono';

      if (summary.failCount === 0) {
        toast({
          title: variables.action === 'approve'
            ? TOAST_MESSAGES.import.bulkApproved(summary.successCount)
            : TOAST_MESSAGES.import.bulkRejected(summary.successCount),
          description: variables.action === 'approve'
            ? 'Ceny zostały zapisane i będą automatycznie przypisane do zleceń'
            : 'Importy zostały odrzucone',
          variant: 'success',
        });
      } else {
        toast({
          title: `Częściowo ${actionLabel}`,
          description: TOAST_MESSAGES.import.bulkPartial(summary.successCount, summary.failCount),
          variant: 'destructive',
        });
      }
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorBulk,
        description: message,
        variant: 'destructive',
      });
    },
  });

  return { approveMutation, rejectMutation, deleteMutation, bulkActionMutation };
}

/**
 * Hook for folder scanning and import mutations
 */
export function useFolderImportMutations(callbacks?: {
  onScanSuccess?: (data: FolderScanResult) => void;
  onScanError?: () => void;
  onImportSuccess?: () => void;
  onImportConflict?: (conflictInfo: { folderPath: string; lockedBy: string; lockedAt: Date }) => void;
}) {
  const queryClient = useQueryClient();

  const scanFolderMutation = useMutation({
    mutationFn: (path: string) => importsApi.scanFolder(path),
    onSuccess: (data: FolderScanResult) => {
      callbacks?.onScanSuccess?.(data);
      if (!data.detectedDate) {
        toast({
          title: TOAST_MESSAGES.import.noDate,
          description: TOAST_MESSAGES.import.noDateDesc,
          variant: 'destructive',
        });
      } else if (data.csvFiles.length === 0) {
        toast({
          title: TOAST_MESSAGES.import.noCsvFiles,
          description: TOAST_MESSAGES.import.noCsvFilesDesc,
          variant: 'destructive',
        });
      }
    },
    onError: (error: unknown) => {
      callbacks?.onScanError?.();
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorScan,
        description: message,
        variant: 'destructive',
      });
    },
  });

  const importFolderMutation = useMutation({
    mutationFn: ({ path, deliveryNumber }: { path: string; deliveryNumber: 'I' | 'II' | 'III' }) =>
      importsApi.importFolder(path, deliveryNumber),
    onSuccess: (data: ImportFolderResult, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      // Refresh folder list after import (folder was moved to archive)
      queryClient.invalidateQueries({ queryKey: ['available-folders'] });

      const { summary, delivery, results } = data;

      // Build description with skipped info
      let description = `Zaimportowano ${summary.successCount}/${summary.totalFiles} plików do dostawy ${delivery.deliveryNumber}${delivery.created ? ' (nowa)' : ''}`;

      if (summary.skippedCount > 0) {
        description += `. Pominięto ${summary.skippedCount} (duplikaty)`;
        // Show details of skipped orders
        const skippedOrders = results.filter((r) => r.skipped);
        if (skippedOrders.length > 0) {
          const skippedDetails = skippedOrders
            .map((r) => r.skipReason || `${r.orderNumber} - już przypisane`)
            .join('\n');
          toast({
            title: 'Pominięte zamówienia',
            description: skippedDetails,
            variant: 'warning',
          });
        }
      }

      // P0-3: Show validation errors if any rows were skipped due to validation
      if (summary.filesWithValidationErrors && summary.filesWithValidationErrors > 0) {
        const filesWithErrors = results.filter((r) => r.validationErrors && r.validationErrors.length > 0);

        // Build detailed error message
        const errorDetails = filesWithErrors.map((file) => {
          const errorCount = file.validationErrors?.length || 0;
          const summary = file.validationSummary;
          return `${file.orderNumber || file.filename}: ${errorCount} wierszy pominięto (${summary?.successRows || 0}/${summary?.totalRows || 0} zaimportowano)`;
        }).join('\n');

        toast({
          title: `Uwaga: ${summary.totalValidationErrors} wierszy pominięto`,
          description: errorDetails || 'Niektóre wiersze nie zostały zaimportowane z powodu błędów walidacji',
          variant: 'warning',
        });
      }

      // Determine toast variant based on issues
      let toastVariant: 'success' | 'info' | 'warning' | 'destructive' = 'success';
      if (summary.failCount > 0) {
        toastVariant = 'destructive';
      } else if (summary.filesWithValidationErrors && summary.filesWithValidationErrors > 0) {
        toastVariant = 'warning';
      } else if (summary.skippedCount > 0) {
        toastVariant = 'info';
      }

      toast({
        title: TOAST_MESSAGES.import.folderImported,
        description,
        variant: toastVariant,
      });

      callbacks?.onImportSuccess?.();
    },
    onError: (error: unknown, variables) => {
      // Check if this is a conflict error (409)
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        // Extract conflict details from error.data
        const errorData = 'data' in error ? (error.data as Record<string, unknown>) : {};
        const details = errorData.details as { userName?: string; lockedAt?: string } | undefined;

        if (details?.userName && details?.lockedAt) {
          // Parse the conflict info and call the callback
          callbacks?.onImportConflict?.({
            folderPath: (errorData.folderPath as string) || variables.path || 'Unknown folder',
            lockedBy: details.userName,
            lockedAt: new Date(details.lockedAt),
          });
          return; // Don't show toast - modal will handle UI
        }
      }

      // For non-conflict errors, show toast
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorFolderImport,
        description: message,
        variant: 'destructive',
      });
    },
  });

  return { scanFolderMutation, importFolderMutation };
}

/**
 * Hook for folder management mutations (archive/delete)
 */
export function useFolderManagementMutations(callbacks?: {
  onArchiveSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const archiveFolderMutation = useMutation({
    mutationFn: (folderPath: string) => importsApi.archiveFolder(folderPath),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['available-folders'] });
      toast({
        title: TOAST_MESSAGES.import.folderArchived,
        description: `Folder przeniesiony do archiwum: ${data.archivedPath}`,
        variant: 'success',
      });
      callbacks?.onArchiveSuccess?.();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorArchive,
        description: message,
        variant: 'destructive',
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderPath: string) => importsApi.deleteFolder(folderPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-folders'] });
      toast({
        title: TOAST_MESSAGES.import.folderDeleted,
        description: TOAST_MESSAGES.import.folderDeletedDesc,
        variant: 'success',
      });
      callbacks?.onDeleteSuccess?.();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast({
        title: TOAST_MESSAGES.import.errorFolderDelete,
        description: message,
        variant: 'destructive',
      });
    },
  });

  return { archiveFolderMutation, deleteFolderMutation };
}
