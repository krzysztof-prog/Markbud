'use client';

/**
 * LogisticsCalendarView - Widok kalendarza dostaw logistycznych
 *
 * Wyświetla dostawy pogrupowane według daty.
 * Dla każdej dostawy pokazuje:
 * - Kod dostawy (np. "16.02.2026_I")
 * - Badge statusu (🔴 zablokowana / 🟠 warunkowa / 🟢 gotowa)
 * - Liczba pozycji
 * - Numer wersji
 * - Przycisk "Pokaż zmiany" (dla wersji > 1)
 */

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Package, RefreshCw, AlertCircle, GitCompare, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CalendarEntry, DeliveryStatus } from '../types';
import { DELIVERY_STATUS_LABELS } from '../types';
import { DeliveryVersionDiff } from './DeliveryVersionDiff';

// ========== Typy Props ==========

interface LogisticsCalendarViewProps {
  /** Lista wpisów kalendarza */
  entries: CalendarEntry[];
  /** Czy dane są ładowane */
  isLoading: boolean;
  /** Komunikat błędu */
  error?: string | null;
  /** Callback odświeżenia danych */
  onRefresh?: () => void;
}

// ========== Stałe ==========

/**
 * Mapowanie statusu dostawy na emoji
 */
const STATUS_EMOJI: Record<DeliveryStatus, string> = {
  ready: '🟢',
  blocked: '🔴',
  conditional: '🟠',
};

/**
 * Mapowanie statusu dostawy na klasy Tailwind
 */
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

// ========== Komponenty pomocnicze ==========

/**
 * Skeleton dla ładowania kalendarza
 */
