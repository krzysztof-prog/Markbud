'use client';

import React, { useCallback } from 'react';
import { Package, Loader2, AlertCircle, Check, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSchucoItems, useSchucoItemsFetch } from '../hooks/useSchucoItems';
import { toast } from '@/hooks/useToast';
import type { SchucoOrderItem } from '@/types';

interface DeliveryItemsExpanderProps {
  deliveryId: number;
  orderNumber: string;
  itemsFetchedAt?: string | null;
}

/**
 * Komponent rozwijalnej listy pozycji zamówienia Schüco
 * Lazy load - pobiera dane dopiero po rozwinięciu
 */
export const DeliveryItemsExpander: React.FC<DeliveryItemsExpanderProps> = ({
  deliveryId,
  orderNumber,
  itemsFetchedAt,
}) => {
  // Pobieraj dane - komponent jest renderowany tylko gdy rozwinięty
  const { data: items, isLoading, error, refetch } = useSchucoItems(deliveryId, true);

  // Mutacja do pobierania pozycji dla tego zamówienia
  const fetchItemsMutation = useSchucoItemsFetch();

  // Handler odświeżania pozycji dla tego zamówienia
  const handleRefreshItems = useCallback(() => {
    fetchItemsMutation.mutate(
      { deliveryIds: [deliveryId] },
      {
        onSuccess: (result) => {
          toast({
            variant: 'success',
            title: 'Pozycje pobrane',
            description: `Pobrano ${result.newItems + result.updatedItems} pozycji dla zamówienia ${orderNumber}`,
          });
          // Odśwież dane po pobraniu
          refetch();
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Błąd pobierania',
            description: error.message || 'Nie udało się pobrać pozycji',
          });
        },
      }
    );
  }, [deliveryId, orderNumber, fetchItemsMutation, refetch]);

  // Status czy pozycje były kiedykolwiek pobrane
  // Użyj items.length jako fallback jeśli itemsFetchedAt nie jest ustawione
  const hasBeenFetched = !!itemsFetchedAt || (items && items.length > 0);
  const isFetching = fetchItemsMutation.isPending;

  return (
    <div className="w-full">
      {/* Nagłówek z przyciskiem odświeżania */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Pozycje zamówienia {orderNumber}</span>
          {hasBeenFetched ? (
            <Badge variant="outline" className="text-xs">
              {items?.length ?? '...'} pozycji
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Nie pobrano
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshItems}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isFetching ? 'Pobieranie...' : 'Odśwież pozycje'}
        </Button>
      </div>

      {/* Zawartość */}
      <div className="rounded-md border bg-card">
        {isLoading || isFetching ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {isFetching ? 'Pobieranie pozycji z Schüco...' : 'Ładowanie pozycji...'}
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4 text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">Błąd ładowania pozycji</span>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {hasBeenFetched
              ? 'Brak pozycji dla tego zamówienia'
              : 'Kliknij "Odśwież pozycje" aby pobrać artykuły z Schüco Connect.'}
          </div>
        ) : (
          <ItemsTable items={items} />
        )}
      </div>
    </div>
  );
};

/**
 * Wyciąga kod koloru z pozycji Schüco.
 * Kolor jest potwierdzony tylko gdy ostatnie 3 cyfry numeru artykułu
 * pojawiają się też jako osobny token w opisie (podwójna walidacja).
 * Eliminuje fałszywe trafienia dla klamek, wkrętów, uszczelek itp.
 */
function extractColorCode(articleNumber: string, description: string): string | null {
  const digits = articleNumber.replace(/\D/g, '');
  if (digits.length < 6) return null;
  const candidate = digits.slice(-3);
  // Sprawdź czy kandydat pojawia się w opisie jako osobne słowo/token
  const descWords = description.split(/[\s/\\.,;()[\]]+/);
  if (descWords.includes(candidate)) return candidate;
  return null;
}

