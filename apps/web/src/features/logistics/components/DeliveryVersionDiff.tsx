'use client';

/**
 * DeliveryVersionDiff - Komponent wyświetlający różnice między wersjami listy mailowej
 * z przyciskami akcji dla każdej pozycji
 *
 * Pokazuje:
 * - Dodane pozycje (zielone) - przyciski: Potwierdź / Odrzuć
 * - Usunięte pozycje (czerwone) - przyciski: Usuń z dostawy / Ignoruj
 * - Zmienione pozycje (żółte) - przyciski: Zaakceptuj zmianę / Przywróć poprzednią wartość
 *
 * Każda pozycja pokazuje powiązane zlecenie (orderNumber, client) jeśli istnieje
 */

import { useMemo, useState, useCallback } from 'react';
import { Plus, Minus, RefreshCw, AlertCircle, Loader2, Check, X, Undo2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useVersionDiff, useDiffActions } from '../hooks';
import type { VersionDiff, DiffAddedItem, DiffRemovedItem, DiffChangedItem, DiffOrderInfo } from '../types';

// ========== Typy Props ==========

interface DeliveryVersionDiffProps {
  /** Kod dostawy (np. "16.02.2026_I") */
  deliveryCode: string;
  /** Numer wersji źródłowej (starsza) */
  versionFrom: number;
  /** Numer wersji docelowej (nowsza) */
  versionTo: number;
  /** Opcjonalna klasa CSS */
  className?: string;
  /** Callback po wykonaniu akcji (do odświeżenia widoku) */
  onActionComplete?: () => void;
}

// ========== Komponenty pomocnicze ==========

/**
 * Wyświetla informacje o powiązanym zleceniu
 */
function OrderInfo({ order }: { order?: DiffOrderInfo }) {
  if (!order) {
    return <span className="text-xs text-gray-400 italic">brak powiązania</span>;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-gray-600">
      <ExternalLink className="h-3 w-3" />
      <span className="font-medium">#{order.orderNumber}</span>
      {order.client && <span className="text-gray-500">({order.client})</span>}
    </div>
  );
}

/**
 * Wiersz z dodaną pozycją + przyciski akcji
 */
function AddedItemRow({
  item,
  onConfirm,
  onReject,
  isPending,
  isProcessed,
}: {
  item: DiffAddedItem;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
  isProcessed: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-md border ${
      isProcessed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-green-50 border-green-200'
    }`}>
      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-green-800">{item.projectNumber}</span>
          {item.notes && <span className="text-sm text-green-600 truncate">({item.notes})</span>}
        </div>
        <OrderInfo order={item.order} />
      </div>
      {!isProcessed && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-100"
            onClick={onConfirm}
            disabled={isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Potwierdź
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100"
            onClick={onReject}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Odrzuć
          </Button>
        </div>
      )}
      {isProcessed && (
        <Badge variant="secondary" className="bg-gray-200">Obsłużone</Badge>
      )}
    </div>
  );
}

/**
 * Wiersz z usuniętą pozycją + przyciski akcji
 */
function RemovedItemRow({
  item,
  onRemove,
  onIgnore,
  isPending,
  isProcessed,
}: {
  item: DiffRemovedItem;
  onRemove: () => void;
  onIgnore: () => void;
  isPending: boolean;
  isProcessed: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-md border ${
      isProcessed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-red-50 border-red-200'
    }`}>
      <Minus className="h-4 w-4 text-red-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-red-800 line-through">{item.projectNumber}</span>
          {item.notes && <span className="text-sm text-red-600 truncate">({item.notes})</span>}
        </div>
        <OrderInfo order={item.order} />
      </div>
      {!isProcessed && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100"
            onClick={onRemove}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Usuń z dostawy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100"
            onClick={onIgnore}
            disabled={isPending}
          >
            Ignoruj
          </Button>
        </div>
      )}
      {isProcessed && (
        <Badge variant="secondary" className="bg-gray-200">Obsłużone</Badge>
      )}
    </div>
  );
}

/**
 * Wiersz ze zmienioną pozycją + przyciski akcji
 */
