'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Package, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { CategorizedGlassBase } from '../types';

interface CategorizedGlassTableProps {
  data: CategorizedGlassBase[] | undefined;
  isLoading: boolean;
  error: Error | null;
  emptyTitle: string;
  emptyDescription: string;
}

export function CategorizedGlassTable({
  data,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
}: CategorizedGlassTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-6">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Blad ladowania"
          description={error.message}
        />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-md border p-6">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr zamowienia</TableHead>
            <TableHead>Klient</TableHead>
            <TableHead>Zlecenie</TableHead>
            <TableHead className="text-right">Szer. (mm)</TableHead>
            <TableHead className="text-right">Wys. (mm)</TableHead>
            <TableHead className="text-right">Szt.</TableHead>
            <TableHead>Zespolenie</TableHead>
            <TableHead>Data dostawy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.customerOrderNumber}</TableCell>
              <TableCell>{item.clientName || '-'}</TableCell>
              <TableCell>{item.orderNumber}</TableCell>
              <TableCell className="text-right">{item.widthMm}</TableCell>
              <TableCell className="text-right">{item.heightMm}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={item.glassComposition || undefined}>
                {item.glassComposition || '-'}
              </TableCell>
              <TableCell>
                {item.glassDelivery?.deliveryDate
                  ? format(new Date(item.glassDelivery.deliveryDate), 'dd.MM.yyyy', { locale: pl })
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
