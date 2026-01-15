'use client';

import { CheckCircle2, Package, FileText, Loader2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeliveryActionsProps {
  delivery: {
    id: number;
    deliveryDate: string;
    deliveryOrders?: Array<{ order: { id: number } }>;
  };
  onComplete: () => void;
  onOptimize: () => void;
  onProtocol: () => void;
  onVerify: () => void;
  isProtocolLoading?: boolean;
}

export default function DeliveryActions({
  delivery,
  onComplete,
  onOptimize,
  onProtocol,
  onVerify,
  isProtocolLoading = false,
}: DeliveryActionsProps) {
  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const isDisabled = !hasOrders;

  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onVerify}
            aria-label="Weryfikuj listę Akrobud"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Weryfikuj listę Akrobud</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onComplete}
            disabled={isDisabled}
            aria-label="Oznacz zlecenia jako zakończone"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Oznacz zlecenia jako zakończone</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOptimize}
            disabled={isDisabled}
            aria-label="Optymalizuj palety"
          >
            <Package className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Optymalizuj palety</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onProtocol}
            disabled={isDisabled || isProtocolLoading}
            aria-label="Pobierz protokół odbioru"
            aria-busy={isProtocolLoading}
          >
            {isProtocolLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pobierz protokół odbioru</TooltipContent>
      </Tooltip>
    </div>
  );
}
