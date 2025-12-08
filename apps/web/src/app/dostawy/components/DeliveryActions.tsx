'use client';

import { CheckCircle2, Package, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryActionsProps {
  delivery: {
    id: number;
    deliveryOrders?: Array<{ order: { id: number } }>;
  };
  onComplete: () => void;
  onOptimize: () => void;
  onProtocol: () => void;
  isProtocolLoading?: boolean;
}

export default function DeliveryActions({
  delivery,
  onComplete,
  onOptimize,
  onProtocol,
  isProtocolLoading = false,
}: DeliveryActionsProps) {
  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const isDisabled = !hasOrders;

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={onComplete}
        disabled={isDisabled}
        title="Oznacz zlecenia jako zakończone"
        aria-label="Mark orders as completed"
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onOptimize}
        disabled={isDisabled}
        title="Optymalizuj palety"
        aria-label="Optimize pallets"
      >
        <Package className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onProtocol}
        disabled={isDisabled || isProtocolLoading}
        title="Pobierz protokół odbioru"
        aria-label="Download delivery protocol"
      >
        {isProtocolLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