function ChangedItemRow({
  item,
  onAccept,
  onRestore,
  isPending,
  isProcessed,
}: {
  item: DiffChangedItem;
  onAccept: () => void;
  onRestore: () => void;
  isPending: boolean;
  isProcessed: boolean;
}) {
  // Tłumaczenie nazw pól na polski
  const fieldLabels: Record<string, string> = {
    quantity: 'Ilość',
    rawNotes: 'Notatki',
    requiresMesh: 'Siatka',
    missingFile: 'Brak pliku',
    unconfirmed: 'Niepotwierdzone',
    dimensionsUnconfirmed: 'Wymiary niepotw.',
    drawingUnconfirmed: 'Rysunek niepotw.',
    excludeFromProduction: 'Wykluczone z prod.',
    specialHandle: 'Specjalna klamka',
    customColor: 'Kolor',
    orderId: 'Zlecenie',
    itemStatus: 'Status',
    status: 'Status',
  };

  const fieldLabel = fieldLabels[item.field] || item.field;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border ${
      isProcessed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <RefreshCw className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-yellow-800">{item.projectNumber}</span>
        </div>
        <div className="text-sm text-yellow-700 mt-1">
          <span className="font-medium">{fieldLabel}:</span>{' '}
          <span className="line-through text-yellow-600">{item.oldValue || '(brak)'}</span>
          {' → '}
          <span className="text-yellow-800 font-medium">{item.newValue || '(brak)'}</span>
        </div>
        <OrderInfo order={item.order} />
      </div>
      {!isProcessed && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-100"
            onClick={onAccept}
            disabled={isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Zaakceptuj
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            onClick={onRestore}
            disabled={isPending}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Przywróć
          </Button>
        </div>
      )}
      {isProcessed && (
        <Badge variant="secondary" className="bg-gray-200">Obsłużone</Badge>
      )}
    </div>
  );
}

/**
 * Sekcja z nagłówkiem i liczbą pozycji
 */
