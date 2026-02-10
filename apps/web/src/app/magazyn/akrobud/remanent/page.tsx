'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { colorsApi, warehouseApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Warehouse,
  ClipboardCheck,
  Archive,
  History,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import type { Color } from '@/types';
import type { RemanentFormEntry, FinalizeMonthResponse } from '@/types/warehouse';

// Komponenty remanentu
import { RemanentTable } from '@/features/warehouse/remanent/components/RemanentTable';
import { RemanentConfirmModal } from '@/features/warehouse/remanent/components/RemanentConfirmModal';
import { FinalizeMonthModal } from '@/features/warehouse/remanent/components/FinalizeMonthModal';

// Hooki remanentu
import { useRemanentSubmit, useFinalizeMonth } from '@/features/warehouse/remanent/hooks/useRemanent';
import {
  useRemanentHistory,
  groupRemanentHistory,
  useRollback
} from '@/features/warehouse/remanent/hooks/useRemanentHistory';

export default function RemanentPage() {
  const _router = useRouter();

  // Stan wyboru koloru i UI
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [entries, setEntries] = useState<RemanentFormEntry[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizePreview, setFinalizePreview] = useState<FinalizeMonthResponse | null>(null);

  // Pobierz kolory AKROBUD (isAkrobud=true)
  const { data: colors } = useQuery({
    queryKey: ['colors', { isAkrobud: true }],
    queryFn: () => colorsApi.getAll({ isAkrobud: true }),
  });

  // Pobierz dane magazynowe dla wybranego koloru
  const { data: warehouseData, isLoading: warehouseLoading } = useQuery({
    queryKey: ['warehouse', selectedColorId],
    queryFn: () => warehouseApi.getByColor(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Pobierz historię remanentów dla wybranego koloru
  const { data: historyData, isLoading: historyLoading } = useRemanentHistory(selectedColorId, 50);

  // Mutacje
  const submitMutation = useRemanentSubmit();
  const finalizeMutation = useFinalizeMonth();
  const rollbackMutation = useRollback();

  // Ustaw pierwszy kolor jako domyślny
  if (colors?.length && !selectedColorId) {
    setSelectedColorId(colors[0].id);
  }

  const selectedColor = colors?.find((c: Color) => c.id === selectedColorId);

  // Handler zmiany wpisów formularza
  const handleEntriesChange = useCallback((newEntries: RemanentFormEntry[]) => {
    setEntries(newEntries);
  }, []);

  // Handler zapisu remanentu
  const handleSubmit = () => {
    if (!selectedColorId) return;

    // Przygotuj dane - puste wartości traktuj jako 0
    const updates = entries.map((entry) => ({
      profileId: entry.profileId,
      actualStock: entry.actualStock === '' ? 0 : Number(entry.actualStock),
    }));

    submitMutation.mutate(
      { colorId: selectedColorId, updates },
      {
        onSuccess: () => {
          setShowConfirmModal(false);
          setEntries([]); // Reset formularza
        },
      }
    );
  };

  // Handler finalizacji miesiąca
  const handleFinalize = (month: string, archive: boolean) => {
    finalizeMutation.mutate(
      { month, archive },
      {
        onSuccess: (response) => {
          if (response.preview) {
            // Zapisz dane podglądu
            setFinalizePreview(response);
          } else {
            // Archiwizacja zakończona - zamknij modal
            setShowFinalizeModal(false);
            setFinalizePreview(null);
          }
        },
      }
    );
  };

  // Handler rollback
  const handleRollback = (colorId: number) => {
    rollbackMutation.mutate(colorId);
  };

  // Grupuj historię
  const groupedHistory = historyData ? groupRemanentHistory(historyData) : [];

  // Grupuj kolory
  const typicalColors = colors?.filter((c: Color) => c.type === 'typical') || [];
  const atypicalColors = colors?.filter((c: Color) => c.type === 'atypical') || [];

  // Statystyki formularza
  const filledCount = entries.filter((e) => e.actualStock !== '').length;
  const hasEntries = entries.length > 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Remanent magazynu">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFinalizeModal(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            Finalizuj miesiąc
          </Button>
          <Link href="/magazyn/akrobud">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
          </Link>
        </div>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'AKROBUD', href: '/magazyn/akrobud', icon: <Warehouse className="h-4 w-4" /> },
            { label: 'Remanent', icon: <ClipboardCheck className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Sidebar z kolorami */}
        <div className="w-full lg:w-64 border-r border-b lg:border-b-0 bg-white overflow-y-auto max-h-48 lg:max-h-full">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
              Wybierz kolor
            </h3>

            {/* Typowe */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Typowe</p>
              <div className="space-y-1">
                {typicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      setEntries([]); // Reset formularza przy zmianie koloru
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      selectedColorId === color.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color.hexColor || '#ccc' }}
                    />
                    <span className="font-mono text-xs">{color.code}</span>
                    <span className="flex-1 truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nietypowe */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Nietypowe</p>
              <div className="space-y-1">
                {atypicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      setEntries([]);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      selectedColorId === color.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color.hexColor || '#ccc' }}
                    />
                    <span className="font-mono text-xs">{color.code}</span>
                    <span className="flex-1 truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {selectedColor && (
            <div className="space-y-6">
              {/* Nagłówek koloru */}
              <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                <div
                  className="w-8 h-8 md:w-10 md:h-10 rounded border-2 flex-shrink-0"
                  style={{ backgroundColor: selectedColor.hexColor || '#ccc' }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold truncate">
                    {selectedColor.code} - {selectedColor.name}
                  </h2>
                  <Badge variant={selectedColor.type === 'typical' ? 'secondary' : 'outline'} className="mt-1">
                    {selectedColor.type === 'typical' ? 'Typowy' : 'Nietypowy'}
                  </Badge>
                </div>
              </div>

              {/* Formularz remanentu */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardCheck className="h-5 w-5" />
                      Wprowadź stan rzeczywisty
                    </CardTitle>
                    {hasEntries && (
                      <div className="text-sm text-slate-600">
                        Wypełniono: <span className="font-semibold">{filledCount}</span> / {entries.length}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {warehouseLoading ? (
                    <TableSkeleton rows={6} columns={5} />
                  ) : warehouseData?.data?.length ? (
                    <div className="space-y-4">
                      <RemanentTable
                        warehouseData={warehouseData.data}
                        entries={entries}
                        onChange={handleEntriesChange}
                      />
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setEntries([])}
                          disabled={!hasEntries || submitMutation.isPending}
                        >
                          Wyczyść formularz
                        </Button>
                        <Button
                          onClick={() => setShowConfirmModal(true)}
                          disabled={filledCount === 0 || submitMutation.isPending}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Zapisz remanent
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Warehouse className="h-12 w-12" />}
                      title="Brak danych magazynowych"
                      description="Nie znaleziono profili dla tego koloru"
                      className="min-h-[200px]"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Historia remanentów */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Historia remanentów
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <TableSkeleton rows={3} columns={4} />
                  ) : groupedHistory.length > 0 ? (
                    <div className="space-y-4">
                      {groupedHistory.map((group, index) => (
                        <div
                          key={`${group.date}-${group.colorId}`}
                          className={cn(
                            'p-4 rounded-lg border',
                            index === 0 && group.canRollback ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold">
                                {new Date(group.date).toLocaleString('pl-PL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className="text-sm text-slate-600">
                                {group.totalProfiles} profili • {group.differencesCount} różnic
                              </div>
                            </div>
                            {index === 0 && group.canRollback && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollback(group.colorId)}
                                disabled={rollbackMutation.isPending}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {rollbackMutation.isPending ? 'Cofanie...' : 'Cofnij'}
                              </Button>
                            )}
                          </div>

                          {/* Szczegóły wpisów */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {group.entries.slice(0, 10).map((entry) => (
                              <div
                                key={entry.id}
                                className={cn(
                                  'text-xs p-2 rounded border',
                                  entry.difference === 0
                                    ? 'bg-green-50 border-green-200'
                                    : entry.difference > 0
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-red-50 border-red-200'
                                )}
                              >
                                <div className="font-mono font-semibold">{entry.profile.number}</div>
                                <div className="text-slate-600">
                                  {entry.calculatedStock} → {entry.actualStock}
                                </div>
                                <div
                                  className={cn(
                                    'font-semibold',
                                    entry.difference === 0
                                      ? 'text-green-600'
                                      : entry.difference > 0
                                      ? 'text-blue-600'
                                      : 'text-red-600'
                                  )}
                                >
                                  {entry.difference > 0 && '+'}
                                  {entry.difference}
                                </div>
                              </div>
                            ))}
                            {group.entries.length > 10 && (
                              <div className="text-xs p-2 rounded border bg-slate-100 flex items-center justify-center">
                                +{group.entries.length - 10} więcej
                              </div>
                            )}
                          </div>

                          {index === 0 && group.canRollback && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-orange-600">
                              <AlertTriangle className="h-3 w-3" />
                              Można cofnąć przez 24h od wykonania
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<History className="h-12 w-12" />}
                      title="Brak historii"
                      description="Nie wykonano jeszcze żadnych remanentów dla tego koloru"
                      className="min-h-[150px]"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal potwierdzenia */}
      {selectedColor && (
        <RemanentConfirmModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          onConfirm={handleSubmit}
          colorCode={selectedColor.hexColor || '#ccc'}
          colorName={selectedColor.name}
          colorCodeText={selectedColor.code}
          entries={entries}
          isPending={submitMutation.isPending}
        />
      )}

      {/* Modal finalizacji miesiąca */}
      <FinalizeMonthModal
        open={showFinalizeModal}
        onOpenChange={(open) => {
          setShowFinalizeModal(open);
          if (!open) setFinalizePreview(null);
        }}
        onFinalize={handleFinalize}
        isPending={finalizeMutation.isPending}
        previewData={finalizePreview}
      />
    </div>
  );
}
