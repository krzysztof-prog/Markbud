'use client';

import { Package, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAluminumGlassesSummary } from '../hooks/useGlassDeliveries';

export function AluminumGlassSummary() {
  const { data, isLoading, error } = useAluminumGlassesSummary();

  // Oblicz sumę całkowitą
  const totalQuantity = data?.reduce((sum, item) => sum + item.totalQuantity, 0) ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie zamowien aluminiowych</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={3} columns={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie zamowien aluminiowych</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<AlertCircle className="h-12 w-12" />}
            title="Blad ladowania"
            description={error.message}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie zamowien aluminiowych</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Brak zamowien"
            description="Brak szyb aluminiowych do podsumowania."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Podsumowanie zamowien aluminiowych</span>
          <span className="text-lg font-normal text-muted-foreground">
            Razem: <span className="font-bold text-foreground">{totalQuantity}</span> szt.
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr zamowienia klienta</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead className="text-right">Suma sztuk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.customerOrderNumber}>
                  <TableCell className="font-medium">{item.customerOrderNumber}</TableCell>
                  <TableCell>{item.clientName || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{item.totalQuantity}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>RAZEM</TableCell>
                <TableCell className="text-right">{totalQuantity}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
