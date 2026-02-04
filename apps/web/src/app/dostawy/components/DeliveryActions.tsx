'use client';

import { CheckCircle2, Package, FileText, Loader2, ListChecks, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LabelCheckInfo {
  id: number;
  status: string;
  results: Array<{
    orderId: number;
    status: string;
  }>;
}

interface DeliveryActionsProps {
  delivery: {
    id: number;
    deliveryDate: string;
    deliveryOrders?: Array<{ order: { id: number } }>;
    labelChecks?: LabelCheckInfo[];
  };
  onComplete: () => void;
  onOptimize: () => void;
  onProtocol: () => void;
  onVerify: () => void;
  onCheckLabels: () => void;
  isProtocolLoading?: boolean;
}

export default function DeliveryActions({
  delivery,
  onComplete,
  onOptimize,
  onProtocol,
  onVerify,
  onCheckLabels,
  isProtocolLoading = false,
}: DeliveryActionsProps) {
  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const isDisabled = !hasOrders;

  // Status sprawdzenia etykiet - kolorowanie przycisku i tooltip
  const latestLabelCheck = delivery.labelChecks?.[0];
  const labelCheckStatus = (() => {
    if (!latestLabelCheck || latestLabelCheck.status !== 'completed') return 'none';
    if (latestLabelCheck.results.length === 0) return 'none';
    const allOk = latestLabelCheck.results.every(r => r.status === 'OK');
    return allOk ? 'ok' : 'warning';
  })();

  const labelCheckTooltip = (() => {
    if (labelCheckStatus === 'none') return null;
    const results = latestLabelCheck!.results;
    const okCount = results.filter(r => r.status === 'OK').length;
    const total = results.length;
    if (labelCheckStatus === 'ok') {
      return `Wszystkie etykiety OK (${okCount}/${total})`;
    }
    const issues = total - okCount;
    return `${issues} z ${total} etykiet wymaga uwagi`;
  })();

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={onVerify}
        aria-label="Weryfikuj listę Akrobud"
      >
        <ListChecks className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Weryfikuj
      </Button>

      {labelCheckTooltip ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onCheckLabels}
                disabled={isDisabled}
                className={
                  labelCheckStatus === 'ok'
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
                    : 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800'
                }
                aria-label="Sprawdź etykiety"
              >
                <Tags className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Sprawdź etykiety
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{labelCheckTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onCheckLabels}
          disabled={isDisabled}
          aria-label="Sprawdź etykiety"
        >
          <Tags className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Sprawdź etykiety
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={onComplete}
        disabled={isDisabled}
        aria-label="Oznacz zlecenia jako zakończone"
      >
        <CheckCircle2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Zakończ
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onOptimize}
        disabled={isDisabled}
        aria-label="Optymalizuj palety"
      >
        <Package className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Palety
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onProtocol}
        disabled={isDisabled || isProtocolLoading}
        aria-label="Pobierz protokół odbioru"
        aria-busy={isProtocolLoading}
      >
        {isProtocolLoading ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4 mr-1.5" aria-hidden="true" />
        )}
        Protokół
      </Button>
    </div>
  );
}