function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Symulacja 3 dni */}
      {[1, 2, 3].map((day) => (
        <div key={day} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Karta pojedynczej dostawy w kalendarzu
 */
interface DeliveryCardProps {
  entry: CalendarEntry;
  /** Callback do otwarcia modala z diffem */
  onShowDiff?: (deliveryCode: string, currentVersion: number) => void;
  /** Callback do nawigacji do szczegółów */
  onNavigateToDetail?: (deliveryCode: string) => void;
}

function DeliveryCard({ entry, onShowDiff, onNavigateToDetail }: DeliveryCardProps) {
  const statusEmoji = STATUS_EMOJI[entry.deliveryStatus];
  const statusClasses = STATUS_BADGE_CLASSES[entry.deliveryStatus];
  const statusLabel = DELIVERY_STATUS_LABELS[entry.deliveryStatus];

  // Pokaż przycisk "Pokaż zmiany" dla wersji > 1
  const canShowDiff = entry.version > 1;

  // Sprawdź czy to świeża aktualizacja (nowa wersja w ostatnich 24h)
  const isNewVersion = entry.version > 1 && entry.isUpdate && isRecentEntry(entry.createdAt);

  const handleShowDiff = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShowDiff?.(entry.deliveryCode, entry.version);
    },
    [entry.deliveryCode, entry.version, onShowDiff]
  );

  const handleCardClick = useCallback(() => {
    onNavigateToDetail?.(entry.deliveryCode);
  }, [entry.deliveryCode, onNavigateToDetail]);

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        entry.deliveryStatus === 'blocked' && 'border-red-200',
        entry.deliveryStatus === 'conditional' && 'border-yellow-200',
        isNewVersion && 'ring-2 ring-purple-300 ring-offset-1'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Badge "Nowa wersja" dla świeżych aktualizacji */}
        {isNewVersion && (
          <div className="flex items-center gap-1 mb-2">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Nowa wersja
            </Badge>
          </div>
        )}

        {/* Nagłówek - kod dostawy i status */}
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm">{entry.deliveryCode}</div>
          <Badge variant="outline" className={cn('text-xs', statusClasses)}>
            {statusEmoji} {statusLabel}
          </Badge>
        </div>

        {/* Szczegóły */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {/* Liczba pozycji */}
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            <span>{entry._count.items} pozycji</span>
          </div>

          {/* Numer wersji */}
          <div className="flex items-center gap-1">
            <span className="text-xs">v{entry.version}</span>
            {entry.isUpdate && (
              <span title="Aktualizacja">
                <RefreshCw className="h-3 w-3 text-blue-500" />
              </span>
            )}
          </div>
        </div>

        {/* Przycisk "Pokaż zmiany" dla wersji > 1 */}
        {canShowDiff && (
          <div className="mt-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={handleShowDiff}
            >
              <GitCompare className="h-3 w-3 mr-1" />
              Pokaż zmiany od v{entry.version - 1}
            </Button>
          </div>
        )}

        {/* Pozycje blokujące (jeśli są) */}
        {entry.blockedItems.length > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed">
            <div className="text-xs text-red-600 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Blokuje: {entry.blockedItems.slice(0, 2).map((b) => b.projectNumber).join(', ')}
                {entry.blockedItems.length > 2 && ` (+${entry.blockedItems.length - 2})`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Formatuje datę do czytelnej formy polskiej
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Grupuje wpisy kalendarza według daty dostawy
 */
function groupEntriesByDate(entries: CalendarEntry[] | undefined | null): Map<string, CalendarEntry[]> {
  const grouped = new Map<string, CalendarEntry[]>();

  // Guard: jeśli entries nie jest tablicą, zwróć pustą mapę
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
  const sortedMap = new Map(
    [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  );

  return sortedMap;
}

// ========== Główny komponent ==========

/**
 * Widok kalendarza dostaw logistycznych
 *
 * Grupuje dostawy według daty i wyświetla je jako karty.
 * Każda karta pokazuje status, liczbę pozycji i wersję.
 */
export function LogisticsCalendarView({
  entries,
  isLoading,
  error,
  onRefresh,
}: LogisticsCalendarViewProps) {
  const router = useRouter();

  // Grupowanie wpisów według daty
  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries]);

  // Stan dialogu z diffem
  const [diffDialog, setDiffDialog] = useState<{
    open: boolean;
    deliveryCode: string;
    versionFrom: number;
    versionTo: number;
  }>({
    open: false,
    deliveryCode: '',
    versionFrom: 0,
    versionTo: 0,
  });

  // Obsługa otwarcia dialogu z diffem
  const handleShowDiff = useCallback((deliveryCode: string, currentVersion: number) => {
    setDiffDialog({
      open: true,
      deliveryCode,
      versionFrom: currentVersion - 1,
      versionTo: currentVersion,
    });
  }, []);

  // Zamknięcie dialogu
  const handleCloseDiff = useCallback(() => {
    setDiffDialog((prev) => ({ ...prev, open: false }));
  }, []);

  // Nawigacja do szczegółów dostawy
  const handleNavigateToDetail = useCallback((deliveryCode: string) => {
    router.push(`/logistyka/${encodeURIComponent(deliveryCode)}`);
  }, [router]);

  // Stan ładowania
  if (isLoading) {
    return <CalendarSkeleton />;
  }

  // Stan błędu
  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-red-500" />}
        title="Błąd ładowania kalendarza"
        description={error}
        action={
          onRefresh
            ? {
                label: 'Spróbuj ponownie',
                onClick: onRefresh,
              }
            : undefined
        }
      />
    );
  }

  // Brak danych
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="Brak zaplanowanych dostaw"
        description="Nie ma żadnych list mailowych dla wybranego okresu. Kliknij 'Nowy mail' aby dodać pierwszą listę."
      />
    );
  }

  return (
    <>
      <div className="space-y-8">
        {Array.from(groupedEntries.entries()).map(([date, dayEntries]) => (
          <div key={date}>
            {/* Nagłówek daty */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-900 capitalize">
                {formatDate(date)}
              </h3>
              <Badge variant="outline" className="ml-2">
                {dayEntries.length} {dayEntries.length === 1 ? 'dostawa' : 'dostawy'}
              </Badge>
            </div>

            {/* Karty dostaw */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dayEntries.map((entry) => (
                <DeliveryCard
                  key={entry.id}
                  entry={entry}
                  onShowDiff={handleShowDiff}
                  onNavigateToDetail={handleNavigateToDetail}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog z porównaniem wersji */}
      <Dialog open={diffDialog.open} onOpenChange={handleCloseDiff}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Zmiany w liście: {diffDialog.deliveryCode}
            </DialogTitle>
          </DialogHeader>
          {diffDialog.open && (
            <DeliveryVersionDiff
              deliveryCode={diffDialog.deliveryCode}
              versionFrom={diffDialog.versionFrom}
              versionTo={diffDialog.versionTo}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LogisticsCalendarView;
