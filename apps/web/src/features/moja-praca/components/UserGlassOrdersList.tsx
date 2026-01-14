'use client';

import React from 'react';
import { Layers, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserGlassOrders } from '../api/mojaPracaApi';
import type { UserGlassOrder } from '../types';

interface UserGlassOrdersListProps {
  date: string;
}

export const UserGlassOrdersList: React.FC<UserGlassOrdersListProps> = ({ date }) => {
  const { data: glassOrders, isLoading, error } = useUserGlassOrders(date);

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
        Błąd ładowania zamówień szyb: {error.message}
      </div>
    );
  }

  if (!glassOrders || glassOrders.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Layers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-lg font-medium">Brak zamówień szyb</p>
        <p className="text-sm">Nie masz żadnych zamówień szyb na ten dzień.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {glassOrders.map((glassOrder) => (
        <GlassOrderCard key={glassOrder.id} glassOrder={glassOrder} />
      ))}
    </div>
  );
};

interface GlassOrderCardProps {
  glassOrder: UserGlassOrder;
}

const GlassOrderCard: React.FC<GlassOrderCardProps> = ({ glassOrder }) => {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: 'Oczekuje', variant: 'outline' },
      ordered: { label: 'Zamówione', variant: 'default' },
      in_production: { label: 'W produkcji', variant: 'secondary' },
      ready: { label: 'Gotowe', variant: 'outline' },
      delivered: { label: 'Dostarczone', variant: 'outline' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {glassOrder.glassOrderNumber}
          </CardTitle>
          {getStatusBadge(glassOrder.status)}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Data: {formatDate(glassOrder.orderDate)}</span>
          {glassOrder.supplier && <span>Dostawca: {glassOrder.supplier}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Pozycje dla Twoich zleceń ({glassOrder.itemsCount}):
          </div>

          <div className="space-y-1">
            {glassOrder.items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
              >
                <Square className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{item.orderNumber}</span>
                {item.glassType && (
                  <span className="text-muted-foreground">{item.glassType}</span>
                )}
                <span className="ml-auto text-muted-foreground">
                  {item.widthMm && item.heightMm
                    ? `${item.widthMm}x${item.heightMm}mm`
                    : '-'}{' '}
                  × {item.quantity}
                </span>
              </div>
            ))}
            {glassOrder.items.length > 5 && (
              <div className="text-sm text-muted-foreground text-center py-1">
                ... i {glassOrder.items.length - 5} więcej pozycji
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserGlassOrdersList;
