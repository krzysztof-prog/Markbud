'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Package, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlassOrderSummary } from '../hooks/useGlassOrders';
import { GlassValidationBadge } from './GlassValidationBadge';
import type { GlassOrder } from '../types';

interface GlassOrderDetailModalProps {
  order: GlassOrder;
  onClose: () => void;
}

export function GlassOrderDetailModal({ order, onClose }: GlassOrderDetailModalProps) {
  const { data: summary } = useGlassOrderSummary(order.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Zamowienie: {order.glassOrderNumber}</span>
            <Badge>{order.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div>
            <p className="text-sm text-gray-500">Data zamowienia</p>
            <p className="font-medium">
              {format(new Date(order.orderDate), 'dd.MM.yyyy', { locale: pl })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dostawca</p>
            <p className="font-medium">{order.supplier}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Zamawiajacy</p>
            <p className="font-medium">{order.orderedBy || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Oczekiwana dostawa</p>
            <p className="font-medium">
              {order.expectedDeliveryDate
                ? format(new Date(order.expectedDeliveryDate), 'dd.MM.yyyy', { locale: pl })
                : '-'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 py-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Zamowione</p>
                <p className="text-2xl font-bold">{summary.totalOrdered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Dostarczone</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalDelivered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Brakuje</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.max(0, summary.totalOrdered - summary.totalDelivered)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Issues */}
        {summary?.issues && summary.issues.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Problemy ({summary.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {summary.issues.map((issue) => (
                  <li key={issue.id} className="flex items-center gap-2">
                    <GlassValidationBadge severity={issue.severity} />
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Order Breakdown */}
        {summary?.orderBreakdown && summary.orderBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Rozbicie na zlecenia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zlecenie</TableHead>
                    <TableHead className="text-center">Zamowione</TableHead>
                    <TableHead className="text-center">Dostarczone</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.orderBreakdown.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{item.orderNumber}</TableCell>
                      <TableCell className="text-center">{item.ordered}</TableCell>
                      <TableCell className="text-center">{item.delivered}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.status === 'complete'
                              ? 'default'
                              : item.status === 'excess'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status === 'complete'
                            ? 'Kompletne'
                            : item.status === 'partial'
                            ? 'Czesciowe'
                            : item.status === 'excess'
                            ? 'Nadmiar'
                            : 'Oczekuje'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        {order.items && order.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pozycje zamowienia ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zlecenie</TableHead>
                      <TableHead>Typ szyby</TableHead>
                      <TableHead className="text-center">Wymiary</TableHead>
                      <TableHead className="text-center">Ilosc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">
                          {item.orderNumber}
                          {item.orderSuffix && `-${item.orderSuffix}`}
                        </TableCell>
                        <TableCell className="text-sm">{item.glassType}</TableCell>
                        <TableCell className="text-center">
                          {item.widthMm} x {item.heightMm}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
