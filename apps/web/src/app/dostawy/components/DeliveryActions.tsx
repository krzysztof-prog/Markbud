'use client';

import { CheckCircle2, Package, FileText, Loader2, ListChecks, Tags, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LabelCheckInfo {
  id: number;
  status: string;
  okCount: number;
  mismatchCount: number;
  errorCount: number;
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
  isCheckLabelsLoading?: boolean;
  hasLabelCheck?: boolean;
}

export default function DeliveryActions({
  delivery,
  onComplete,
  onOptimize,
  onProtocol,
  onVerify,
  onCheckLabels,
  isProtocolLoading = false,
  isCheckLabelsLoading = false,
  hasLabelCheck = false,
}: DeliveryActionsProps) {
  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const isDisabled = !hasOrders;

  // Status sprawdzenia etykiet - kolorowanie przycisku i tooltip
  // Używamy okCount/mismatchCount/errorCount zamiast iterować po results
  const latestLabelCheck = delivery.labelChecks?.[0];
  const labelCheckStatus = (() => {
    if (!latestLabelCheck || latestLabelCheck.status !== 'completed') return 'none';
    const { okCount, mismatchCount, errorCount } = latestLabelCheck;
    const total = okCount + mismatchCount + errorCount;
    if (total === 0) return 'none';
    const hasIssues = mismatchCount > 0 || errorCount > 0;
    return hasIssues ? 'warning' : 'ok';
  })();

  const labelCheckTooltip = (() => {
    if (labelCheckStatus === 'none') return null;
    const { okCount, mismatchCount, errorCount } = latestLabelCheck!;
    const total = okCount + mismatchCount + errorCount;
    if (labelCheckStatus === 'ok') {
      return `Wszystkie etykiety OK (${okCount}/${total})`;
    }
    const issues = mismatchCount + errorCount;
    return `${issues} z ${total} etykiet wymaga uwagi`;
  })();

  return (
    <div className="flex items-center justify-center gap-2 flex-nowrap">
      <Button
        size="sm"
        variant="outline"
        onClick={onVerify}
        aria-label="Weryfikuj listę Akrobud"
      >
        <ListChecks className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Weryfikuj
      </Button>

      {/* Przycisk sprawdzania etykiet - różne stany */}
      {hasLabelCheck && labelCheckTooltip ? (
        // Jest sprawdzenie z wynikami - pokaż "Wyniki etykiet" z tooltipem
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
                aria-label="Zobacz wyniki sprawdzenia etykiet"
              >
                <Eye className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Wyniki etykiet
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{labelCheckTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : hasLabelCheck ? (
        // Jest sprawdzenie ale brak wyników (pending?) - pokaż "Wyniki etykiet"
        <Button
          size="sm"
          variant="outline"
          onClick={onCheckLabels}
          disabled={isDisabled}
          aria-label="Zobacz wyniki sprawdzenia etykiet"
        >
          <Eye className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Wyniki etykiet
        </Button>
      ) : (
        // Brak sprawdzenia - pokaż "Sprawdź etykiety" (uruchom OCR)
        <Button
          size="sm"
          variant="outline"
          onClick={onCheckLabels}
          disabled={isDisabled || isCheckLabelsLoading}
          aria-label="Uruchom sprawdzanie etykiet"
          aria-busy={isCheckLabelsLoading}
        >
          {isCheckLabelsLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
          ) : (
            <Tags className="h-4 w-4 mr-1.5" aria-hidden="true" />
          )}
          {isCheckLabelsLoading ? 'Sprawdzam...' : 'Sprawdź etykiety'}
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
