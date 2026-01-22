import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '../api/importsApi';
import { toast } from '@/hooks/useToast';

export const IMPORTS_QUERY_KEY = ['imports'] as const;

export function useImports() {
  return useQuery({
    queryKey: IMPORTS_QUERY_KEY,
    queryFn: () => importsApi.getAll(),
    staleTime: 1 * 60 * 1000,
  });
}

export function useImportPreview(importId: number | null) {
  return useQuery({
    queryKey: ['import-preview', importId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- enabled check guarantees importId is not null
    queryFn: () => importsApi.getPreview(importId!),
    enabled: !!importId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useImportMutations() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: importsApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
      toast({
        title: 'Plik przesłany',
        description: 'Plik został pomyślnie przesłany i oczekuje na zatwierdzenie.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przesyłania pliku',
        description: error.message || 'Nie udało się przesłać pliku.',
        variant: 'destructive',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'overwrite' | 'add_new' }) =>
      importsApi.approve(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
      toast({
        title: 'Import zatwierdzony',
        description: 'Dane z importu zostały dodane do systemu.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd zatwierdzania importu',
        description: error.message || 'Nie udało się zatwierdzić importu.',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: importsApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
      toast({
        title: 'Import odrzucony',
        description: 'Import został odrzucony.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd odrzucania importu',
        description: error.message || 'Nie udało się odrzucić importu.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: importsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Import usunięty',
        description: 'Import został usunięty z systemu.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania importu',
        description: error.message || 'Nie udało się usunąć importu.',
        variant: 'destructive',
      });
    },
  });

  return {
    uploadMutation,
    approveMutation,
    rejectMutation,
    deleteMutation,
  };
}