/** Zwraca dominujący tydzień dostawy (najczęściej występujący) */
function getDominantWeek(items: SchucoOrderItem[]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.deliveryWeek) counts[item.deliveryWeek] = (counts[item.deliveryWeek] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/** Zwraca dominujący kod koloru w zamówieniu (najczęściej występujący spośród pozycji z rozpoznanym kolorem) */
function getDominantColor(items: SchucoOrderItem[]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const code = extractColorCode(item.articleNumber, item.articleDescription);
    if (code) counts[code] = (counts[code] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/**
 * Tabela z pozycjami zamówienia
 */
const ItemsTable: React.FC<{ items: SchucoOrderItem[] }> = ({ items }) => {
  const dominantColor = getDominantColor(items);
  const dominantWeek = getDominantWeek(items);
  const hasColorMismatch = dominantColor !== null &&
    items.some((item) => {
      const code = extractColorCode(item.articleNumber, item.articleDescription || '');
      return code !== null && code !== dominantColor;
    });

  return (
    <div className="overflow-x-auto">
      {hasColorMismatch && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          Pozycje z różnymi kodami koloru — dominujący: <strong>{dominantColor}</strong>. Sprawdź pozycje oznaczone na żółto.
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-12">Poz.</TableHead>
            <TableHead className="w-28">Nr artykułu</TableHead>
            <TableHead>Opis</TableHead>
            <TableHead className="w-28 text-center">Wysłane/Zamówione</TableHead>
            <TableHead className="w-24">Wymiary</TableHead>
            <TableHead className="w-20">Tydzień</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} dominantColor={dominantColor} dominantWeek={dominantWeek} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Pojedynczy wiersz pozycji
 */
const ItemRow: React.FC<{ item: SchucoOrderItem; dominantColor: string | null; dominantWeek: string | null }> = ({ item, dominantColor, dominantWeek }) => {
  const isFullyShipped = item.shippedQty >= item.orderedQty;
  const isPartiallyShipped = item.shippedQty > 0 && item.shippedQty < item.orderedQty;

  // Parsuj zmienione pola jeśli są
  const changedFields: string[] = item.changedFields ? JSON.parse(item.changedFields) : [];
  const isChanged = item.changeType === 'updated' && changedFields.length > 0;
  const isNew = item.changeType === 'new';

  // Sprawdź czy kolor różni się od dominującego
  const itemColor = extractColorCode(item.articleNumber, item.articleDescription || '');
  const hasColorDiff = dominantColor !== null && itemColor !== null && itemColor !== dominantColor;

  // Sprawdź czy tydzień różni się od dominującego
  const hasWeekDiff = dominantWeek !== null && item.deliveryWeek !== null && item.deliveryWeek !== dominantWeek;

  return (
    <TableRow
      className={cn(
        'text-xs',
        isNew && 'bg-green-50 dark:bg-green-950/20',
        isChanged && !hasColorDiff && !hasWeekDiff && 'bg-yellow-50 dark:bg-yellow-950/20',
        hasColorDiff && 'bg-amber-100 dark:bg-amber-950/30',
        hasWeekDiff && !hasColorDiff && 'bg-blue-50 dark:bg-blue-950/20'
      )}
    >
      <TableCell className="font-medium">{item.position}</TableCell>
      <TableCell className="font-mono text-xs">
        <div className="flex items-center gap-1">
          {item.articleNumber}
          {hasColorDiff && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1"
              title={`Inny kolor: ${itemColor} (dominujący: ${dominantColor})`}
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {itemColor}
            </span>
          )}
          {isNew && (
            <Badge variant="default" className="text-[10px] px-1 py-0">
              nowy
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="max-w-xs truncate" title={item.articleDescription}>
        {item.articleDescription}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span
            className={cn(
              'font-medium',
              isFullyShipped && 'text-green-600 dark:text-green-400',
              isPartiallyShipped && 'text-yellow-600 dark:text-yellow-400',
              !isPartiallyShipped && !isFullyShipped && 'text-muted-foreground'
            )}
          >
            {item.shippedQty}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span>{item.orderedQty}</span>
          <span className="text-muted-foreground ml-1">{item.unit}</span>
          {isFullyShipped && <Check className="h-3 w-3 text-green-600 ml-1" />}
        </div>
        {isChanged && changedFields.includes('shippedQty') && (
          <Badge variant="outline" className="text-[10px] mt-1">
            zmiana
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{item.dimensions || '-'}</TableCell>
      <TableCell>
        {item.deliveryWeek ? (
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              hasWeekDiff && 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30 font-semibold'
            )}
          >
            {item.deliveryWeek}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
        {isChanged && changedFields.includes('deliveryWeek') && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] ml-1',
              hasWeekDiff && 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30'
            )}
          >
            zmiana
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
};

export default DeliveryItemsExpander;
