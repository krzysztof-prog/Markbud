'use client';

import { useState, useMemo, Fragment } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2, MoreHorizontal, Package, AlertCircle, ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlassDeliveries, useDeleteGlassDelivery } from '../hooks/useGlassDeliveries';
import type { GroupedGlassDelivery, GlassDeliveryItem } from '../types';

// Grupuje szyby po numerze zlecenia
function groupItemsByOrder(items: GlassDeliveryItem[]): Map<string, GlassDeliveryItem[]> {
  const grouped = new Map<string, GlassDeliveryItem[]>();
  for (const item of items) {
    const key = item.orderSuffix ? `${item.orderNumber}-${item.orderSuffix}` : item.orderNumber;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(item);
  }
  return grouped;
}

// Komponent wyświetlający rozwinięte szczegóły szyb dla jednej grupy
function ExpandedDeliveryDetails({
  items,
  widthFilter,
  heightFilter,
}: {
  items: GlassDeliveryItem[];
  widthFilter: string;
  heightFilter: string;
}) {
  // Filtruj items po wymiarach
  const filteredItems = useMemo(() => {
    let result = items;
    if (widthFilter) {
      const width = parseInt(widthFilter);
      if (!isNaN(width)) {
        result = result.filter((item) => item.widthMm === width);
      }
    }
    if (heightFilter) {
      const height = parseInt(heightFilter);
      if (!isNaN(height)) {
        result = result.filter((item) => item.heightMm === height);
      }
    }
    return result;
  }, [items, widthFilter, heightFilter]);

  const groupedItems = useMemo(() => groupItemsByOrder(filteredItems), [filteredItems]);

  if (filteredItems.length === 0) {
    return (
      <div className="px-8 py-4 bg-muted/30 text-sm text-muted-foreground">
        Brak szyb pasujących do filtrów
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-muted/30 border-t">
      {Array.from(groupedItems.entries()).map(([orderKey, orderItems]) => {
        const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);
        return (
          <div key={orderKey} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                Zlecenie {orderKey}
              </span>
              <span className="text-muted-foreground">
                ({orderItems.length} pozycji, {totalQuantity} szt.)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left px-2 py-1 font-medium">Poz.</th>
                    <th className="text-right px-2 py-1 font-medium">Szer. (mm)</th>
                    <th className="text-right px-2 py-1 font-medium">Wys. (mm)</th>
                    <th className="text-right px-2 py-1 font-medium">Szt.</th>
                    <th className="text-left px-2 py-1 font-medium">Zespolenie</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-1">{item.position}</td>
                      <td className="text-right px-2 py-1 font-mono">{item.widthMm}</td>
                      <td className="text-right px-2 py-1 font-mono">{item.heightMm}</td>
                      <td className="text-right px-2 py-1">{item.quantity}</td>
                      <td className="px-2 py-1 text-muted-foreground truncate max-w-[200px]">
                        {item.glassComposition || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GlassDeliveriesTable() {
  const { data: deliveries, isLoading, error } = useGlassDeliveries();
  const deleteMutation = useDeleteGlassDelivery();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<{ id: number; customerOrderNumber: string } | null>(null);

  // Stan dla rozwijania szczegółów
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showGlasses, setShowGlasses] = useState(false);

  // Stan dla filtrów wymiarów
  const [widthFilter, setWidthFilter] = useState('');
  const [heightFilter, setHeightFilter] = useState('');

  // Twórz unikalny klucz dla każdej grupy
  const getGroupKey = (delivery: GroupedGlassDelivery) =>
    `${delivery.customerOrderNumber}|${delivery.rackNumber}`;

  const handleDelete = (id: number, customerOrderNumber: string) => {
    setDeliveryToDelete({ id, customerOrderNumber });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deliveryToDelete) {
      deleteMutation.mutate(deliveryToDelete.id);
      setDeliveryToDelete(null);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Filtruj dostawy po wymiarach szyb (globalnie)
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    if (!widthFilter && !heightFilter) return deliveries;

    const width = widthFilter ? parseInt(widthFilter) : null;
    const height = heightFilter ? parseInt(heightFilter) : null;

    return deliveries.filter((delivery) => {
      if (!delivery.items || delivery.items.length === 0) return false;

      return delivery.items.some((item) => {
        const matchWidth = width === null || item.widthMm === width;
        const matchHeight = height === null || item.heightMm === height;
        return matchWidth && matchHeight;
      });
    });
  }, [deliveries, widthFilter, heightFilter]);

  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-6">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Błąd ładowania"
          description={error.message}
        />
      </div>
    );
  }

  if (!deliveries?.length) {
    return (
      <div className="rounded-md border p-6">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Brak dostaw szyb"
          description="Zaimportuj pliki CSV, aby rozpocząć."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtry i kontrolki */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        {/* Checkbox pokaż szyby */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showGlasses"
            checked={showGlasses}
            onCheckedChange={(checked) => {
              setShowGlasses(checked === true);
              if (!checked) {
                setExpandedKeys(new Set());
              }
            }}
          />
          <Label htmlFor="showGlasses" className="text-sm font-medium cursor-pointer">
            Pokaż szyby
          </Label>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Wyszukiwanie po wymiarach */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Szukaj wymiarów:</span>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Szerokość (mm)"
            value={widthFilter}
            onChange={(e) => setWidthFilter(e.target.value)}
            className="w-32 h-8"
          />
          <span className="text-muted-foreground">×</span>
          <Input
            type="number"
            placeholder="Wysokość (mm)"
            value={heightFilter}
            onChange={(e) => setHeightFilter(e.target.value)}
            className="w-32 h-8"
          />
        </div>

        {(widthFilter || heightFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setWidthFilter('');
              setHeightFilter('');
            }}
          >
            Wyczyść filtry
          </Button>
        )}

        {/* Info o wynikach filtrowania */}
        {(widthFilter || heightFilter) && (
          <span className="text-sm text-muted-foreground ml-auto">
            Znaleziono: {filteredDeliveries.length} z {deliveries.length} dostaw
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showGlasses && <TableHead className="w-[40px]"></TableHead>}
              <TableHead>Numer stojaka</TableHead>
              <TableHead>Zamówienie klienta</TableHead>
              <TableHead>Data dostawy</TableHead>
              <TableHead className="text-center">Suma szyb</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliveries.map((delivery) => {
              const groupKey = getGroupKey(delivery);
              const isExpanded = expandedKeys.has(groupKey);

              return (
                <Fragment key={groupKey}>
                  <TableRow
                    className={showGlasses ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={showGlasses ? () => toggleExpanded(groupKey) : undefined}
                  >
                    {showGlasses && (
                      <TableCell className="w-[40px]">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{delivery.rackNumber}</TableCell>
                    <TableCell>{delivery.customerOrderNumber}</TableCell>
                    <TableCell>
                      {format(new Date(delivery.deliveryDate), 'dd.MM.yyyy', { locale: pl })}
                    </TableCell>
                    <TableCell className="text-center font-medium">{delivery.totalQuantity}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Opcje dostawy szyb">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete(delivery.glassDeliveryId, delivery.customerOrderNumber)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* Rozwinięte szczegóły szyb */}
                  {showGlasses && isExpanded && delivery.items && (
                    <TableRow key={`${groupKey}-details`}>
                      <TableCell colSpan={6} className="p-0">
                        <ExpandedDeliveryDetails
                          items={delivery.items}
                          widthFilter={widthFilter}
                          heightFilter={heightFilter}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog potwierdzenia usunięcia */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Usuń dostawę szyb"
        description={`Czy na pewno chcesz usunąć dostawę ${deliveryToDelete?.customerOrderNumber || ''}? Wszystkie powiązane pozycje zostaną również usunięte.`}
        confirmText="Usuń"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
