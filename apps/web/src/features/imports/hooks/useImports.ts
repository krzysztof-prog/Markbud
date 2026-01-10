import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '../api/importsApi';

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
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'overwrite' | 'add_new' }) =>
      importsApi.approve(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: importsApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: importsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    uploadMutation,
    approveMutation,
    rejectMutation,
    deleteMutation,
  };
}
