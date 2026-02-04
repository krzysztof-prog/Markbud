'use client';

/**
 * LogisticsLeftPanel - Lewa kolumna layoutu 3-strefowego
 *
 * Kompaktowy widok kalendarza z listą dostaw.
 * Pozwala na wybór dostawy do wyświetlenia w środkowej kolumnie.
 */

import { useMemo, useCallback } from 'react';
import { Calendar, Package, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CalendarEntry, DeliveryStatus } from '../types';
import { DELIVERY_STATUS_LABELS } from '../types';

// ========== Props ==========

interface LogisticsLeftPanelProps {
  /** Lista wpisów kalendarza */
  entries: CalendarEntry[];
  /** Czy dane są ładowane */
  isLoading: boolean;
  /** Aktualnie wybrany kod dostawy */
  selectedDeliveryCode: string | null;
  /** Callback wyboru dostawy */
  onDeliverySelect: (deliveryCode: string) => void;
  /** Callback odświeżenia */
  onRefresh?: () => void;
}

// ========== Stałe ==========

const STATUS_EMOJI: Record<DeliveryStatus, string> = {
  ready: '🟢',
  blocked: '🔴',
  conditional: '🟠',
};

const STATUS_BADGE_CLASSES: Record<DeliveryStatus, string> = {
  ready: 'bg-green-100 text-green-800 border-green-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
  conditional: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

/**
 * Sprawdza czy wpis jest świeży (utworzony w ciągu ostatnich 24h)
 */
function isRecentEntry(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 24;
}

/**
 * Formatuje datę do krótkiej formy
 */
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Grupuje wpisy według daty
 */
function groupEntriesByDate(entries: CalendarEntry[] | undefined | null): Map<string, CalendarEntry[]> {
  const grouped = new Map<string, CalendarEntry[]>();

  if (!entries || !Array.isArray(entries)) {
    return grouped;
  }

  for (const entry of entries) {
    const date = entry.deliveryDate;
    const existing = grouped.get(date) || [];
    existing.push(entry);
    grouped.set(date, existing);
  }

  // Sortuj daty rosnąco
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

// ========== Komponenty pomocnicze ==========

function PanelSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

interface DeliveryItemProps {
  entry: CalendarEntry;
  isSelected: boolean;
  onSelect: () => void;
}

function DeliveryItem({ entry, isSelected, onSelect }: DeliveryItemProps) {
  const isNewVersion = entry.version > 1 && entry.isUpdate && isRecentEntry(entry.createdAt);

  return (
    <div
      className={cn(
        'p-2 rounded-lg cursor-pointer transition-all border',
        isSelected
          ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
          : 'hover:bg-slate-50 border-transparent hover:border-slate-200',
        entry.deliveryStatus === 'blocked' && !isSelected && 'border-red-200',
        isNewVersion && !isSelected && 'ring-1 ring-purple-200'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isNewVersion && (
            <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{entry.deliveryCode}</span>
        </div>
        <span className="text-xs flex-shrink-0">
          {STATUS_EMOJI[entry.deliveryStatus]}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {entry._count.items}
        </span>
        <span>v{entry.version}</span>
      </div>
    </div>
  );
}

// ========== Główny komponent ==========

export function LogisticsLeftPanel({
  entries,
  isLoading,
  selectedDeliveryCode,
  onDeliverySelect,
  onRefresh,
}: LogisticsLeftPanelProps) {
  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries]);

  const handleSelect = useCallback(
    (code: string) => {
      onDeliverySelect(code);
    },
    [onDeliverySelect]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Dostawy
          </CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 w-7 p-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <PanelSkeleton />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Calendar className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">Brak dostaw</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedEntries.entries()).map(([date, dayEntries]) => (
              <div key={date}>
                {/* Nagłówek daty */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {formatDateShort(date)}
                  </span>
                  <Badge variant="outline" className="text-xs h-5">
                    {dayEntries.length}
                  </Badge>
                </div>

                {/* Lista dostaw */}
                <div className="space-y-1">
                  {dayEntries.map((entry) => (
                    <DeliveryItem
                      key={entry.id}
                      entry={entry}
                      isSelected={selectedDeliveryCode === entry.deliveryCode}
                      onSelect={() => handleSelect(entry.deliveryCode)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LogisticsLeftPanel;
