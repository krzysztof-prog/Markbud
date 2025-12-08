/**
 * Import Mutations - All mutations for imports page
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';

interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

interface ImportFolderResult {
  summary: {
    successCount: number;
    failCount: number;
    totalFiles: number;
  };
  delivery: {
    deliveryNumber: string;
    created: boolean;
  };
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
        title: 'Plik przeslany',
        description: 'Plik oczekuje na zatwierdzenie',
        variant: 'success',
      });
      callbacks?.onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udalo sie przeslac pliku';
      toast({
        title: 'Blad przesylania',
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
    mutationFn: ({ id, action }: { id: number; action: 'overwrite' | 'add_new' }) =>
      importsApi.approve(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast({
        title: 'Import zatwierdzony',
        description: 'Plik zostal pomyslnie zaimportowany',
        variant: 'success',
      });
      callbacks?.onApproveSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udalo sie zatwierdzic importu';
      toast({
        title: 'Blad importu',
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
        title: 'Import odrzucony',
        description: 'Plik zostal pomyslnie odrzucony',
        variant: 'info',
      });
      callbacks?.onRejectSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udalo sie odrzucic importu';
      toast({
        title: 'Blad',
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
        title: 'Import usuniety',
        description: 'Import zostal pomyslnie usuniety',
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udalo sie usunac importu';
      toast({
        title: 'Blad usuwania',
        description: message,
        variant: 'destructive',
      });
    },
  });

  return { approveMutation, rejectMutation, deleteMutation };
}

/**
 * Hook for folder scanning and import mutations
 */
export function useFolderImportMutations(callbacks?: {
  onScanSuccess?: (data: FolderScanResult) => void;
  onScanError?: () => void;
  onImportSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const scanFolderMutation = useMutation({
    mutationFn: (path: string) => importsApi.scanFolder(path),
    onSuccess: (data: FolderScanResult) => {
      callbacks?.onScanSuccess?.(data);
      if (!data.detectedDate) {
        toast({
          title: 'Brak daty w nazwie folderu',
          description: 'Nazwa folderu powinna zawierac date w formacie DD.MM.YYYY',
          variant: 'destructive',
        });
      } else if (data.csvFiles.length === 0) {
        toast({
          title: 'Brak plikow CSV',
          description: 'Nie znaleziono plikow CSV z "uzyte" lub "bele" w nazwie',
          variant: 'destructive',
        });
      }
    },
    onError: (error: unknown) => {
      callbacks?.onScanError?.();
      const message = error instanceof Error ? error.message : 'Nie udalo sie przeskanowac folderu';
      toast({
        title: 'Blad skanowania',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const importFolderMutation = useMutation({
    mutationFn: ({ path, deliveryNumber }: { path: string; deliveryNumber: 'I' | 'II' | 'III' }) =>
      importsApi.importFolder(path, deliveryNumber),
    onSuccess: (data: ImportFolderResult) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });

      const { summary, delivery } = data;
      toast({
        title: 'Import zakonczony',
        description: `Zaimportowano ${summary.successCount}/${summary.totalFiles} plikow do dostawy ${delivery.deliveryNumber}${delivery.created ? ' (nowa)' : ''}`,
        variant: summary.failCount > 0 ? 'destructive' : 'success',
      });

      callbacks?.onImportSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udalo sie zaimportowac plikow';
      toast({
        title: 'Blad importu',
        description: message,
        variant: 'destructive',
      });
    },
  });

  return { scanFolderMutation, importFolderMutation };
}
