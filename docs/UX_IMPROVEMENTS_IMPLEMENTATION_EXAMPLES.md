# Przykłady Implementacji UX Improvements

> **Kompletne przykłady kodu** gotowe do użycia w projekcie AKROBUD

## Spis Treści

1. [Contextual Toast - Pełny Przykład](#1-contextual-toast---pelny-przyklad)
2. [Destructive Dialog - Integracja z Magazynem](#2-destructive-dialog---integracja-z-magazynem)
3. [Decision Colors - Dostawy](#3-decision-colors---dostawy)
4. [Mode Toggle - Order Detail](#4-mode-toggle---order-detail)
5. [Business Tooltip - Warehouse](#5-business-tooltip---warehouse)

---

## 1. Contextual Toast - Pełny Przykład

### Scenariusz: Import z konfliktami

#### Before (obecny kod)

```typescript
// apps/web/src/app/importy/components/ImportPreviewCard.tsx
import { useToast } from '@/components/ui/use-toast';

function ImportPreviewCard() {
  const { toast } = useToast();

  const handleConflict = (conflicts: number) => {
    // ❌ Mało informacji - użytkownik nie wie dlaczego
    toast({
      title: 'Znaleziono konflikty',
      description: `Wykryto ${conflicts} konfliktów`,
      variant: 'warning'
    });
  };
}
```

#### After (z contextual toast)

```typescript
// apps/web/src/app/importy/components/ImportPreviewCard.tsx
'use client';

import React, { useState } from 'react';
import { useContextualToast } from '@/hooks/useContextualToast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText } from 'lucide-react';

interface ImportConflict {
  orderId: string;
  orderNumber: string;
  existingDate: string;
  type: 'duplicate' | 'variant' | 'override';
}

function ImportPreviewCard({
  file,
  conflicts
}: {
  file: File;
  conflicts: ImportConflict[];
}) {
  const { showContextualToast } = useContextualToast();
  const [showCompare, setShowCompare] = useState(false);

  const handleImportWithConflicts = () => {
    // ✅ Pełny kontekst - użytkownik rozumie sytuację
    showContextualToast({
      title: 'Import zawiera konflikty',
      message: `Znaleziono ${conflicts.length} zleceń które już istnieją w systemie`,
      reason: `Importujesz plik "${file.name}" zawierający zlecenia dodane wcześniej. System wykrył duplikaty które mogą być nowszymi wersjami.`,
      variant: 'warning',
      action: {
        label: 'Porównaj wszystkie',
        onClick: () => setShowCompare(true)
      }
    });

    // Pokazanie szczegółów dla każdego konfliktu
    conflicts.slice(0, 3).forEach(conflict => {
      showContextualToast({
        title: `Konflikt: Zlecenie ${conflict.orderNumber}`,
        message: `Zlecenie już istnieje w systemie`,
        reason: `Istniejące zlecenie dodane: ${conflict.existingDate}. Możliwe że importujesz nowszą wersję tego samego zlecenia.`,
        variant: 'info',
        action: {
          label: 'Porównaj',
          onClick: () => openCompareModal(conflict.orderId)
        },
        duration: 8000
      });
    });

    if (conflicts.length > 3) {
      showContextualToast({
        title: `+ ${conflicts.length - 3} więcej konfliktów`,
        message: 'Pozostałe konflikty dostępne w podglądzie',
        reason: 'Pokazano tylko pierwsze 3 konflikty aby nie przeciążać interfejsu',
        variant: 'info',
        duration: 5000
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview content */}

      {conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                Wykryto {conflicts.length} konfliktów
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Import zawiera zlecenia które już istnieją. Sprawdź konflikty przed zatwierdzeniem.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportWithConflicts}
                className="mt-3"
              >
                <FileText className="h-4 w-4 mr-2" />
                Zobacz konflikty
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Integracja w innych miejscach

#### Magazyn - Niedobór profili

```typescript
// apps/web/src/app/magazyn/page.tsx
'use client';

import { useContextualToast } from '@/hooks/useContextualToast';
import { useQuery } from '@tanstack/react-query';

function MagazynPage() {
  const { showContextualToast } = useContextualToast();
  const { data: shortages } = useQuery({
    queryKey: ['warehouse-shortages'],
    queryFn: fetchShortages
  });

  // Auto-pokazanie alertu przy niedoborach
  useEffect(() => {
    if (shortages && shortages.length > 0) {
      const critical = shortages.filter(s => s.deficit > 10);

      if (critical.length > 0) {
        showContextualToast({
          title: 'Krytyczny niedobór profili',
          message: `Brakuje ${critical.length} pozycji profili (deficyt > 10 bel)`,
          reason: 'Aktualny stan magazynu nie pokrywa zapotrzebowania na zlecenia w trakcie realizacji. Konieczne pilne zamówienie.',
          variant: 'error',
          action: {
            label: 'Złóż zamówienie automatyczne',
            onClick: () => router.push('/magazyn/zamowienia/auto')
          }
        });
      }
    }
  }, [shortages]);

  return (
    <div>
      {/* Warehouse content */}
    </div>
  );
}
```

---

## 2. Destructive Dialog - Integracja z Magazynem

### Scenariusz: Finalizacja miesiąca

#### Complete Implementation

```typescript
// apps/web/src/features/warehouse/remanent/components/FinalizeMonthModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '@/features/warehouse/api/warehouseApi';
import { useContextualToast } from '@/hooks/useContextualToast';
import { CheckCircle, Calendar, Package } from 'lucide-react';

interface FinalizePreview {
  month: string;
  year: number;
  ordersCount: number;
  orders: Array<{ id: string; orderNumber: string; clientName: string }>;
  stockItemsCount: number;
  totalValue: number;
  lastFinalizationDate: string | null;
  canUndo: boolean;
}

export function FinalizeMonthModal({ currentMonth, currentYear }: {
  currentMonth: number;
  currentYear: number;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();
  const { showContextualToast } = useContextualToast();

  // Pobierz preview finalizacji
  const { data: preview, isLoading } = useQuery({
    queryKey: ['finalize-preview', currentMonth, currentYear],
    queryFn: () => warehouseApi.getFinalizePreview(currentMonth, currentYear),
    enabled: showDialog
  });

  // Mutacja finalizacji
  const finalizeMutation = useMutation({
    mutationFn: () => warehouseApi.finalizeMonth(currentMonth, currentYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-remanent'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      showContextualToast({
        title: 'Miesiąc sfinalizowany',
        message: `${getMonthName(currentMonth)} ${currentYear} został zarchiwizowany`,
        reason: 'Zlecenia przeniesiono do archiwum, stan magazynu zapisano. Możesz cofnąć tę operację przez najbliższe 7 dni.',
        variant: 'success',
        action: {
          label: 'Zobacz archiwum',
          onClick: () => router.push('/archiwum')
        }
      });

      setShowDialog(false);
    },
    onError: (error) => {
      showContextualToast({
        title: 'Błąd finalizacji',
        message: 'Nie udało się sfinalizować miesiąca',
        reason: error instanceof Error ? error.message : 'Nieznany błąd serwera',
        variant: 'error',
        action: {
          label: 'Spróbuj ponownie',
          onClick: () => finalizeMutation.mutate()
        }
      });
    }
  });

  const monthName = getMonthName(currentMonth);
  const confirmText = 'FINALIZUJ';

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Calendar className="h-5 w-5 mr-2" />
        Finalizuj miesiąc {monthName}
      </Button>

      <DestructiveActionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={`Finalizacja miesiąca - ${monthName} ${currentYear}`}
        description="Ta akcja zarchiwizuje wszystkie zlecenia i utworzy snapshot stanu magazynu"
        actionType="finalize"
        confirmText={confirmText}
        isLoading={finalizeMutation.isPending}
        consequences={[
          `${preview?.ordersCount || 0} zleceń zostanie przeniesionych do archiwum`,
          `Stan magazynu zostanie zapisany na ${new Date(currentYear, currentMonth, 0).toLocaleDateString('pl-PL')}`,
          'Zarchiwizowane zlecenia nie będą mogły być edytowane',
          preview?.canUndo
            ? '✅ Możesz cofnąć tę finalizację (undo dostępne 7 dni)'
            : '⚠️ Poprzednia finalizacja nie może być już cofnięta',
          'Raporty miesięczne staną się dostępne dla tego okresu'
        ]}
        affectedItems={preview?.orders?.map(o => ({
          id: o.id,
          label: `#${o.orderNumber} - ${o.clientName}`
        }))}
        previewData={
          preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-slate-600">Zlecenia do archiwizacji</p>
                    <p className="text-lg font-semibold">{preview.ordersCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-600">Pozycje w magazynie</p>
                    <p className="text-lg font-semibold">{preview.stockItemsCount}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-slate-600">Wartość stanu magazynu</p>
                <p className="text-xl font-bold text-green-700">
                  {preview.totalValue.toLocaleString('pl-PL')} PLN
                </p>
              </div>

              {preview.lastFinalizationDate && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-600">Ostatnia finalizacja</p>
                  <p className="text-sm font-medium">
                    {new Date(preview.lastFinalizationDate).toLocaleDateString('pl-PL')}
                    {preview.canUndo && (
                      <span className="ml-2 text-green-600">(można cofnąć)</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )
        }
        onConfirm={() => finalizeMutation.mutate()}
      />
    </>
  );
}

function getMonthName(month: number): string {
  const names = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  return names[month - 1];
}
```

### Backend API dla preview

```typescript
// apps/api/src/handlers/warehouse-handler.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { warehouseService } from '../services/warehouse-service';

export const warehouseHandler = {
  async getFinalizePreview(
    request: FastifyRequest<{ Params: { month: string; year: string } }>,
    reply: FastifyReply
  ) {
    try {
      const month = parseInt(request.params.month);
      const year = parseInt(request.params.year);

      const preview = await warehouseService.getFinalizePreview(month, year);

      return reply.status(200).send(preview);
    } catch (error) {
      throw error;
    }
  },

  async finalizeMonth(
    request: FastifyRequest<{ Params: { month: string; year: string } }>,
    reply: FastifyReply
  ) {
    try {
      const month = parseInt(request.params.month);
      const year = parseInt(request.params.year);

      const result = await warehouseService.finalizeMonth(month, year);

      return reply.status(200).send(result);
    } catch (error) {
      throw error;
    }
  }
};
```

---

## 3. Decision Colors - Dostawy

### Scenariusz: Usuwanie dostawy z walidacją

```typescript
// apps/web/src/app/dostawy/components/DeliveryCard.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionIndicator } from '@/components/ui/action-indicator';
import { DecisionButton } from '@/components/ui/decision-button';
import { Button } from '@/components/ui/button';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { Edit, Trash2, Package } from 'lucide-react';
import type { Delivery } from '@/types/delivery';

interface DeliveryCardProps {
  delivery: Delivery;
  onEdit: (delivery: Delivery) => void;
  onDelete: (deliveryId: string) => void;
}

export function DeliveryCard({ delivery, onEdit, onDelete }: DeliveryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canDelete = delivery.orders.length === 0;
  const hasOrders = delivery.orders.length > 0;
  const isUpcoming = new Date(delivery.deliveryDate) > new Date();
  const isPast = !isUpcoming;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{delivery.deliveryNumber}</CardTitle>
            <p className="text-sm text-slate-600">
              {new Date(delivery.deliveryDate).toLocaleDateString('pl-PL')}
            </p>
          </div>

          {/* Decision indicator - czy można usunąć */}
          <ActionIndicator
            state={canDelete ? 'can' : 'cannot'}
            label={canDelete ? 'Można usunąć' : 'Nie można usunąć'}
            tooltip={
              canDelete
                ? 'Dostawa nie zawiera zleceń - możesz bezpiecznie usunąć'
                : `Dostawa zawiera ${delivery.orders.length} zleceń - usuń je najpierw lub przenieś do innej dostawy`
            }
            size="sm"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status info */}
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-slate-500" />
          <span className="text-slate-600">
            {delivery.orders.length} zleceń
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Edit button - risky jeśli dostawa w przeszłości */}
          <DecisionButton
            decision={isPast ? 'risky' : 'safe'}
            riskLevel={isPast ? 'medium' : undefined}
            onClick={() => onEdit(delivery)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edytuj
          </DecisionButton>

          {/* Delete button - blocked jeśli ma zlecenia */}
          <DecisionButton
            decision={canDelete ? 'safe' : 'blocked'}
            blockReason={
              hasOrders
                ? `Nie można usunąć - dostawa zawiera ${delivery.orders.length} zleceń`
                : undefined
            }
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            size="icon"
          >
            <Trash2 className="h-4 w-4" />
          </DecisionButton>
        </div>

        {/* Warning dla dostawy w przeszłości */}
        {isPast && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
            <p className="text-yellow-800">
              ⚠️ Dostawa z przeszłości - zmiany mogą wpłynąć na raporty
            </p>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <DestructiveActionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Usunięcie dostawy"
        description={`Czy na pewno chcesz usunąć dostawę ${delivery.deliveryNumber}?`}
        actionType="delete"
        confirmText={delivery.deliveryNumber}
        consequences={
          hasOrders
            ? [
                `Usunięcie dostawy ${delivery.deliveryNumber}`,
                `${delivery.orders.length} zleceń straci przypisanie do dostawy`,
                'Zlecenia wrócą do puli nieprzypisanych',
                'Zapotrzebowanie na profile zostanie przeliczone',
                'AKCJA NIEODWRACALNA'
              ]
            : [
                `Usunięcie pustej dostawy ${delivery.deliveryNumber}`,
                'Brak wpływu na zlecenia',
                'AKCJA NIEODWRACALNA'
              ]
        }
        affectedItems={
          hasOrders
            ? delivery.orders.map(o => ({
                id: o.id,
                label: `${o.orderNumber} - ${o.clientName}`
              }))
            : undefined
        }
        onConfirm={() => onDelete(delivery.id)}
      />
    </Card>
  );
}
```

---

## 4. Mode Toggle - Order Detail

### Scenariusz: Edycja szczegółów zlecenia

```typescript
// apps/web/src/components/orders/OrderDetailModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ModeToggle, type ViewMode } from '@/components/ui/mode-toggle';
import { EditableField } from '@/components/ui/editable-field';
import { ReadonlyOverlay } from '@/components/ui/readonly-overlay';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/features/orders/api/ordersApi';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import type { Order } from '@/types/order';

interface OrderDetailModalProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailModal({ orderId, open, onOpenChange }: OrderDetailModalProps) {
  const [mode, setMode] = useState<ViewMode>('view');
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: open
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Order>) => ordersApi.updateOrder(orderId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setMode('view');
      setHasChanges(false);
    }
  });

  if (!order) return null;

  const canEdit = order.status !== 'archived';
  const isArchived = order.status === 'archived';

  const handleSaveField = async (field: string, value: any) => {
    await updateMutation.mutateAsync({ [field]: value });
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Zlecenie #{order.orderNumber}</span>
            <ModeToggle
              mode={mode}
              onModeChange={setMode}
              canEdit={canEdit}
              editWarning="Zmiany w zleceniu wpłyną na zapotrzebowanie profili, stan magazynu i dostawy"
            />
          </DialogTitle>
        </DialogHeader>

        <ReadonlyOverlay
          active={isArchived}
          reason={`Zlecenie zarchiwizowane (${order.archivedAt}) - brak możliwości edycji`}
        >
          <div className="space-y-6 py-4">
            {/* Sekcja: Dane klienta */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Dane klienta
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  value={order.clientName}
                  onSave={(value) => handleSaveField('clientName', value)}
                  mode={mode}
                  label="Nazwa klienta"
                  type="text"
                  fieldName="clientName"
                  validation={(v) => v.length > 0}
                />

                <EditableField
                  value={order.clientPhone || ''}
                  onSave={(value) => handleSaveField('clientPhone', value)}
                  mode={mode}
                  label="Telefon"
                  type="text"
                  fieldName="clientPhone"
                />
              </div>
            </section>

            {/* Sekcja: Szczegóły zlecenia */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Szczegóły zlecenia
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <EditableField
                  value={order.totalWindows}
                  onSave={(value) => handleSaveField('totalWindows', parseInt(value as string))}
                  mode={mode}
                  label="Liczba okien"
                  type="number"
                  fieldName="totalWindows"
                  validation={(v) => parseInt(v) > 0}
                />

                <EditableField
                  value={order.deliveryDate || ''}
                  onSave={(value) => handleSaveField('deliveryDate', value)}
                  mode={mode}
                  label="Data dostawy"
                  type="date"
                  fieldName="deliveryDate"
                />

                {mode === 'view' && (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">Status</p>
                    <p className="text-base font-medium capitalize">{order.status}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Sekcja: Notatki */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Notatki
              </h3>

              <EditableField
                value={order.notes || ''}
                onSave={(value) => handleSaveField('notes', value)}
                mode={mode}
                label="Uwagi do zlecenia"
                type="text"
                fieldName="notes"
              />
            </section>

            {/* Footer z akcjami w edit mode */}
            {mode === 'edit' && (
              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode('view');
                    setHasChanges(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Anuluj
                </Button>
                <Button
                  onClick={() => setMode('view')}
                  disabled={!hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz zmiany
                </Button>
              </div>
            )}
          </div>
        </ReadonlyOverlay>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. Business Tooltip - Warehouse

### Scenariusz: Wyjaśnienie terminów magazynowych

```typescript
// apps/web/src/features/warehouse/components/WarehouseRequirementsTable.tsx
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HelpIcon } from '@/components/ui/help-icon';
import { BusinessTooltip } from '@/components/ui/business-tooltip';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ProfileRequirement } from '@/types/warehouse';

interface WarehouseRequirementsTableProps {
  requirements: ProfileRequirement[];
}

export function WarehouseRequirementsTable({ requirements }: WarehouseRequirementsTableProps) {
  return (
    <div className="space-y-4">
      {/* Nagłówek sekcji z tooltipem */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Zapotrzebowanie na profile</h2>
        <HelpIcon termKey="beamsCount" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              Profil
              <HelpIcon termKey="profileDepth" placement="inline" />
            </TableHead>
            <TableHead>Kolor</TableHead>
            <TableHead className="text-right">
              Liczba bel potrzebna
              <HelpIcon termKey="beamsCount" placement="inline" />
            </TableHead>
            <TableHead className="text-right">Stan magazynowy</TableHead>
            <TableHead className="text-right">Do zamówienia</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((req) => {
            const deficit = Math.max(0, req.required - req.stock);
            const hasEnough = req.stock >= req.required;
            const isLowStock = req.stock < req.required && req.stock > 0;
            const isOutOfStock = req.stock === 0;

            return (
              <TableRow key={req.id}>
                {/* Profil */}
                <TableCell className="font-medium">
                  {req.profileCode}
                </TableCell>

                {/* Kolor */}
                <TableCell>{req.colorName}</TableCell>

                {/* Liczba bel z tooltipem */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-semibold">{req.required}</span>
                    <BusinessTooltip
                      trigger={
                        <button className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      }
                      title="Zapotrzebowanie na bele"
                      explanation="Kompletne bele profilu (6 metrów każda) potrzebne do realizacji wszystkich aktywnych zleceń"
                      example={`${req.required} bel = ${(req.required * 6).toFixed(1)}m profilu`}
                      relatedTo={[
                        `Aktywne zlecenia: ${req.ordersCount}`,
                        `Łączna długość: ${(req.required * 6).toFixed(1)}m`
                      ]}
                    />
                  </div>
                </TableCell>

                {/* Stan magazynowy */}
                <TableCell className="text-right">
                  <span
                    className={
                      hasEnough
                        ? 'text-green-700 font-semibold'
                        : isOutOfStock
                        ? 'text-red-700 font-semibold'
                        : 'text-yellow-700 font-semibold'
                    }
                  >
                    {req.stock}
                  </span>
                </TableCell>

                {/* Do zamówienia */}
                <TableCell className="text-right">
                  {deficit > 0 ? (
                    <BusinessTooltip
                      trigger={
                        <span className="text-red-700 font-semibold cursor-help">
                          {deficit}
                        </span>
                      }
                      title="Niedobór profili"
                      explanation={`Brakuje ${deficit} bel aby zrealizować wszystkie aktywne zlecenia`}
                      example={`Zamów minimum ${deficit} bel (${(deficit * 6).toFixed(1)}m)`}
                      relatedTo={[
                        `Potrzeba: ${req.required} bel`,
                        `W magazynie: ${req.stock} bel`,
                        `Deficyt: ${deficit} bel`
                      ]}
                    >
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-red-700">Sugerowane akcje:</p>
                        <ul className="text-xs mt-1 space-y-1">
                          <li>• Złóż zamówienie na {deficit} bel</li>
                          <li>• Sprawdź dostawy w drodze</li>
                          <li>• Rozważ zmianę harmonogramu</li>
                        </ul>
                      </div>
                    </BusinessTooltip>
                  ) : (
                    <span className="text-green-700">-</span>
                  )}
                </TableCell>

                {/* Status badge z tooltipem */}
                <TableCell>
                  <BusinessTooltip
                    trigger={
                      <Badge
                        variant={
                          hasEnough
                            ? 'success'
                            : isOutOfStock
                            ? 'destructive'
                            : 'warning'
                        }
                        className="cursor-help"
                      >
                        {hasEnough ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Wystarczy
                          </>
                        ) : isOutOfStock ? (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Brak
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Niedobór
                          </>
                        )}
                      </Badge>
                    }
                    title={
                      hasEnough
                        ? 'Stan wystarczający'
                        : isOutOfStock
                        ? 'Brak profilu w magazynie'
                        : 'Niewystarczający stan'
                    }
                    explanation={
                      hasEnough
                        ? `Magazyn ma ${req.stock} bel, potrzeba ${req.required} - wystarczy z zapasem`
                        : isOutOfStock
                        ? `Profil nie jest dostępny w magazynie. Potrzeba ${req.required} bel do realizacji zleceń.`
                        : `Magazyn ma tylko ${req.stock} bel, a potrzeba ${req.required} bel. Brakuje ${deficit} bel.`
                    }
                    relatedTo={
                      req.ordersAffected
                        ? [`Dotyczy zleceń: ${req.ordersAffected.join(', ')}`]
                        : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Rozszerzenie business-glossary.ts o więcej terminów

```typescript
// apps/web/src/lib/business-glossary.ts (dodatkowe terminy)

export const BUSINESS_TERMS = {
  // ... istniejące terminy ...

  profileCode: {
    title: 'Kod profilu',
    explanation: 'Unikalny identyfikator profilu aluminiowego zawierający typ i wymiary',
    example: '12345 = profil typ 12, wymiar 345mm',
    relatedTo: ['Głębokość profilu', 'Specyfikacja techniczna']
  },

  stockLevel: {
    title: 'Poziom magazynowy',
    explanation: 'Aktualny stan danego profilu w magazynie wyrażony w belach (6m)',
    example: '25 bel = 150 metrów profilu dostępnego',
    relatedTo: ['Zapotrzebowanie', 'Zamówienia']
  },

  deliveryWeek: {
    title: 'Tydzień dostawy',
    explanation: 'Planowany tydzień przyjęcia dostawy od dostawcy według numeru tygodnia ISO',
    example: 'Tydzień 1 = pierwszy tydzień stycznia',
    relatedTo: ['Harmonogram', 'Zamówienia']
  },

  windowDimensions: {
    title: 'Wymiary okna',
    explanation: 'Szerokość × Wysokość okna w milimetrach',
    example: '1200×1400 = okno 120cm szerokości, 140cm wysokości',
    relatedTo: ['Zapotrzebowanie profili', 'Kalkulacja materiału']
  },

  palletOptimization: {
    title: 'Optymalizacja palet',
    explanation: 'Automatyczne rozmieszczenie okien na paletach aby zmaksymalizować wykorzystanie przestrzeni transportowej',
    example: 'Algorytm umieszcza maksymalnie 12-15 okien na standardowej palecie',
    relatedTo: ['Pakowanie', 'Transport', 'Dostawy']
  }
} as const;
```

---

## Podsumowanie Przykładów

### Co osiągnęliśmy?

1. **Contextual Toast** - Pełny kontekst dla użytkownika
2. **Destructive Dialog** - Bezpieczeństwo przed przypadkowym usunięciem
3. **Decision Colors** - Wizualne wskazówki co można/nie można
4. **Mode Toggle** - Jasne rozróżnienie view/edit
5. **Business Tooltip** - Pomoc w zrozumieniu terminów

### Wzorce integracji

Każdy przykład pokazuje:
- ✅ Pełną implementację komponentu
- ✅ Integrację z istniejącym kodem
- ✅ TypeScript types
- ✅ Accessibility (aria-*)
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

### Następne kroki

1. Kopiuj komponenty podstawowe do `apps/web/src/components/ui/`
2. Kopiuj utilities do `apps/web/src/lib/`
3. Kopiuj hooks do `apps/web/src/hooks/`
4. Integruj w istniejących feature modules
5. Testuj z prawdziwymi danymi

---

**Status:** ✅ Gotowe do użycia
**Ostatnia aktualizacja:** 30.12.2025
