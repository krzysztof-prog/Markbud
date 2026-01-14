'use client';

import React from 'react';
import { FileText, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserOrders } from '../api/mojaPracaApi';
import { groszeToPln } from '@/lib/money';
import type { UserOrder } from '../types';

interface UserOrdersListProps {
  date: string;
}

export const UserOrdersList: React.FC<UserOrdersListProps> = ({ date }) => {
  const { data: orders, isLoading, error } = useUserOrders(date);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Błąd ładowania zleceń: {error.message}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-lg font-medium">Brak zleceń</p>
        <p className="text-sm">Nie masz żadnych zleceń zaimportowanych tego dnia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

interface OrderCardProps {
  order: UserOrder;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      new: { label: 'Nowe', variant: 'default' },
      in_production: { label: 'W produkcji', variant: 'secondary' },
      ready: { label: 'Gotowe', variant: 'outline' },
      delivered: { label: 'Dostarczone', variant: 'outline' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{order.orderNumber}</span>
              {getStatusBadge(order.status)}
            </div>

            {order.client && (
              <div className="text-sm text-muted-foreground mb-1">
                Klient: {order.client}
              </div>
            )}

            {order.project && (
              <div className="text-sm text-muted-foreground mb-2">
                Projekt: {order.project}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">Okna:</span>{' '}
                <span className="font-medium">{order.totalWindows ?? '-'}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Szyby:</span>{' '}
                <span className="font-medium">{order.totalGlasses ?? '-'}</span>
              </span>
              {order.valuePln && (
                <span>
                  <span className="text-muted-foreground">Wartość:</span>{' '}
                  <span className="font-medium">{groszeToPln(order.valuePln as number).toFixed(2)} PLN</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserOrdersList;
