/**
 * Strona RW (Rozchód Wewnętrzny) - zużyte okucia
 *
 * Pokazuje okucia które zostały zużyte (zlecenia ukończone = status completed)
 * Widok pojedynczego miesiąca z selektorem, z sidebarowym podglądem zleceń
 *
 * Filtry:
 * - Miesiąc (selektor)
 * - Typ magazynu (PVC/ALU/wszystkie)
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowDownCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOkucDemands } from '@/features/okuc/hooks';
import type { OkucDemand, WarehouseType } from '@/types/okuc';

// Helper: Formatuj miesiąc z daty
function formatMonth(date: Date): string {
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });
}

// Helper: Pobierz klucz miesiąca (YYYY-MM) z daty lub expectedWeek
function getMonthKey(demand: OkucDemand): string {
  // Użyj updatedAt jako daty RW (gdy status zmienił się na completed)
  if (demand.updatedAt) {
    const date = new Date(demand.updatedAt);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  // Fallback: użyj expectedWeek (format: 2026-W04 -> 2026-01)
  if (demand.expectedWeek) {
    const [year, weekPart] = demand.expectedWeek.split('-W');
    const weekNum = parseInt(weekPart, 10);
    // Przybliżony miesiąc z numeru tygodnia
    const month = Math.min(12, Math.ceil(weekNum / 4.33));
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  return 'unknown';
}

// Helper: Formatuj klucz miesiąca na czytelny string
function formatMonthKey(key: string): string {
  if (key === 'unknown') return 'Nieznany miesiąc';
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return formatMonth(date);
}

// Typ dla zgrupowanych danych
interface GroupedArticle {
  articleId: string;
  articleName: string;
  totalQuantity: number;
  demandIds: number[];
  orderNumbers: Set<string>;
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  articles: GroupedArticle[];
  totalQuantity: number;
  orderNumbers: Set<string>;
}

export default function OkucRwPage() {
  // === DATA FETCHING ===
  const { data: demands = [], isLoading, error } = useOkucDemands();

  // === STATE ===
  const [filterWarehouse, setFilterWarehouse] = useState<WarehouseType | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // === FILTER: Tylko completed (RW) ===
  const rwDemands = useMemo(() => {
    let result = demands.filter((d) => d.status === 'completed');

    // Filtr typu magazynu
    if (filterWarehouse !== 'all') {
      result = result.filter((d) => {
        // Sprawdź czy artykuł pasuje do typu magazynu
        if (filterWarehouse === 'pvc') {
          return d.article?.usedInPvc === true;
        }
        if (filterWarehouse === 'alu') {
          return d.article?.usedInAlu === true;
        }
        return true;
      });
    }

    return result;
  }, [demands, filterWarehouse]);

  // === GROUPED BY MONTH ===
  const monthGroups = useMemo(() => {
    const groups = new Map<string, MonthGroup>();

    for (const demand of rwDemands) {
      const monthKey = getMonthKey(demand);
      const articleKey = demand.article?.articleId || String(demand.articleId);
      const orderNumber = demand.order?.orderNumber || `Zlecenie #${demand.orderId}`;

      let group = groups.get(monthKey);
      if (!group) {
        group = {
          monthKey,
          monthLabel: formatMonthKey(monthKey),
          articles: [],
          totalQuantity: 0,
          orderNumbers: new Set(),
        };
        groups.set(monthKey, group);
      }

      // Znajdź lub utwórz artykuł w grupie
      let article = group.articles.find((a) => a.articleId === articleKey);
      if (!article) {
        article = {
          articleId: articleKey,
          articleName: demand.article?.name || 'Nieznany artykuł',
          totalQuantity: 0,
          demandIds: [],
          orderNumbers: new Set(),
        };
        group.articles.push(article);
      }

      article.totalQuantity += demand.quantity;
      article.demandIds.push(demand.id);
      article.orderNumbers.add(orderNumber);
      group.totalQuantity += demand.quantity;
      group.orderNumbers.add(orderNumber);
    }

    // Sortuj artykuły alfabetycznie w każdej grupie
    for (const group of groups.values()) {
      group.articles.sort((a, b) => a.articleId.localeCompare(b.articleId));
    }

    // Sortuj grupy po miesiącu (najnowsze pierwsze)
    return Array.from(groups.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [rwDemands]);

  // === Lista dostępnych miesięcy (posortowana od najnowszego) ===
  const availableMonths = useMemo(() => {
    return monthGroups.map((g) => ({ key: g.monthKey, label: g.monthLabel }));
  }, [monthGroups]);

  // === Automatycznie wybierz najnowszy miesiąc ===
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonth]);

  // === Aktualnie wybrany miesiąc ===
  const currentMonthGroup = useMemo(() => {
    if (!selectedMonth) return null;
    return monthGroups.find((g) => g.monthKey === selectedMonth) || null;
  }, [selectedMonth, monthGroups]);

  // === Zlecenia dla wybranego miesiąca (sidebar) ===
  const selectedMonthOrders = useMemo(() => {
    if (!currentMonthGroup) return [];
    return Array.from(currentMonthGroup.orderNumbers).sort();
  }, [currentMonthGroup]);

  // === Nawigacja między miesiącami ===
  const currentMonthIndex = availableMonths.findIndex((m) => m.key === selectedMonth);
  const canGoPrev = currentMonthIndex < availableMonths.length - 1; // Starszy miesiąc
  const canGoNext = currentMonthIndex > 0; // Nowszy miesiąc

  const goToPrevMonth = () => {
    if (canGoPrev) {
      setSelectedMonth(availableMonths[currentMonthIndex + 1].key);
    }
  };

  const goToNextMonth = () => {
    if (canGoNext) {
      setSelectedMonth(availableMonths[currentMonthIndex - 1].key);
    }
  };

  // === RENDER ===
  return (
    <div className="flex flex-col h-full">
      <Header title="RW - Rozchód Wewnętrzny" />

      <div className="px-6 pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn' },
              { label: 'OKUC', href: '/magazyn/okuc' },
              { label: 'RW', icon: <ArrowDownCircle className="h-4 w-4" /> },
            ]}
          />
        </div>

        {/* Filtry + Nawigacja miesiąca */}
        <div className="bg-card border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Lewa strona: Nawigacja miesiąca + Filtr magazynu */}
            <div className="flex items-center gap-6">
              {/* Nawigacja miesiąca */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPrevMonth}
                  disabled={!canGoPrev}
                  title="Poprzedni miesiąc"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select
                  value={selectedMonth || ''}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Wybierz miesiąc" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.key} value={month.key}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={!canGoNext}
                  title="Następny miesiąc"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Filtr typu magazynu */}
              <div className="flex items-center gap-2">
                <Label htmlFor="filterWarehouse">Magazyn:</Label>
                <Select
                  value={filterWarehouse}
                  onValueChange={(v) => setFilterWarehouse(v as WarehouseType | 'all')}
                >
                  <SelectTrigger id="filterWarehouse" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="pvc">PVC</SelectItem>
                    <SelectItem value="alu">ALU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prawa strona: Statystyki dla wybranego miesiąca */}
            {currentMonthGroup && (
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Zużyto:</span>{' '}
                  <strong className="text-lg">{currentMonthGroup.totalQuantity}</strong> szt.
                </div>
                <div>
                  <span className="text-muted-foreground">Artykułów:</span>{' '}
                  <strong>{currentMonthGroup.articles.length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Zleceń:</span>{' '}
                  <strong>{currentMonthGroup.orderNumbers.size}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
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

        {/* Empty state - brak danych RW */}
        {!isLoading && !error && rwDemands.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <ArrowDownCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak rozchodów</h3>
            <p className="text-sm text-muted-foreground">
              Nie ma jeszcze żadnych zużytych okuć. Pojawią się tutaj gdy zlecenia zostaną ukończone.
            </p>
          </div>
        )}

        {/* Empty state - brak danych dla wybranego miesiąca */}
        {!isLoading && !error && rwDemands.length > 0 && !currentMonthGroup && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <ArrowDownCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wybierz miesiąc</h3>
            <p className="text-sm text-muted-foreground">
              Wybierz miesiąc z listy powyżej aby zobaczyć rozchody.
            </p>
          </div>
        )}

        {/* Main content: Table + Sidebar */}
        {!isLoading && !error && currentMonthGroup && (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left: Tabela artykułów */}
            <div className="flex-1 overflow-auto">
              <div className="bg-card border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Artykuł
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Nazwa
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Zużyto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentMonthGroup.articles.map((article) => (
                      <tr key={article.articleId} className="hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <span className="font-mono text-sm">{article.articleId}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-muted-foreground truncate block max-w-md">
                            {article.articleName}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold">{article.totalQuantity}</span>
                          <span className="text-muted-foreground text-sm ml-1">szt.</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Sidebar ze zleceniami */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-card border rounded-lg h-full flex flex-col">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Zlecenia
                    <Badge variant="outline" className="ml-auto">
                      {selectedMonthOrders.length}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentMonthGroup.monthLabel}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {selectedMonthOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Brak zleceń w tym miesiącu
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {selectedMonthOrders.map((orderNum) => (
                          <div
                            key={orderNum}
                            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 text-sm"
                          >
                            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{orderNum}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
