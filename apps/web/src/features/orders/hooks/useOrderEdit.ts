/**
 * Hook do edycji zleceń w tabeli (inline editing)
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDateWarsaw } from '@/lib/date-utils';

// ================================
// Typy
// ================================

type EditableField = 'valuePln' | 'valueEur' | 'deadline';

interface EditingCell {
  orderId: number;
  field: EditableField;
}

// ================================
// Hook useOrderEdit
// ================================

interface UseOrderEditReturn {
  editingCell: EditingCell | null;
  editValue: string;
  isPending: boolean;
  startEdit: (orderId: number, field: EditableField, currentValue: string) => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  setEditValue: (value: string) => void;
}

export function useOrderEdit(): UseOrderEditReturn {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const queryClient = useQueryClient();

  // Mutacja do aktualizacji zlecenia
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: Record<string, unknown> }) =>
      ordersApi.patch(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setEditingCell(null);
      setEditValue('');
      toast({
        title: 'Zlecenie zaktualizowane',
        description: 'Zmiany zostały zapisane.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji zlecenia',
        description: error.message || 'Nie udało się zaktualizować zlecenia.',
        variant: 'destructive',
      });
    },
  });

  // Rozpocznij edycję komórki
  const startEdit = useCallback((orderId: number, field: EditableField, currentValue: string) => {
    setEditingCell({ orderId, field });

    // Dla daty, konwertuj do formatu YYYY-MM-DD jeśli jest to ISO string
    if (field === 'deadline' && currentValue) {
      try {
        const date = new Date(currentValue);
        if (!isNaN(date.getTime())) {
          const formattedDate = formatDateWarsaw(date);
          setEditValue(formattedDate);
          return;
        }
      } catch {
        // Jeśli błąd parsowania, użyj oryginalnej wartości
      }
    }

    setEditValue(currentValue);
  }, []);

  // Anuluj edycję
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Zapisz edycję
  const saveEdit = useCallback(() => {
    if (!editingCell) return;

    const { orderId, field } = editingCell;
    const data: Record<string, string | null> = {};

    // Mapuj field name do API field name
    if (field === 'valuePln') {
      data.valuePln = editValue || null;
    } else if (field === 'valueEur') {
      data.valueEur = editValue || null;
    } else if (field === 'deadline') {
      data.deadline = editValue || null;
    }

    updateOrderMutation.mutate({ orderId, data });
  }, [editingCell, editValue, updateOrderMutation]);

  return {
    editingCell,
    editValue,
    isPending: updateOrderMutation.isPending,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
  };
}

export type { EditableField, EditingCell };
