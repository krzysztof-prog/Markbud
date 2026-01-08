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
import { Plus, Filter, Calendar } from 'lucide-react';
import { DemandTable } from '@/features/okuc/components/DemandTable';
import { DemandForm } from '@/features/okuc/components/DemandForm';
import { DeleteDemandDialog } from '@/features/okuc/components/DeleteDemandDialog';
import {
  useOkucDemands,
  useCreateOkucDemand,
  useUpdateOkucDemand,
  useDeleteOkucDemand,
} from '@/features/okuc/hooks';
import type { OkucDemand, DemandStatus, DemandSource, CreateDemandInput, UpdateDemandInput } from '@/types/okuc';

export default function OkucDemandPage() {
  // === DATA FETCHING ===
  const { data: demands = [], isLoading, error } = useOkucDemands();

  // === STATE ===
  const [selectedDemand, setSelectedDemand] = useState<OkucDemand | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  const filteredDemands = useMemo(() => {
    let result = [...demands];

    // Status filter
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

  // === EVENT HANDLERS ===
  const handleAddNew = () => {
    setSelectedDemand(null);
    setIsFormOpen(true);
  };

  const handleEdit = (demandId: number) => {
    const demand = demands?.find((d) => d.id === demandId);
    if (demand) {
      setSelectedDemand(demand);
      setIsFormOpen(true);
    }
  };

  const handleDelete = (demandId: number) => {
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
                  <SelectItem value="completed">Zakończone</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
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
              Znaleziono: <strong>{filteredDemands.length}</strong> zapotrzebowań (z{' '}
              <strong>{demands.length}</strong> wszystkich)
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
        {!isLoading && !error && demands.length > 0 && filteredDemands.length === 0 && (
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

        {/* Table */}
        {!isLoading && !error && filteredDemands.length > 0 && (
          <DemandTable
            demands={filteredDemands}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeletingId={deleteMutation.isPending ? selectedDemand?.id : undefined}
          />
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
    </div>
  );
}
