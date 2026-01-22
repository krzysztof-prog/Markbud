'use client';

import { useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Package,
  ClipboardCheck,
  History,
  RotateCcw,
  AlertTriangle,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useOkucStock, useUpdateOkucStock } from '@/features/okuc/hooks/useOkucStock';
import type { WarehouseType, SubWarehouse } from '@/types/okuc';

/** Wpis formularza remanentu */
interface RemanentFormEntry {
  stockId: number;
  articleId: string;
  articleName: string;
  currentQuantity: number;
  newQuantity: string;
  version: number;
}

/** Zgrupowany sidebar wg magazynu */
interface WarehouseGroup {
  warehouseType: WarehouseType;
  subWarehouse: SubWarehouse;
  label: string;
  count: number;
}

export default function OkucRemanentPage() {
  // Stan wyboru magazynu
  const [selectedWarehouse, setSelectedWarehouse] = useState<{
    warehouseType: WarehouseType;
    subWarehouse: SubWarehouse;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<RemanentFormEntry[]>([]);

  // Pobierz wszystkie stany magazynowe
  const { data: allStocks, isLoading } = useOkucStock();

  // Mutacja do aktualizacji stanu
  const updateMutation = useUpdateOkucStock();

  // Grupuj magazyny na sidebar
  const warehouseGroups = useMemo<WarehouseGroup[]>(() => {
    if (!allStocks) return [];

    const groups: Record<string, WarehouseGroup> = {};

    allStocks.forEach((stock) => {
      const key = `${stock.warehouseType}-${stock.subWarehouse || 'main'}`;
      if (!groups[key]) {
        let label = stock.warehouseType.toUpperCase();
        if (stock.subWarehouse) {
          const subLabels: Record<string, string> = {
            production: 'Produkcja',
            buffer: 'Bufor',
            gabaraty: 'Gabaraty',
          };
          label += ` - ${subLabels[stock.subWarehouse] || stock.subWarehouse}`;
        }
        groups[key] = {
          warehouseType: stock.warehouseType,
          subWarehouse: stock.subWarehouse || null,
          label,
          count: 0,
        };
      }
      groups[key].count++;
    });

    return Object.values(groups).sort((a, b) => {
      // Sortuj: PVC najpierw, potem ALU, potem po podmagazynach
      if (a.warehouseType !== b.warehouseType) {
        return a.warehouseType === 'pvc' ? -1 : 1;
      }
      if (!a.subWarehouse) return -1;
      if (!b.subWarehouse) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [allStocks]);

  // Ustaw domyślny magazyn
  if (warehouseGroups.length > 0 && !selectedWarehouse) {
    setSelectedWarehouse({
      warehouseType: warehouseGroups[0].warehouseType,
      subWarehouse: warehouseGroups[0].subWarehouse,
    });
  }

  // Filtrowane stany dla wybranego magazynu
  const filteredStocks = useMemo(() => {
    if (!allStocks || !selectedWarehouse) return [];

    return allStocks.filter((stock) => {
      // Filtruj po magazynie
      if (stock.warehouseType !== selectedWarehouse.warehouseType) return false;
      if (selectedWarehouse.subWarehouse !== null) {
        if (stock.subWarehouse !== selectedWarehouse.subWarehouse) return false;
      } else if (stock.subWarehouse) {
        return false; // Główny magazyn (bez podmagazynu)
      }

      // Filtruj po wyszukiwaniu
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const articleId = stock.article?.articleId?.toLowerCase() || '';
        const articleName = stock.article?.name?.toLowerCase() || '';
        return articleId.includes(query) || articleName.includes(query);
      }

      return true;
    });
  }, [allStocks, selectedWarehouse, searchQuery]);

  // Inicjalizuj formularz gdy zmienia się magazyn
  const initializeEntries = useCallback(() => {
    const newEntries: RemanentFormEntry[] = filteredStocks.map((stock) => ({
      stockId: stock.id,
      articleId: stock.article?.articleId || '',
      articleName: stock.article?.name || '',
      currentQuantity: stock.currentQuantity,
      newQuantity: '',
      version: stock.version,
    }));
    setEntries(newEntries);
  }, [filteredStocks]);

  // Zresetuj formularz gdy zmienia się magazyn
  const handleWarehouseChange = (group: WarehouseGroup) => {
    setSelectedWarehouse({
      warehouseType: group.warehouseType,
      subWarehouse: group.subWarehouse,
    });
    setEntries([]);
    setSearchQuery('');
  };

  // Handler zmiany ilości w formularzu
  const handleQuantityChange = (stockId: number, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.stockId === stockId ? { ...entry, newQuantity: value } : entry
      )
    );
  };

  // Zapisz wszystkie zmiany
  const handleSaveAll = async () => {
    const changedEntries = entries.filter(
      (entry) => entry.newQuantity !== '' && Number(entry.newQuantity) !== entry.currentQuantity
    );

    if (changedEntries.length === 0) return;

    // Zapisuj sekwencyjnie aby uniknąć konfliktów
    for (const entry of changedEntries) {
      try {
        await updateMutation.mutateAsync({
          id: entry.stockId,
          data: {
            quantity: Number(entry.newQuantity),
            reason: 'Remanent',
          },
          version: entry.version,
        });
      } catch (error) {
        console.error(`Błąd aktualizacji ${entry.articleId}:`, error);
      }
    }

    // Zresetuj formularz po zapisie
    setEntries([]);
  };

  // Statystyki formularza
  const filledCount = entries.filter((e) => e.newQuantity !== '').length;
  const changedCount = entries.filter(
    (e) => e.newQuantity !== '' && Number(e.newQuantity) !== e.currentQuantity
  ).length;
  const hasEntries = entries.length > 0;

  // Znajdź aktualną grupę
  const selectedGroup = warehouseGroups.find(
    (g) =>
      g.warehouseType === selectedWarehouse?.warehouseType &&
      g.subWarehouse === selectedWarehouse?.subWarehouse
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="Remanent okuć">
        <div className="flex gap-2">
          <Link href="/magazyn/okuc">
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
            { label: 'Okucia', href: '/magazyn/okuc', icon: <Package className="h-4 w-4" /> },
            { label: 'Remanent', icon: <ClipboardCheck className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Sidebar z magazynami */}
        <div className="w-full lg:w-64 border-r border-b lg:border-b-0 bg-white overflow-y-auto max-h-48 lg:max-h-full">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
              Wybierz magazyn
            </h3>

            <div className="space-y-1">
              {warehouseGroups.map((group) => (
                <button
                  key={`${group.warehouseType}-${group.subWarehouse || 'main'}`}
                  onClick={() => handleWarehouseChange(group)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    selectedWarehouse?.warehouseType === group.warehouseType &&
                      selectedWarehouse?.subWarehouse === group.subWarehouse
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{group.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {selectedGroup && (
            <div className="space-y-6">
              {/* Nagłówek magazynu */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedGroup.label}</h2>
                    <p className="text-sm text-slate-500">{selectedGroup.count} artykułów</p>
                  </div>
                </div>

                {/* Wyszukiwarka */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Szukaj artykułu..."
                  containerClassName="w-full sm:w-64"
                />
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
                        Wypełniono: <span className="font-semibold">{filledCount}</span> /{' '}
                        {entries.length}
                        {changedCount > 0 && (
                          <span className="ml-2 text-orange-600">
                            (zmieniono: <span className="font-semibold">{changedCount}</span>)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton rows={6} columns={4} />
                  ) : filteredStocks.length > 0 ? (
                    <div className="space-y-4">
                      {/* Tabela z formularzem */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                                Artykuł
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 w-32">
                                Stan systemowy
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 w-40">
                                Stan rzeczywisty
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 w-24">
                                Różnica
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {!hasEntries ? (
                              // Widok tylko do odczytu - kliknij "Rozpocznij remanent"
                              filteredStocks.map((stock) => (
                                <tr key={stock.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    <div className="font-mono text-sm font-medium">
                                      {stock.article?.articleId || '-'}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate max-w-xs">
                                      {stock.article?.name || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono">{stock.currentQuantity}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                  <td className="px-4 py-3 text-right text-slate-400">-</td>
                                </tr>
                              ))
                            ) : (
                              // Tryb edycji
                              entries.map((entry) => {
                                const diff =
                                  entry.newQuantity !== ''
                                    ? Number(entry.newQuantity) - entry.currentQuantity
                                    : null;

                                return (
                                  <tr key={entry.stockId} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                      <div className="font-mono text-sm font-medium">
                                        {entry.articleId}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate max-w-xs">
                                        {entry.articleName}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-mono">{entry.currentQuantity}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={entry.newQuantity}
                                        onChange={(e) =>
                                          handleQuantityChange(entry.stockId, e.target.value)
                                        }
                                        placeholder={String(entry.currentQuantity)}
                                        className="w-24 text-right font-mono ml-auto"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {diff !== null ? (
                                        <Badge
                                          variant={
                                            diff === 0
                                              ? 'secondary'
                                              : diff > 0
                                                ? 'default'
                                                : 'destructive'
                                          }
                                          className={cn(
                                            'font-mono',
                                            diff === 0 && 'bg-green-100 text-green-800',
                                            diff > 0 && 'bg-blue-100 text-blue-800'
                                          )}
                                        >
                                          {diff > 0 && '+'}
                                          {diff}
                                        </Badge>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Przyciski akcji */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        {!hasEntries ? (
                          <Button onClick={initializeEntries}>
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Rozpocznij remanent
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setEntries([])}
                              disabled={updateMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Anuluj
                            </Button>
                            <Button
                              onClick={handleSaveAll}
                              disabled={changedCount === 0 || updateMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {updateMutation.isPending
                                ? 'Zapisywanie...'
                                : `Zapisz zmiany (${changedCount})`}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Package className="h-12 w-12" />}
                      title="Brak artykułów"
                      description={
                        searchQuery
                          ? 'Nie znaleziono artykułów pasujących do wyszukiwania'
                          : 'Brak artykułów w tym magazynie'
                      }
                      className="min-h-[200px]"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Informacja o historii */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Historia zmian
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <p className="text-sm text-slate-600">
                      Historia zmian dla poszczególnych artykułów dostępna jest na stronie{' '}
                      <Link
                        href="/magazyn/okuc"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        stanu magazynu
                      </Link>
                      . Kliknij w artykuł aby zobaczyć pełną historię zmian.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
