/**
 * Strona zarządzania zapotrzebowaniem OKUC
 *
 * Moduł: DualStock (Okucia PVC + ALU)
 * Funkcje:
 * - Lista zapotrzebowań z client-side filtering
 * - Dodawanie nowych zapotrzebowań
 * - Edycja istniejących zapotrzebowań (z editReason)
 * - Usuwanie zapotrzebowań
 *
 * Filtry:
 * - Status (pending/confirmed/in_production/completed/cancelled/wszystkie)
 * - Źródło (order/csv_import/manual/wszystkie)
 * - Tydzień od (week input)
 * - Tydzień do (week input)
 * - Checkbox: Tylko edytowane ręcznie (isManualEdit)
 */

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Filter, Calendar, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// DemandTable - komponent używany dynamicznie, import zachowany dla przyszłości
import { DemandForm } from '@/features/okuc/components/DemandForm';
import { DeleteDemandDialog } from '@/features/okuc/components/DeleteDemandDialog';
import { NewArticlesReviewModal } from '@/features/okuc/components/NewArticlesReviewModal';
import {
  useOkucDemands,
  useCreateOkucDemand,
  useUpdateOkucDemand,
  useDeleteOkucDemand,
  useOkucArticlesPendingReview,
} from '@/features/okuc/hooks';
import type { OkucDemand, DemandStatus, DemandSource, CreateDemandInput, UpdateDemandInput } from '@/types/okuc';

