'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Package } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import {
  deliveriesApi,
  type ValidateOrdersResult,
  type ValidatedOrder,
  type DeliveryForDate,
} from '@/features/deliveries/api/deliveriesApi';

interface QuickDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DeliveryMode = 'new' | 'existing';

export function QuickDeliveryDialog({ open, onOpenChange }: QuickDeliveryDialogProps) {
  const queryClient = useQueryClient();

  // === STATE ===
  const [orderNumbersInput, setOrderNumbersInput] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('new');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<ValidateOrdersResult | null>(null);
  const [reassignOrderIds, setReassignOrderIds] = useState<Set<number>>(new Set());

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setOrderNumbersInput('');
      setDeliveryMode('new');
      setDeliveryDate('');
      setSelectedDeliveryId(null);
      setValidationResult(null);
      setReassignOrderIds(new Set());
    }
  }, [open]);

  // === QUERIES ===

  // Pobierz dostawy na wybraną datę (gdy tryb "existing")
  const { data: deliveriesForDate, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['deliveries-for-date', deliveryDate],
    queryFn: () => deliveriesApi.getDeliveriesForDate(deliveryDate),
    enabled: deliveryMode === 'existing' && !!deliveryDate,
  });

  // Podgląd numeru nowej dostawy
  const { data: previewNumber } = useQuery({
    queryKey: ['preview-delivery-number', deliveryDate],
    queryFn: () => deliveriesApi.previewDeliveryNumber(deliveryDate),
    enabled: deliveryMode === 'new' && !!deliveryDate,
  });

  // === MUTATIONS ===

  // Walidacja numerów zleceń
  const validateMutation = useMutation({
    mutationFn: deliveriesApi.validateOrderNumbers,
    onSuccess: (result) => {
      setValidationResult(result);
      // Domyślnie zaznacz wszystkie zlecenia do przepięcia
      setReassignOrderIds(new Set(result.alreadyAssigned.map((o) => o.orderId)));
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Błąd walidacji numerów zleceń');
    },
  });

  // Masowe przypisanie
  const bulkAssignMutation = useMutation({
    mutationFn: deliveriesApi.bulkAssignOrders,
    onSuccess: (result) => {
      const messages: string[] = [];
      if (result.assignedCount > 0) {
        messages.push(`Przypisano ${result.assignedCount} zleceń`);
      }
      if (result.reassignedCount > 0) {
        messages.push(`Przepięto ${result.reassignedCount} zleceń`);
      }
      showSuccessToast(
        `Dostawa ${result.delivery.deliveryNumber || result.delivery.id} utworzona. ${messages.join(', ')}.`
      );

      // Odśwież dane
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Błąd podczas przypisywania zleceń');
    },
  });

  // === HANDLERS ===

  const handleValidate = useCallback(() => {
    if (!orderNumbersInput.trim()) {
      showErrorToast('Wpisz numery zleceń');
      return;
    }
    validateMutation.mutate(orderNumbersInput);
  }, [orderNumbersInput, validateMutation]);

  const handleSubmit = useCallback(() => {
    if (!validationResult) return;

    // Sprawdź czy są nieznalezione
    if (validationResult.notFound.length > 0) {
      showErrorToast('Popraw nieznalezione numery zleceń przed kontynuacją');
      return;
    }

    // Sprawdź czy wybrano datę/dostawę
    if (deliveryMode === 'new' && !deliveryDate) {
      showErrorToast('Wybierz datę dostawy');
      return;
    }
    if (deliveryMode === 'existing' && !selectedDeliveryId) {
      showErrorToast('Wybierz dostawę');
      return;
    }

    // Zbierz wszystkie orderIds (znalezione + zaznaczone do przepięcia)
    const allOrderIds = [
      ...validationResult.found.map((o) => o.orderId),
      ...validationResult.alreadyAssigned
        .filter((o) => reassignOrderIds.has(o.orderId))
        .map((o) => o.orderId),
    ];

    if (allOrderIds.length === 0) {
      showErrorToast('Brak zleceń do przypisania');
      return;
    }

    bulkAssignMutation.mutate({
      orderIds: allOrderIds,
      deliveryId: deliveryMode === 'existing' ? selectedDeliveryId! : undefined,
      deliveryDate: deliveryMode === 'new' ? deliveryDate : undefined,
      reassignOrderIds: Array.from(reassignOrderIds),
    });
  }, [
    validationResult,
    deliveryMode,
    deliveryDate,
    selectedDeliveryId,
    reassignOrderIds,
    bulkAssignMutation,
  ]);

  const toggleReassign = useCallback((orderId: number) => {
    setReassignOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  // === COMPUTED ===

  const canSubmit =
    validationResult &&
    validationResult.notFound.length === 0 &&
    (validationResult.found.length > 0 ||
      validationResult.alreadyAssigned.filter((o) => reassignOrderIds.has(o.orderId)).length > 0) &&
    ((deliveryMode === 'new' && deliveryDate) ||
      (deliveryMode === 'existing' && selectedDeliveryId));

  const totalOrdersToAssign =
    (validationResult?.found.length || 0) +
    (validationResult?.alreadyAssigned.filter((o) => reassignOrderIds.has(o.orderId)).length || 0);

  // === RENDER ===

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Szybka dostawa
          </DialogTitle>
          <DialogDescription>
            Wklej listę numerów zleceń aby szybko przypisać je do dostawy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Numery zleceń */}
          <div className="space-y-2">
            <Label htmlFor="orderNumbers">Numery zleceń</Label>
            <Textarea
              id="orderNumbers"
              placeholder="Wpisz numery zleceń oddzielone przecinkami, spacjami lub enterami, np.:
53155, 53225, 53988
lub
53155
53225
53988"
              value={orderNumbersInput}
              onChange={(e) => setOrderNumbersInput(e.target.value)}
              rows={4}
              className="font-mono"
            />
            <Button
              onClick={handleValidate}
              disabled={validateMutation.isPending || !orderNumbersInput.trim()}
              variant="outline"
              className="w-full"
            >
              {validateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sprawdzanie...
                </>
              ) : (
                'Sprawdź numery'
              )}
            </Button>
          </div>

          {/* Step 2: Wyniki walidacji */}
          {validationResult && (
            <div className="space-y-4">
              {/* Nieznalezione - błędy */}
              {validationResult.notFound.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Nieznalezione numery ({validationResult.notFound.length})</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Następujące numery nie istnieją w systemie. Popraw je przed kontynuacją:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {validationResult.notFound.map((num) => (
                        <Badge key={num} variant="destructive">
                          {num}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Znalezione - gotowe */}
              {validationResult.found.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">
                    Gotowe do przypisania ({validationResult.found.length})
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1">Nr zlecenia</th>
                            <th className="py-1">Klient</th>
                            <th className="py-1">Okna</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.found.map((order) => (
                            <tr key={order.orderId}>
                              <td className="py-1 font-mono">{order.orderNumber}</td>
                              <td className="py-1">{order.orderInfo?.client || '-'}</td>
                              <td className="py-1">{order.orderInfo?.totalWindows ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Już przypisane - wymagają decyzji */}
              {validationResult.alreadyAssigned.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-600">
                    Już przypisane ({validationResult.alreadyAssigned.length})
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Te zlecenia są już przypisane do innych dostaw. Zaznacz które chcesz
                      przepiąć:
                    </p>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                      {validationResult.alreadyAssigned.map((order) => (
                        <div
                          key={order.orderId}
                          className="flex items-center gap-3 p-2 bg-muted rounded"
                        >
                          <Checkbox
                            id={`reassign-${order.orderId}`}
                            checked={reassignOrderIds.has(order.orderId)}
                            onCheckedChange={() => toggleReassign(order.orderId)}
                          />
                          <label
                            htmlFor={`reassign-${order.orderId}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="font-mono font-medium">{order.orderNumber}</span>
                            <span className="text-muted-foreground ml-2">
                              obecnie w: {order.currentDelivery?.deliveryNumber || 'brak numeru'}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Step 3: Wybór dostawy */}
              {validationResult.canProceed && (
                <div className="space-y-4 border-t pt-4">
                  <Label>Gdzie przypisać zlecenia?</Label>
                  <RadioGroup
                    value={deliveryMode}
                    onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new" className="cursor-pointer">
                        Utwórz nową dostawę
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing" />
                      <Label htmlFor="existing" className="cursor-pointer">
                        Dodaj do istniejącej dostawy
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Data dostawy */}
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Data dostawy</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => {
                        setDeliveryDate(e.target.value);
                        setSelectedDeliveryId(null); // Reset wyboru przy zmianie daty
                      }}
                    />
                  </div>

                  {/* Tryb: Nowa dostawa */}
                  {deliveryMode === 'new' && deliveryDate && previewNumber && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertTitle>Numer nowej dostawy</AlertTitle>
                      <AlertDescription>
                        <span className="font-mono font-medium">
                          {previewNumber.deliveryNumber}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Tryb: Istniejąca dostawa */}
                  {deliveryMode === 'existing' && deliveryDate && (
                    <div className="space-y-2">
                      <Label htmlFor="existingDelivery">Wybierz dostawę</Label>
                      {isLoadingDeliveries ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ładowanie dostaw...
                        </div>
                      ) : deliveriesForDate && deliveriesForDate.length > 0 ? (
                        <Select
                          value={selectedDeliveryId?.toString() || ''}
                          onValueChange={(v) => setSelectedDeliveryId(parseInt(v, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz dostawę" />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveriesForDate.map((d: DeliveryForDate) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.deliveryNumber || `Dostawa #${d.id}`} ({d.ordersCount} zleceń)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Brak dostaw na wybraną datę. Wybierz "Utwórz nową dostawę".
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || bulkAssignMutation.isPending}
          >
            {bulkAssignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Przypisywanie...
              </>
            ) : (
              `Przypisz ${totalOrdersToAssign} zleceń`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickDeliveryDialog;
