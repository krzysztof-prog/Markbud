'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2, MoreHorizontal, Package, AlertCircle } from 'lucide-react';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlassDeliveries, useDeleteGlassDelivery } from '../hooks/useGlassDeliveries';

export function GlassDeliveriesTable() {
  const { data: deliveries, isLoading, error } = useGlassDeliveries();
  const deleteMutation = useDeleteGlassDelivery();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<{ id: number; rackNumber: string } | null>(null);

  const handleDelete = (id: number, rackNumber: string) => {
    setDeliveryToDelete({ id, rackNumber });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deliveryToDelete) {
      deleteMutation.mutate(deliveryToDelete.id);
      setDeliveryToDelete(null);
    }
  };

  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <TableSkeleton rows={5} columns={5} />
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numer stojaka</TableHead>
            <TableHead>Zamówienie klienta</TableHead>
            <TableHead>Data dostawy</TableHead>
            <TableHead className="text-center">Pozycje</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium">{delivery.rackNumber}</TableCell>
              <TableCell>{delivery.customerOrderNumber}</TableCell>
              <TableCell>
                {format(new Date(delivery.deliveryDate), 'dd.MM.yyyy', { locale: pl })}
              </TableCell>
              <TableCell className="text-center">
                {delivery._count?.items || delivery.items?.length || 0}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Opcje dostawy szyb">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDelete(delivery.id, delivery.rackNumber)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog potwierdzenia usunięcia */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Usuń dostawę szyb"
        description={`Czy na pewno chcesz usunąć dostawę ${deliveryToDelete?.rackNumber || ''}? Wszystkie powiązane pozycje zostaną również usunięte.`}
        confirmText="Usuń"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
