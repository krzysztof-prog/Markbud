'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';
import type { WeeklyPlanPrivateOrder } from '@/features/deliveries/api/deliveriesApi';

interface PrivateOrdersSectionProps {
  deliveryId?: number;
  prywatne: WeeklyPlanPrivateOrder[];
}

export function PrivateOrdersSection({ deliveryId, prywatne }: PrivateOrdersSectionProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(prywatne.length > 0);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');

  const addMutation = useMutation({
    mutationFn: () =>
      deliveriesApi.addItem(deliveryId!, {
        itemType: 'prywatne',
        description: description.trim(),
        quantity: parseInt(quantity, 10) || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Zlecenie prywatne dodane');
      setDescription('');
      setQuantity('');
    },
    onError: (err: Error) => {
      showErrorToast(`Błąd: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => deliveriesApi.deleteItem(deliveryId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Zlecenie prywatne usunięte');
    },
    onError: (err: Error) => {
      showErrorToast(`Błąd: ${err.message}`);
    },
  });

  const handleAdd = useCallback(() => {
    if (!description.trim()) return;
    addMutation.mutate();
  }, [description, addMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="border-t border-slate-100">
      {/* Nagłówek kolapsowany */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Zlecenia prywatne
        {prywatne.length > 0 && (
          <span className="ml-auto text-violet-500">({prywatne.length})</span>
        )}
      </button>

      {expanded && (
        <div className="px-2 py-1 bg-violet-50/50">
          {/* Lista istniejących */}
          {prywatne.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-0.5 text-[11px] text-slate-700"
            >
              <span className="truncate flex-1" title={item.description}>
                {item.description}
              </span>
              <span className="font-semibold mx-2 shrink-0">{item.quantity} szyb</span>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Usuń"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Formularz dodawania — tylko gdy jest dostawa */}
          {deliveryId != null && (
            <div className="flex items-center gap-1 mt-1">
              <Input
                placeholder="Nr zlecenia / opis"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={addMutation.isPending}
                className="h-6 text-[11px] flex-1"
              />
              <Input
                placeholder="Szyby"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={addMutation.isPending}
                className="h-6 text-[11px] w-14 text-center"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleAdd}
                disabled={addMutation.isPending || !description.trim()}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
