'use client';

import React from 'react';
import { Truck, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserDeliveries } from '../api/mojaPracaApi';
import type { UserDelivery } from '../types';

interface UserDeliveriesListProps {
  date: string;
}

export const UserDeliveriesList: React.FC<UserDeliveriesListProps> = ({ date }) => {
  const { data: deliveries, isLoading, error } = useUserDeliveries(date);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Błąd ładowania dostaw: {error.message}
      </div>
    );
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-lg font-medium">Brak dostaw</p>
        <p className="text-sm">Nie masz żadnych dostaw zaplanowanych na ten dzień.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliveries.map((delivery) => (
        <DeliveryCard key={delivery.id} delivery={delivery} />
      ))}
    </div>
  );
};

interface DeliveryCardProps {
  delivery: UserDelivery;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery }) => {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      planned: { label: 'Zaplanowana', variant: 'outline' },
      loading: { label: 'Ładowanie', variant: 'secondary' },
      in_transit: { label: 'W drodze', variant: 'default' },
      delivered: { label: 'Dostarczona', variant: 'outline' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4" />
            {delivery.deliveryNumber || `Dostawa #${delivery.id}`}
          </CardTitle>
          {getStatusBadge(delivery.status)}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDate(delivery.deliveryDate)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Twoje zlecenia ({delivery.orders.length} z {delivery.totalOrdersInDelivery} w dostawie):
          </div>

          <div className="space-y-1">
            {delivery.orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
              >
                <Package className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{order.orderNumber}</span>
                {order.client && (
                  <span className="text-muted-foreground">- {order.client}</span>
                )}
                <span className="ml-auto text-muted-foreground">
                  {order.totalWindows ?? '-'} okien
                </span>
              </div>
            ))}
          </div>

          {delivery.notes && (
            <div className="text-sm text-muted-foreground mt-2">
              Uwagi: {delivery.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDeliveriesList;
