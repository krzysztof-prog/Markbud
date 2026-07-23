'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';

interface AddOrderInputProps {
  deliveryId: number;
}

type InputState = 'idle' | 'validating' | 'confirm-reassign' | 'assigning';

interface ReassignInfo {
  orderId: number;
  orderNumber: string;
  currentDeliveryNumber: string | null;
  currentDeliveryDate: string;
}

export function AddOrderInput({ deliveryId }: AddOrderInputProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [state, setState] = useState<InputState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reassignInfo, setReassignInfo] = useState<ReassignInfo | null>(null);

  // Walidacja numeru zlecenia
  const validateMutation = useMutation({
    mutationFn: (input: string) => deliveriesApi.validateOrderNumbers(input),
    onSuccess: (result) => {
      // Nie znaleziono
      if (result.notFound.length > 0) {
        setErrorMsg(`Nie znaleziono zlecenia: ${result.notFound.join(', ')}`);
        setState('idle');
        return;
      }

      const order = result.found[0] || result.alreadyAssigned[0];
      if (!order) {
        setErrorMsg('Nie znaleziono zlecenia');
        setState('idle');
        return;
      }

      // Już przypisane do tej dostawy
      if (
        order.status === 'already_assigned' &&
        order.currentDelivery?.deliveryId === deliveryId
      ) {
        setErrorMsg('Zlecenie jest już w tej dostawie');
        setState('idle');
        return;
      }

      // Przypisane do innej dostawy — pytaj o przepięcie
      if (order.status === 'already_assigned' && order.currentDelivery) {
        setReassignInfo({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          currentDeliveryNumber: order.currentDelivery.deliveryNumber,
          currentDeliveryDate: order.currentDelivery.deliveryDate,
        });
        setState('confirm-reassign');
        return;
      }

      // Znalezione i nieprzypisane — przypisz od razu
      assignMutation.mutate({
        orderIds: [order.orderId],
        deliveryId,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(`Błąd walidacji: ${err.message}`);
      setState('idle');
    },
  });

  // Przypisanie zlecenia do dostawy
  const assignMutation = useMutation({
    mutationFn: (params: {
      orderIds: number[];
      deliveryId: number;
      reassignOrderIds?: number[];
    }) => deliveriesApi.bulkAssignOrders(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Zlecenie dodane do dostawy');
      setOrderNumber('');
      setErrorMsg(null);
      setReassignInfo(null);
      setState('idle');
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (err: Error) => {
      showErrorToast(`Błąd przypisania: ${err.message}`);
      setState('idle');
    },
  });

  const handleSubmit = useCallback(() => {
    if (state !== 'idle') return;
    const trimmed = orderNumber.trim();
    if (!trimmed) return;
    setErrorMsg(null);
    setReassignInfo(null);
    setState('validating');
    validateMutation.mutate(trimmed);
  }, [orderNumber, validateMutation]);

  const handleConfirmReassign = useCallback(() => {
    if (!reassignInfo) return;
    setState('assigning');
    assignMutation.mutate({
      orderIds: [reassignInfo.orderId],
      deliveryId,
      reassignOrderIds: [reassignInfo.orderId],
    });
  }, [reassignInfo, deliveryId, assignMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state === 'confirm-reassign') {
          handleConfirmReassign();
        } else {
          handleSubmit();
        }
      }
      if (e.key === 'Escape') {
        setOrderNumber('');
        setErrorMsg(null);
        setReassignInfo(null);
        setState('idle');
      }
    },
    [state, handleSubmit, handleConfirmReassign]
  );

  const handleCancelReassign = useCallback(() => {
    setReassignInfo(null);
    setState('idle');
    setOrderNumber('');
  }, []);

  const isLoading = state === 'validating' || state === 'assigning';

  return (
    <div className="px-2 py-1.5 border-t border-slate-100">
      {/* Potwierdzenie przepięcia */}
      {state === 'confirm-reassign' && reassignInfo && (
        <div className="flex items-start gap-1.5 mb-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-amber-800">
              <strong>{reassignInfo.orderNumber}</strong> jest w dostawie{' '}
              {reassignInfo.currentDeliveryNumber ?? reassignInfo.currentDeliveryDate}. Przepiąć?
            </div>
            <div className="flex gap-1 mt-1">
              <Button
                size="sm"
                variant="default"
                className="h-5 text-[10px] px-2"
                onClick={handleConfirmReassign}
                disabled={assignMutation.isPending}
                autoFocus
              >
                Przepnij
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[10px] px-2"
                onClick={handleCancelReassign}
              >
                Anuluj
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          placeholder="Wpisz nr zlecenia (np. 54102-a)..."
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="h-7 text-xs flex-1"
        />
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>

      {/* Błąd */}
      {errorMsg && (
        <div className="text-[10px] text-red-600 mt-0.5 px-1">{errorMsg}</div>
      )}
    </div>
  );
}