function DiffSection({
  title,
  count,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'yellow';
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${colorClasses[color]}`} />
        <h4 className="font-medium text-gray-900">{title}</h4>
        <Badge variant="secondary" className="ml-auto">
          {count}
        </Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ========== Główny komponent ==========

/**
 * Komponent wyświetlający różnice między dwoma wersjami listy mailowej
 * z przyciskami akcji dla każdej pozycji
 */
export function DeliveryVersionDiff({
  deliveryCode,
  versionFrom,
  versionTo,
  className = '',
  onActionComplete,
}: DeliveryVersionDiffProps) {
  // Stan dla obsłużonych pozycji (śledzenie lokalnie)
  const [processedItems, setProcessedItems] = useState<Set<string>>(new Set());

  // Pobierz diff z API
  const { data, isLoading, error, refetch } = useVersionDiff(deliveryCode, versionFrom, versionTo);

  // Hooki akcji
  const {
    removeMutation,
    confirmMutation,
    rejectMutation,
    acceptChangeMutation,
    restoreMutation,
    isAnyPending,
  } = useDiffActions();

  // Wyciągnij diff z odpowiedzi
  const diff: VersionDiff | null = useMemo(() => {
    return data?.diff ?? null;
  }, [data]);

  // Sprawdź czy są jakiekolwiek zmiany
  const hasChanges = useMemo(() => {
    if (!diff) return false;
    return diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
  }, [diff]);

  // Generuj unikalny klucz dla pozycji
  const getItemKey = useCallback((type: 'added' | 'removed' | 'changed', itemId: number) => {
    return `${type}-${itemId}`;
  }, []);

  // Oznacz pozycję jako obsłużoną
  const markAsProcessed = useCallback((key: string) => {
    setProcessedItems(prev => new Set([...prev, key]));
    onActionComplete?.();
    // Odśwież dane po 500ms aby UI się zaktualizowało
    setTimeout(() => refetch(), 500);
  }, [onActionComplete, refetch]);

  // Handlery akcji dla dodanych pozycji
  const handleConfirmAdded = useCallback((item: DiffAddedItem) => {
    confirmMutation.mutate(item.itemId, {
      onSuccess: () => markAsProcessed(getItemKey('added', item.itemId)),
    });
  }, [confirmMutation, getItemKey, markAsProcessed]);

  const handleRejectAdded = useCallback((item: DiffAddedItem) => {
    rejectMutation.mutate(item.itemId, {
      onSuccess: () => markAsProcessed(getItemKey('added', item.itemId)),
    });
  }, [rejectMutation, getItemKey, markAsProcessed]);

  // Handlery akcji dla usuniętych pozycji
  const handleRemoveFromDelivery = useCallback((item: DiffRemovedItem) => {
    removeMutation.mutate(item.itemId, {
      onSuccess: () => markAsProcessed(getItemKey('removed', item.itemId)),
    });
  }, [removeMutation, getItemKey, markAsProcessed]);

  const handleIgnoreRemoved = useCallback((item: DiffRemovedItem) => {
    // "Ignoruj" oznacza po prostu zaznaczenie jako obsłużone bez akcji w bazie
    markAsProcessed(getItemKey('removed', item.itemId));
  }, [getItemKey, markAsProcessed]);

  // Handlery akcji dla zmienionych pozycji
  const handleAcceptChange = useCallback((item: DiffChangedItem) => {
    acceptChangeMutation.mutate(item.itemId, {
      onSuccess: () => markAsProcessed(getItemKey('changed', item.itemId)),
    });
  }, [acceptChangeMutation, getItemKey, markAsProcessed]);

  const handleRestoreValue = useCallback((item: DiffChangedItem) => {
    restoreMutation.mutate(
      { itemId: item.itemId, field: item.field, previousValue: item.oldValue },
      { onSuccess: () => markAsProcessed(getItemKey('changed', item.itemId)) }
    );
  }, [restoreMutation, getItemKey, markAsProcessed]);

  // Stan ładowania
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Ładowanie różnic...</span>
        </CardContent>
      </Card>
    );
  }

  // Błąd
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nie udało się pobrać różnic: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Brak diff
  if (!diff) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nie znaleziono danych do porównania.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Brak zmian
  if (!hasChanges) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">
            Zmiany: v{versionFrom} → v{versionTo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Brak różnic między wersjami v{versionFrom} i v{versionTo}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Zlicz nieobsłużone pozycje
  const unprocessedCount =
    diff.added.filter(i => !processedItems.has(getItemKey('added', i.itemId))).length +
    diff.removed.filter(i => !processedItems.has(getItemKey('removed', i.itemId))).length +
    diff.changed.filter(i => !processedItems.has(getItemKey('changed', i.itemId))).length;

  // Wyświetl diff z akcjami
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Zmiany: v{versionFrom} → v{versionTo}
          </CardTitle>
          {unprocessedCount > 0 ? (
            <Badge variant="outline" className="bg-orange-100 text-orange-700">
              {unprocessedCount} do obsłużenia
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-100 text-green-700">
              Wszystkie obsłużone
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dodane pozycje */}
        <DiffSection title="Dodane" count={diff.added.length} icon={Plus} color="green">
          {diff.added.map((item) => (
            <AddedItemRow
              key={`added-${item.itemId}`}
              item={item}
              onConfirm={() => handleConfirmAdded(item)}
              onReject={() => handleRejectAdded(item)}
              isPending={isAnyPending}
              isProcessed={processedItems.has(getItemKey('added', item.itemId))}
            />
          ))}
        </DiffSection>

        {/* Usunięte pozycje */}
        <DiffSection title="Usunięte" count={diff.removed.length} icon={Minus} color="red">
          {diff.removed.map((item) => (
            <RemovedItemRow
              key={`removed-${item.itemId}`}
              item={item}
              onRemove={() => handleRemoveFromDelivery(item)}
              onIgnore={() => handleIgnoreRemoved(item)}
              isPending={isAnyPending}
              isProcessed={processedItems.has(getItemKey('removed', item.itemId))}
            />
          ))}
        </DiffSection>

        {/* Zmienione pozycje */}
        <DiffSection title="Zmienione" count={diff.changed.length} icon={RefreshCw} color="yellow">
          {diff.changed.map((item) => (
            <ChangedItemRow
              key={`changed-${item.itemId}`}
              item={item}
              onAccept={() => handleAcceptChange(item)}
              onRestore={() => handleRestoreValue(item)}
              isPending={isAnyPending}
              isProcessed={processedItems.has(getItemKey('changed', item.itemId))}
            />
          ))}
        </DiffSection>
      </CardContent>
    </Card>
  );
}

export default DeliveryVersionDiff;
