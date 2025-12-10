'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Eye, Trash2, MoreHorizontal, FileText, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useGlassOrders, useDeleteGlassOrder } from '../hooks/useGlassOrders';
import { GlassOrderDetailModal } from './GlassOrderDetailModal';
import { GlassValidationBadge } from './GlassValidationBadge';
import type { GlassOrder } from '../types';

const statusLabels: Record<string, string> = {
  ordered: 'Zamowione',
  partially_delivered: 'Czesciowo dostarczone',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
};

const statusColors: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-800',
  partially_delivered: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export function GlassOrdersTable() {
  const { data: orders, isLoading, error } = useGlassOrders();
  const deleteMutation = useDeleteGlassOrder();
  const [selectedOrder, setSelectedOrder] = useState<GlassOrder | null>(null);

  if (isLoading) {
    return <TableSkeleton rows={5} columns={8} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12" />}
        title="Blad ladowania"
        description={error.message}
      />
    );
  }

  if (!orders?.length) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Brak zamowien szyb"
        description="Zaimportuj pliki TXT, aby rozpoczac."
      />
    );
  }

  const handleDelete = (id: number) => {
    if (confirm('Czy na pewno chcesz usunac to zamowienie?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numer zamowienia</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Dostawca</TableHead>
              <TableHead className="text-center">Pozycje</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Walidacja</TableHead>
              <TableHead>Dostawa</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const issueCount = order.validationResults?.filter((v) => !v.resolved).length || 0;
              const hasErrors = order.validationResults?.some(
                (v) => v.severity === 'error' && !v.resolved
              );
              const hasWarnings = order.validationResults?.some(
                (v) => v.severity === 'warning' && !v.resolved
              );

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.glassOrderNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.orderDate), 'dd.MM.yyyy', { locale: pl })}
                  </TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell className="text-center">
                    {order._count?.items || order.items?.length || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {issueCount > 0 ? (
                      <GlassValidationBadge
                        severity={hasErrors ? 'error' : hasWarnings ? 'warning' : 'info'}
                        count={issueCount}
                      />
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate
                      ? format(new Date(order.expectedDeliveryDate), 'dd.MM.yyyy', { locale: pl })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Szczegoly
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Usun
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <GlassOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
