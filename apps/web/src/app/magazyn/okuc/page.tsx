'use client';

import { useState } from 'react';
import { createDynamicComponent } from '@/lib/dynamic-import';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Settings,
  ShoppingCart,
  AlertCircle,
  ArrowLeft,
  Download,
  Upload,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useOkucArticles } from '@/features/okuc/hooks/useOkucArticles';
import { useOkucStock, useUpdateOkucStock } from '@/features/okuc/hooks/useOkucStock';
import { StockTable } from '@/features/okuc/components/StockTable';

// Dialogi - eager w PROD, lazy w DEV
const ImportArticlesDialog = createDynamicComponent(
  () => import('@/features/okuc/components/ImportArticlesDialog').then((mod) => ({ default: mod.ImportArticlesDialog }))
);
const ImportStockDialog = createDynamicComponent(
  () => import('@/features/okuc/components/ImportStockDialog').then((mod) => ({ default: mod.ImportStockDialog }))
);
import { okucArticlesApi, okucStockApi } from '@/features/okuc/api';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { WarehouseType } from '@/types/okuc';

/**
 * Główna strona modułu OKUC - Stan magazynu
 *
 * Pokazuje:
 * - Podstawowe statystyki (liczba artykułów PVC/ALU)
 * - Widok stanu magazynowego z filtrami
 * - Dropdowny Import/Export
 */
export default function OkucLandingPage() {
  // Stan filtrów
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseType | 'all'>('all');
  const [updatingStockId, setUpdatingStockId] = useState<number | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [importArticlesOpen, setImportArticlesOpen] = useState(false);
  const [importStockOpen, setImportStockOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pobierz artykuły PVC i ALU dla statystyk
  const { data: pvcArticles } = useOkucArticles({ usedInPvc: true });
  const { data: aluArticles } = useOkucArticles({ usedInAlu: true });

  // Pobierz stany magazynowe z filtrami
  const stockFilters = warehouseFilter !== 'all' ? { warehouseType: warehouseFilter } : undefined;
  const { data: stocks = [], isLoading: isLoadingStocks } = useOkucStock(stockFilters);

  // Mutacja do aktualizacji stanu
  const { mutate: updateStock, isPending: isUpdatingStock } = useUpdateOkucStock({
    onSuccess: () => {
      setUpdatingStockId(undefined);
    },
    onError: () => {
      setUpdatingStockId(undefined);
    },
  });

  // Filtrowanie po wyszukiwaniu (articleId lub name)
  const filteredStocks = stocks.filter((stock) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const articleId = stock.article?.articleId?.toLowerCase() || '';
    const name = stock.article?.name?.toLowerCase() || '';
    return articleId.includes(query) || name.includes(query);
  });

  // Handler aktualizacji stanu
  const handleUpdateStock = (id: number, quantity: number, version: number) => {
    setUpdatingStockId(id);
    updateStock({
      id,
      data: { quantity },
      version,
    });
  };

  // Handler eksportu artykułów CSV
  const handleExportArticles = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await okucArticlesApi.exportCsv();
      toast({
        title: 'Eksport zakończony',
        description: 'Plik CSV z artykułami został pobrany',
      });
    } catch {
      toast({
        title: 'Błąd eksportu',
        description: 'Nie udało się wyeksportować artykułów',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handler eksportu stanu magazynowego CSV
  const handleExportStock = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filters = warehouseFilter !== 'all' ? { warehouseType: warehouseFilter } : undefined;
      await okucStockApi.exportCsv(filters);
      toast({
        title: 'Eksport zakończony',
        description: 'Plik CSV ze stanem magazynowym został pobrany',
      });
    } catch {
      toast({
        title: 'Błąd eksportu',
        description: 'Nie udało się wyeksportować stanu magazynowego',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Stats cards - podstawowe statystyki
  const stats = [
    {
      title: 'Artykuły PVC',
      value: pvcArticles?.length ?? '—',
      description: 'Liczba artykułów okuć dla PVC',
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Artykuły ALU',
      value: aluArticles?.length ?? '—',
      description: 'Liczba artykułów okuć dla ALU',
      icon: Settings,
      color: 'green',
    },
    {
      title: 'Aktywne zamówienia',
      value: '—',
      description: 'Zamówienia w trakcie realizacji',
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      title: 'Krytyczne stany',
      value: '—',
      description: 'Artykuły poniżej min. stanu',
      icon: AlertCircle,
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Okucia (DualStock)">
        <div className="flex items-center gap-2">
          <Link href="/magazyn/okuc/zastepstwa">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Zastępstwa
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do dashboardu
            </Button>
          </Link>
        </div>
      </Header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Opis sekcji */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">
              Magazyn okuć okiennych
            </h2>
            <p className="text-slate-600">
              System zarządzania magazynem okuć dla PVC i ALU
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        {stat.title}
                      </CardTitle>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${getColorClasses(stat.color)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {stat.value}
                    </div>
                    <p className="text-xs text-slate-500">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stan magazynu - sekcja główna */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stan magazynu</CardTitle>
                  <CardDescription>
                    Aktualny stan magazynowy artykułów okuć
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Dropdown Import */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setImportArticlesOpen(true)}>
                        <Package className="h-4 w-4 mr-2" />
                        Artykuły
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setImportStockOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Stan magazynowy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Dropdown Export */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isExporting}>
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? 'Eksportowanie...' : 'Export'}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportArticles} disabled={isExporting}>
                        <Package className="h-4 w-4 mr-2" />
                        Artykuły
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportStock} disabled={isExporting}>
                        <Settings className="h-4 w-4 mr-2" />
                        Stan magazynowy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtry */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Filtr magazynu */}
                <Select
                  value={warehouseFilter}
                  onValueChange={(value) => setWarehouseFilter(value as WarehouseType | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Wszystkie magazyny" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="pvc">PVC</SelectItem>
                    <SelectItem value="alu">ALU</SelectItem>
                  </SelectContent>
                </Select>

                {/* Wyszukiwarka */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Szukaj po numerze lub nazwie artykułu..."
                  containerClassName="flex-1 max-w-md"
                />
              </div>

              {/* Tabela stanów magazynowych */}
              <StockTable
                stocks={filteredStocks}
                isLoading={isLoadingStocks}
                onUpdate={handleUpdateStock}
                isUpdatingId={isUpdatingStock ? updatingStockId : undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog importu artykułów - renderowany tylko gdy otwarty */}
      {importArticlesOpen && (
        <ImportArticlesDialog
          open={importArticlesOpen}
          onOpenChange={setImportArticlesOpen}
          onSuccess={() => {
            // Odśwież dane po imporcie
            queryClient.invalidateQueries({ queryKey: ['okuc-articles'] });
            queryClient.invalidateQueries({ queryKey: ['okuc-stock'] });
          }}
        />
      )}

      {/* Dialog importu stanu magazynowego - renderowany tylko gdy otwarty */}
      {importStockOpen && (
        <ImportStockDialog
          open={importStockOpen}
          onOpenChange={setImportStockOpen}
          onSuccess={() => {
            // Odśwież dane po imporcie
            queryClient.invalidateQueries({ queryKey: ['okuc-stock'] });
          }}
        />
      )}
    </div>
  );
}
