'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  GitMerge,
  Replace,
  Clock,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types based on the requirements
interface OrderVariant {
  id?: number;
  orderNumber: string;
  variantSuffix?: string;
  importDate: string;
  windowCount: number;
  sashCount: number;
  glassCount: number;
  status?: string;
  source?: string;
}

interface ComparisonMetrics {
  windowCountDiff: number;
  sashCountDiff: number;
  glassCountDiff: number;
}

type ConflictType = 'base_exists' | 'variant_exists' | 'multiple_variants';
type RecommendationType = 'merge' | 'replace_base' | 'use_latest' | 'keep_both' | 'manual';
type VariantResolutionAction =
  | 'merge'
  | 'replace_base'
  | 'replace_variant'
  | 'use_latest'
  | 'keep_both'
  | 'manual';

interface VariantConflict {
  type: ConflictType;
  newOrder: OrderVariant;
  existingOrders: OrderVariant[];
  comparisonMetrics: ComparisonMetrics;
  recommendation: RecommendationType;
  reasoning: string;
}

interface OrderVariantConflictModalProps {
  conflict: VariantConflict | null;
  onResolve: (action: VariantResolutionAction) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

const OrderVariantConflictModal: React.FC<OrderVariantConflictModalProps> = ({
  conflict,
  onResolve,
  onCancel,
  isOpen,
}) => {
  const [isResolving, setIsResolving] = React.useState(false);

  if (!conflict) return null;

  const handleResolve = async (action: VariantResolutionAction) => {
    setIsResolving(true);
    try {
      await onResolve(action);
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictTypeLabel = (type: ConflictType): string => {
    const labels: Record<ConflictType, string> = {
      base_exists: 'Zlecenie bazowe istnieje',
      variant_exists: 'Wariant istnieje',
      multiple_variants: 'Wiele wariantów',
    };
    return labels[type];
  };

  const getConflictSeverity = (
    type: ConflictType
  ): 'default' | 'warning' | 'destructive' => {
    const severity: Record<ConflictType, 'default' | 'warning' | 'destructive'> = {
      base_exists: 'warning',
      variant_exists: 'warning',
      multiple_variants: 'destructive',
    };
    return severity[type];
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getDiffBadgeVariant = (diff: number): 'success' | 'destructive' | 'secondary' => {
    if (diff > 0) return 'success';
    if (diff < 0) return 'destructive';
    return 'secondary';
  };

  const formatDiff = (diff: number): string => {
    if (diff > 0) return `+${diff}`;
    return `${diff}`;
  };

  const getRecommendationIcon = (recommendation: RecommendationType) => {
    const icons: Record<RecommendationType, React.ReactNode> = {
      merge: <GitMerge className="h-5 w-5" />,
      replace_base: <Replace className="h-5 w-5" />,
      use_latest: <Clock className="h-5 w-5" />,
      keep_both: <Copy className="h-5 w-5" />,
      manual: <AlertTriangle className="h-5 w-5" />,
    };
    return icons[recommendation];
  };

  const getActionButtons = (): Array<{
    action: VariantResolutionAction;
    label: string;
    variant: 'default' | 'outline' | 'destructive' | 'secondary';
    icon: React.ReactNode;
  }> => {
    const baseButtons = [
      {
        action: 'merge' as VariantResolutionAction,
        label: 'Scal dane',
        variant: 'default' as const,
        icon: <GitMerge className="h-4 w-4 mr-2" />,
      },
      {
        action: 'replace_base' as VariantResolutionAction,
        label: 'Zastąp bazowe',
        variant: 'outline' as const,
        icon: <Replace className="h-4 w-4 mr-2" />,
      },
      {
        action: 'use_latest' as VariantResolutionAction,
        label: 'Użyj najnowszego',
        variant: 'outline' as const,
        icon: <Clock className="h-4 w-4 mr-2" />,
      },
      {
        action: 'keep_both' as VariantResolutionAction,
        label: 'Zachowaj oba',
        variant: 'secondary' as const,
        icon: <Copy className="h-4 w-4 mr-2" />,
      },
    ];

    // Filter based on conflict type and recommendation
    return baseButtons.filter((btn) => {
      if (conflict.recommendation === btn.action) return true;
      if (conflict.type === 'multiple_variants' && btn.action === 'keep_both') return true;
      if (conflict.type === 'base_exists' && btn.action === 'replace_base') return true;
      if (btn.action === 'merge' || btn.action === 'use_latest') return true;
      return false;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              Konflikt wariantu zlecenia: {conflict.newOrder.orderNumber}
            </DialogTitle>
            <Badge variant={getConflictSeverity(conflict.type)}>
              {getConflictTypeLabel(conflict.type)}
            </Badge>
          </div>
          <DialogDescription>
            Wykryto konflikt podczas importu. Wybierz odpowiednią strategię rozwiązania.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Różnica okien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {getDiffIcon(conflict.comparisonMetrics.windowCountDiff)}
                </div>
                <Badge variant={getDiffBadgeVariant(conflict.comparisonMetrics.windowCountDiff)}>
                  {formatDiff(conflict.comparisonMetrics.windowCountDiff)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Różnica skrzydeł
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {getDiffIcon(conflict.comparisonMetrics.sashCountDiff)}
                </div>
                <Badge variant={getDiffBadgeVariant(conflict.comparisonMetrics.sashCountDiff)}>
                  {formatDiff(conflict.comparisonMetrics.sashCountDiff)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Różnica szyb
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {getDiffIcon(conflict.comparisonMetrics.glassCountDiff)}
                </div>
                <Badge variant={getDiffBadgeVariant(conflict.comparisonMetrics.glassCountDiff)}>
                  {formatDiff(conflict.comparisonMetrics.glassCountDiff)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="my-6">
          <h3 className="text-lg font-semibold mb-3">Porównanie danych</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Numer zlecenia</TableHead>
                  <TableHead className="text-center">Okna</TableHead>
                  <TableHead className="text-center">Skrzydła</TableHead>
                  <TableHead className="text-center">Szyby</TableHead>
                  <TableHead>Data importu</TableHead>
                  <TableHead>Źródło</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Order */}
                <TableRow className="bg-blue-50 hover:bg-blue-100">
                  <TableCell>
                    <Badge variant="default">Nowe</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {conflict.newOrder.orderNumber}
                    {conflict.newOrder.variantSuffix && (
                      <span className="text-muted-foreground ml-1">
                        {conflict.newOrder.variantSuffix}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {conflict.newOrder.windowCount}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {conflict.newOrder.sashCount}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {conflict.newOrder.glassCount}
                  </TableCell>
                  <TableCell>
                    {new Date(conflict.newOrder.importDate).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{conflict.newOrder.source || 'Import'}</Badge>
                  </TableCell>
                </TableRow>

                {/* Existing Orders */}
                {conflict.existingOrders.map((order, index) => (
                  <TableRow
                    key={order.id || index}
                    className={cn(
                      'hover:bg-muted/50',
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}
                  >
                    <TableCell>
                      <Badge variant="secondary">Istniejące</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                      {order.variantSuffix && (
                        <span className="text-muted-foreground ml-1">{order.variantSuffix}</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-center',
                        order.windowCount !== conflict.newOrder.windowCount &&
                          'bg-yellow-50 font-semibold'
                      )}
                    >
                      {order.windowCount}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-center',
                        order.sashCount !== conflict.newOrder.sashCount &&
                          'bg-yellow-50 font-semibold'
                      )}
                    >
                      {order.sashCount}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-center',
                        order.glassCount !== conflict.newOrder.glassCount &&
                          'bg-yellow-50 font-semibold'
                      )}
                    >
                      {order.glassCount}
                    </TableCell>
                    <TableCell>
                      {new Date(order.importDate).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.source || 'Import'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* AI Recommendation */}
        <Alert variant={conflict.recommendation === 'manual' ? 'destructive' : 'warning'}>
          <div className="flex items-start gap-3">
            {getRecommendationIcon(conflict.recommendation)}
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Rekomendacja AI
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="font-medium mb-1">
                  Sugerowana akcja:{' '}
                  <span className="font-bold">
                    {conflict.recommendation === 'merge' && 'Scal dane'}
                    {conflict.recommendation === 'replace_base' && 'Zastąp zlecenie bazowe'}
                    {conflict.recommendation === 'use_latest' && 'Użyj najnowszego'}
                    {conflict.recommendation === 'keep_both' && 'Zachowaj oba zlecenia'}
                    {conflict.recommendation === 'manual' && 'Wymaga ręcznej decyzji'}
                  </span>
                </p>
                <p className="text-sm mt-2">{conflict.reasoning}</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {/* Action Buttons */}
        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isResolving}>
              Anuluj
            </Button>
            <div className="flex flex-wrap gap-2">
              {getActionButtons().map((button) => (
                <Button
                  key={button.action}
                  variant={
                    button.action === conflict.recommendation ? 'default' : button.variant
                  }
                  onClick={() => handleResolve(button.action)}
                  disabled={isResolving}
                  className={cn(
                    'transition-all',
                    button.action === conflict.recommendation &&
                      'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {button.icon}
                  {button.label}
                  {button.action === conflict.recommendation && (
                    <CheckCircle className="h-4 w-4 ml-2" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderVariantConflictModal;
