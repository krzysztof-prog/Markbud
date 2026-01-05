/**
 * Tabela zamówień OKUC do dostawcy
 *
 * Wyświetla listę zamówień z akcjami (Zobacz, Edytuj, Wyślij).
 * Sortowanie domyślnie po createdAt (DESC).
 * Klikalne kolumny dla sortowania.
 *
 * KRYTYCZNE: Używa groszeToPln() dla wyświetlania wartości!
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Send, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { OkucOrder } from '@/types/okuc';
import { groszeToPln } from '@/lib/money';
import type { Grosze } from '@/lib/money';

interface OrdersTableProps {
  orders: OkucOrder[];
  isLoading?: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onSend: (id: number) => void;
  isSendingId?: number; // ID zamówienia które jest wysyłane
}

type SortField = 'orderNumber' | 'basketType' | 'createdAt' | 'status' | 'itemsCount' | 'estimatedValue';
type SortDirection = 'asc' | 'desc';

// Mapowanie statusów na polskie etykiety i kolory
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  draft: { label: 'Projekt', variant: 'default' },
  pending_approval: { label: 'Oczekuje zatwierdzenia', variant: 'secondary' },
  approved: { label: 'Zatwierdzone', variant: 'success' },
  sent: { label: 'Wysłane', variant: 'warning' },
  confirmed: { label: 'Potwierdzone', variant: 'success' },
  in_transit: { label: 'W transporcie', variant: 'warning' },
  received: { label: 'Odebrane', variant: 'default' },
  cancelled: { label: 'Anulowane', variant: 'destructive' },
};

// Mapowanie typów koszyka na polskie etykiety i kolory
const BASKET_TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' }> = {
  typical_standard: { label: 'Typowy Standard', variant: 'secondary' },
  typical_gabarat: { label: 'Typowy Gabaryty', variant: 'warning' },
  atypical: { label: 'Atypowy', variant: 'default' },
};

export function OrdersTable({
  orders,
  isLoading = false,
  onView,
  onEdit,
  onSend,
  isSendingId,
}: OrdersTableProps) {
  // State dla sortowania - domyślnie createdAt DESC
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // State dla confirmation dialog
  const [sendConfirmId, setSendConfirmId] = useState<number | null>(null);

  // Obsługa sortowania
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction jeśli to samo pole
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nowe pole - sortuj descending dla dat, ascending dla reszty
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  // Ikona sortowania dla kolumny
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // Sortowane zamówienia
  const sortedOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const sorted = [...orders].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'orderNumber':
          aValue = a.orderNumber.toLowerCase();
          bValue = b.orderNumber.toLowerCase();
          break;
        case 'basketType':
          aValue = a.basketType;
          bValue = b.basketType;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'itemsCount':
          aValue = a.items?.length || 0;
          bValue = b.items?.length || 0;
          break;
        case 'estimatedValue':
          // Suma cen pozycji (estimatedPrice w groszach)
          aValue = a.items?.reduce((sum, item) => sum + (item.unitPrice || 0), 0) || 0;
          bValue = b.items?.reduce((sum, item) => sum + (item.unitPrice || 0), 0) || 0;
          break;
        default:
          aValue = a.orderNumber;
          bValue = b.orderNumber;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [orders, sortField, sortDirection]);

  // Wylicz wartość szacowaną zamówienia (suma cen pozycji)
  const getEstimatedValue = (order: OkucOrder): number => {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum, item) => sum + (item.unitPrice || 0), 0);
  };

  // Czy można edytować zamówienie
  const canEdit = (order: OkucOrder): boolean => {
    return order.status === 'draft' || order.status === 'pending_approval';
  };

  // Czy można wysłać zamówienie
  const canSend = (order: OkucOrder): boolean => {
    return order.status === 'approved';
  };

  // Obsługa potwierdzenia wysyłki
  const handleConfirmSend = () => {
    if (sendConfirmId !== null) {
      onSend(sendConfirmId);
      setSendConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Ładowanie zamówień...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Brak zamówień do wyświetlenia.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('orderNumber')}
              >
                Numer {getSortIcon('orderNumber')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('basketType')}
              >
                Typ koszyka {getSortIcon('basketType')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('createdAt')}
              >
                Data utworzenia {getSortIcon('createdAt')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('status')}
              >
                Status {getSortIcon('status')}
              </TableHead>
              <TableHead>Data wysłania</TableHead>
              <TableHead>Data dostawy</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('itemsCount')}
              >
                Liczba pozycji {getSortIcon('itemsCount')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('estimatedValue')}
              >
                Wartość szacowana {getSortIcon('estimatedValue')}
              </TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, variant: 'default' as const };
              const basketConfig = BASKET_TYPE_CONFIG[order.basketType] || { label: order.basketType, variant: 'default' as const };
              const estimatedValueGrosze = getEstimatedValue(order);
              const isSending = isSendingId === order.id;

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant={basketConfig.variant}>
                      {basketConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate
                      ? new Date(order.expectedDeliveryDate).toLocaleDateString('pl-PL')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {order.actualDeliveryDate
                      ? new Date(order.actualDeliveryDate).toLocaleDateString('pl-PL')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.items?.length || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {estimatedValueGrosze > 0
                      ? `${groszeToPln(estimatedValueGrosze as Grosze).toFixed(2)} zł`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Zobacz */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(order.id)}
                        title="Zobacz szczegóły"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Edytuj - tylko dla draft/pending */}
                      {canEdit(order) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(order.id)}
                          title="Edytuj zamówienie"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Wyślij - tylko dla approved */}
                      {canSend(order) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSendConfirmId(order.id)}
                          disabled={isSending}
                          title="Wyślij do dostawcy"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog dla wysyłki */}
      <Dialog open={sendConfirmId !== null} onOpenChange={(open) => !open && setSendConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wyślij zamówienie do dostawcy</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz wysłać to zamówienie do dostawcy?
              Po wysłaniu nie będzie można edytować pozycji.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendConfirmId(null)}
              disabled={isSendingId !== undefined}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={isSendingId !== undefined}
            >
              {isSendingId !== undefined ? 'Wysyłanie...' : 'Wyślij'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