export default function OkucDemandPage() {
  // === DATA FETCHING ===
  const { data: demands = [], isLoading, error } = useOkucDemands();
  const { data: pendingReviewArticles = [] } = useOkucArticlesPendingReview();

  // === STATE ===
  const [selectedDemand, setSelectedDemand] = useState<OkucDemand | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewArticlesModalOpen, setIsNewArticlesModalOpen] = useState(false);

  // Filtry
  const [filterStatus, setFilterStatus] = useState<DemandStatus | 'all'>('all');
  const [filterSource, setFilterSource] = useState<DemandSource | 'all'>('all');
  const [filterWeekFrom, setFilterWeekFrom] = useState('');
  const [filterWeekTo, setFilterWeekTo] = useState('');
  const [filterManualEdit, setFilterManualEdit] = useState(false);

  // === MUTATIONS ===
  const createMutation = useCreateOkucDemand({
    onSuccess: () => {
      setIsFormOpen(false);
      setSelectedDemand(null);
    },
  });

  const updateMutation = useUpdateOkucDemand({
    onSuccess: () => {
      setIsFormOpen(false);
      setSelectedDemand(null);
    },
  });

  const deleteMutation = useDeleteOkucDemand({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedDemand(null);
    },
  });

  // === CLIENT-SIDE FILTERING ===
  // WAŻNE: Zapotrzebowanie pokazuje tylko pozycje które NIE są completed
  // (completed = przeszło do RW, zostało już zużyte)
  const filteredDemands = useMemo(() => {
    // Bazowo filtruj tylko niezakończone (status != completed)
    let result = demands.filter((d) => d.status !== 'completed');

    // Status filter (ale już bez completed, bo to RW)
    if (filterStatus !== 'all') {
      result = result.filter((d) => d.status === filterStatus);
    }

    // Source filter
    if (filterSource !== 'all') {
      result = result.filter((d) => d.source === filterSource);
    }

    // Week from filter
    if (filterWeekFrom) {
      result = result.filter((d: OkucDemand) => d.expectedWeek >= filterWeekFrom);
    }

    // Week to filter
    if (filterWeekTo) {
      result = result.filter((d: OkucDemand) => d.expectedWeek <= filterWeekTo);
    }

    // Manual edit filter
    if (filterManualEdit) {
      result = result.filter((d) => d.isManualEdit);
    }

    return result;
  }, [demands, filterStatus, filterSource, filterWeekFrom, filterWeekTo, filterManualEdit]);

  // === GROUPED VIEW - Suma zapotrzebowania per artykuł ===
  const groupedDemands = useMemo(() => {
    const grouped = new Map<string, {
      articleId: string;
      articleName: string;
      totalQuantity: number;
      demandIds: number[];
      statuses: Set<DemandStatus>;
      sources: Set<DemandSource>;
      hasManualEdit: boolean;
    }>();

    for (const demand of filteredDemands) {
      const key = demand.article?.articleId || String(demand.articleId);
      const existing = grouped.get(key);

      if (existing) {
        existing.totalQuantity += demand.quantity;
        existing.demandIds.push(demand.id);
        existing.statuses.add(demand.status);
        existing.sources.add(demand.source);
        if (demand.isManualEdit) existing.hasManualEdit = true;
      } else {
        grouped.set(key, {
          articleId: key,
          articleName: demand.article?.name || 'Nieznany artykuł',
          totalQuantity: demand.quantity,
          demandIds: [demand.id],
          statuses: new Set([demand.status]),
          sources: new Set([demand.source]),
          hasManualEdit: demand.isManualEdit,
        });
      }
    }

    // Sortuj alfabetycznie po numerze artykułu
    return Array.from(grouped.values()).sort((a, b) => a.articleId.localeCompare(b.articleId));
  }, [filteredDemands]);

  // === EVENT HANDLERS ===
  const handleAddNew = () => {
    setSelectedDemand(null);
    setIsFormOpen(true);
  };

  const _handleEdit = (demandId: number) => {
    const demand = demands?.find((d) => d.id === demandId);
    if (demand) {
      setSelectedDemand(demand);
      setIsFormOpen(true);
    }
  };

  const _handleDelete = (demandId: number) => {
    const demand = demands?.find((d) => d.id === demandId);
    if (demand) {
      setSelectedDemand(demand);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleFormSubmit = (data: CreateDemandInput | UpdateDemandInput) => {
    if (selectedDemand) {
      updateMutation.mutate({ id: selectedDemand.id, data: data as UpdateDemandInput });
    } else {
      createMutation.mutate(data as CreateDemandInput);
    }
  };

  const handleDeleteConfirm = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterSource('all');
    setFilterWeekFrom('');
    setFilterWeekTo('');
    setFilterManualEdit(false);
  };

  // Sprawdź czy są aktywne filtry
  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterSource !== 'all' ||
    filterWeekFrom !== '' ||
    filterWeekTo !== '' ||
    filterManualEdit;

  // === RENDER ===
  return (
    <div className="flex flex-col h-full">
      <Header title="Zapotrzebowanie na okucia" />

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn' },
              { label: 'OKUC', href: '/magazyn/okuc' },
              { label: 'Zapotrzebowanie', icon: <Calendar className="h-4 w-4" /> },
            ]}
          />
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zapotrzebowanie
          </Button>
        </div>

        {/* Alert - nowe artykuły do weryfikacji */}
        {pendingReviewArticles.length > 0 && (
          <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Nowe artykuły wymagają weryfikacji
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Podczas importu utworzono <strong>{pendingReviewArticles.length}</strong> nowych artykułów.
              Musisz określić czy są typowe czy atypowe.
              <Button
                variant="link"
                className="p-0 h-auto ml-2 text-amber-800 dark:text-amber-200 underline"
                onClick={() => setIsNewArticlesModalOpen(true)}
              >
                Przejdź do weryfikacji
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filtry */}
        <div className="bg-card border rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filtry</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="filterStatus">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as DemandStatus | 'all')}
              >
                <SelectTrigger id="filterStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="pending">Oczekujące</SelectItem>
                  <SelectItem value="confirmed">Potwierdzone</SelectItem>
                  <SelectItem value="in_production">W produkcji</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
                  {/* Zakończone (completed) nie pokazujemy - to już RW */}
                </SelectContent>
              </Select>
            </div>

            {/* Źródło */}
            <div className="space-y-2">
              <Label htmlFor="filterSource">Źródło</Label>
              <Select
                value={filterSource}
                onValueChange={(v) => setFilterSource(v as DemandSource | 'all')}
              >
                <SelectTrigger id="filterSource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="order">Zlecenie</SelectItem>
                  <SelectItem value="csv_import">Import CSV</SelectItem>
                  <SelectItem value="manual">Ręczne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tydzień od */}
            <div className="space-y-2">
              <Label htmlFor="filterWeekFrom">Tydzień od</Label>
              <Input
                id="filterWeekFrom"
                type="week"
                value={filterWeekFrom}
                onChange={(e) => setFilterWeekFrom(e.target.value)}
                placeholder="2026-W01"
              />
            </div>

            {/* Tydzień do */}
            <div className="space-y-2">
              <Label htmlFor="filterWeekTo">Tydzień do</Label>
              <Input
                id="filterWeekTo"
                type="week"
                value={filterWeekTo}
                onChange={(e) => setFilterWeekTo(e.target.value)}
                placeholder="2026-W52"
              />
            </div>

            {/* Checkbox: Tylko edytowane ręcznie */}
            <div className="space-y-2">
              <Label htmlFor="filterManualEdit" className="block">
                Edytowane ręcznie
              </Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="filterManualEdit"
                  checked={filterManualEdit}
                  onCheckedChange={(checked) => setFilterManualEdit(checked === true)}
                />
                <label
                  htmlFor="filterManualEdit"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tylko edytowane
                </label>
              </div>
            </div>
          </div>

          {/* Stats + Wyczyść filtry */}
          <div className="pt-2 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Znaleziono: <strong>{groupedDemands.length}</strong> artykułów
              {' '}({filteredDemands.length} pozycji, suma: <strong>{filteredDemands.reduce((sum, d) => sum + d.quantity, 0)}</strong> szt.)
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Wyczyść filtry
              </Button>
            )}
          </div>
        </div>

        {/* Loading state - Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              <strong>Błąd:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {/* Empty state - PRZED filtrowaniem */}
        {!isLoading && !error && demands.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak zapotrzebowań</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nie znaleziono żadnych zapotrzebowań w systemie.
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwsze zapotrzebowanie
            </Button>
          </div>
        )}

        {/* Empty state - PO filtrowaniu */}
        {!isLoading && !error && demands.length > 0 && groupedDemands.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak wyników</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nie znaleziono zapotrzebowań dla wybranych filtrów.
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Wyczyść filtry
            </Button>
          </div>
        )}

        {/* Table - Zgrupowana lista artykułów z sumą zapotrzebowania */}
        {!isLoading && !error && groupedDemands.length > 0 && (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Artykuł
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Suma zapotrzebowania
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    Liczba pozycji
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    Statusy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groupedDemands.map((item) => (
                  <tr key={item.articleId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-mono font-medium text-sm">{item.articleId}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {item.articleName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-lg">{item.totalQuantity}</span>
                      <span className="text-muted-foreground ml-1">szt.</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted-foreground">
                        {item.demandIds.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {Array.from(item.statuses).map((status) => (
                          <span
                            key={status}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : status === 'confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : status === 'in_production'
                                ? 'bg-purple-100 text-purple-800'
                                : status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {status === 'pending' && 'Oczekujące'}
                            {status === 'confirmed' && 'Potwierdzone'}
                            {status === 'in_production' && 'W produkcji'}
                            {status === 'completed' && 'Zakończone'}
                            {status === 'cancelled' && 'Anulowane'}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <DemandForm
        demand={selectedDemand}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDemandDialog
        demand={selectedDemand}
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedDemand(null);
        }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />

      {/* Modal weryfikacji nowych artykułów */}
      <NewArticlesReviewModal
        open={isNewArticlesModalOpen}
        onOpenChange={setIsNewArticlesModalOpen}
      />
    </div>
  );
}
