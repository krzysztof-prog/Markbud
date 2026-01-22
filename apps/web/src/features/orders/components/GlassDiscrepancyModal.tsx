'use client';

/**
 * Modal pokazujący szczegółowe rozbieżności w dostawie szyb dla zlecenia
 * Wyświetla porównanie per wymiar: zamówiono vs dostarczono z info o dostawach
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Package,
  Truck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';

// ================================
// Typy
// ================================

interface DimensionComparison {
  dimension: string;
  widthMm: number;
  heightMm: number;
  ordered: number;
  delivered: number;
  difference: number;
  status: 'ok' | 'surplus' | 'shortage' | 'missing' | 'extra';
  orderedPositions: string[];
  deliveries: {
    deliveryId: number;
    deliveryDate: string;
    rackNumber: string | null;
    quantity: number;
  }[];
  glassType: string | null;
}

interface DeliveryInfo {
  id: number;
  deliveryDate: string;
  rackNumber: string | null;
  customerOrderNumber: string | null;
}

interface DetailedDiscrepancies {
  orderNumber: string;
  summary: {
    totalOrdered: number;
    totalDelivered: number;
    difference: number;
    status: 'ok' | 'surplus' | 'shortage';
  };
  comparison: DimensionComparison[];
  deliveries: DeliveryInfo[];
}

interface GlassDiscrepancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string | null;
}

// ================================
// Pomocnicze funkcje
// ================================

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getStatusIcon = (status: DimensionComparison['status']) => {
  switch (status) {
    case 'ok':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'surplus':
    case 'extra':
      return <Plus className="h-4 w-4 text-orange-500" />;
    case 'shortage':
    case 'missing':
      return <Minus className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-400" />;
  }
};

const getStatusBadge = (status: DimensionComparison['status']) => {
  switch (status) {
    case 'ok':
      return <Badge className="bg-green-100 text-green-800">OK</Badge>;
    case 'surplus':
      return <Badge className="bg-orange-100 text-orange-800">Nadwyżka</Badge>;
    case 'extra':
      return <Badge className="bg-orange-100 text-orange-800">Nie zamówiono</Badge>;
    case 'shortage':
      return <Badge className="bg-red-100 text-red-800">Brak</Badge>;
    case 'missing':
      return <Badge className="bg-red-100 text-red-800">Nie dostarczono</Badge>;
    default:
      return <Badge variant="outline">Nieznany</Badge>;
  }
};

const getStatusRowColor = (status: DimensionComparison['status']) => {
  switch (status) {
    case 'ok':
      return 'bg-green-50 border-green-200';
    case 'surplus':
    case 'extra':
      return 'bg-orange-50 border-orange-200';
    case 'shortage':
    case 'missing':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-slate-50 border-slate-200';
  }
};

// ================================
// Komponent
// ================================

export function GlassDiscrepancyModal({
  open,
  onOpenChange,
  orderNumber,
}: GlassDiscrepancyModalProps) {
  // Pobierz szczegółowe rozbieżności
  const { data, isLoading, error } = useQuery<DetailedDiscrepancies>({
    queryKey: ['glass-discrepancies-details', orderNumber],
    queryFn: () => fetchApi(`/api/glass-validations/order/${orderNumber}/details`),
    enabled: open && !!orderNumber,
  });

  if (!orderNumber) return null;

  const hasIssues = data?.comparison.some((c) => c.status !== 'ok') ?? false;
  const problemItems = data?.comparison.filter((c) => c.status !== 'ok') ?? [];
  const okItems = data?.comparison.filter((c) => c.status === 'ok') ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Rozbieżności szyb - Zlecenie {orderNumber}
          </DialogTitle>
          <DialogDescription>
            Szczegółowe porównanie zamówionych i dostarczonych szyb.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Nie udało się pobrać danych o rozbieżnościach.
            </div>
          )}

          {data && !isLoading && !error && (
            <>
              {/* Podsumowanie */}
              <div
                className={`border rounded-lg p-4 ${
                  data.summary.status === 'ok'
                    ? 'bg-green-50 border-green-200'
                    : data.summary.status === 'surplus'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {data.summary.status === 'ok' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : data.summary.status === 'surplus' ? (
                      <Plus className="h-6 w-6 text-orange-600" />
                    ) : (
                      <Minus className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-lg">
                        {data.summary.status === 'ok'
                          ? 'Wszystkie szyby dostarczone'
                          : data.summary.status === 'surplus'
                          ? `Nadwyżka: +${data.summary.difference} szt.`
                          : `Brak: ${data.summary.difference} szt.`}
                      </div>
                      <div className="text-sm text-slate-600">
                        Zamówiono: {data.summary.totalOrdered} szt. | Dostarczono:{' '}
                        {data.summary.totalDelivered} szt.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informacja o dostawach */}
              {data.deliveries.length > 0 && (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-700">
                    <Truck className="h-4 w-4" />
                    Dostawy dla tego zlecenia ({data.deliveries.length})
                  </div>
                  <div className="space-y-1">
                    {data.deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="text-xs text-slate-600 flex gap-3"
                      >
                        <span className="font-mono">#{delivery.id}</span>
                        <span>{formatDate(delivery.deliveryDate)}</span>
                        {delivery.rackNumber && (
                          <span>Rack: {delivery.rackNumber}</span>
                        )}
                        {delivery.customerOrderNumber && (
                          <span className="text-slate-400 truncate max-w-[200px]">
                            {delivery.customerOrderNumber}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista problemów (rozbieżności) */}
              {problemItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Rozbieżności ({problemItems.length})
                  </h3>
                  <div className="space-y-2">
                    {problemItems.map((item, idx) => (
                      <DimensionCard key={idx} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Szyby OK (zwinięte domyślnie) */}
              {okItems.length > 0 && (
                <details className="border rounded-lg">
                  <summary className="p-3 cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Szyby dostarczone prawidłowo ({okItems.length} pozycji)
                  </summary>
                  <div className="p-3 pt-0 space-y-2">
                    {okItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-600 flex items-center gap-3 py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-mono font-medium">
                          {item.widthMm}x{item.heightMm}
                        </span>
                        <span>
                          {item.ordered} szt.
                        </span>
                        {item.orderedPositions.length > 0 && (
                          <span className="text-slate-400">
                            ({item.orderedPositions.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Brak problemów */}
              {!hasIssues && data.comparison.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">
                    Wszystkie szyby zostały dostarczone prawidłowo.
                  </span>
                </div>
              )}

              {/* Brak danych */}
              {data.comparison.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-600">
                    Brak danych o szybach dla tego zlecenia.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================
// Komponent karty wymiaru
// ================================

interface DimensionCardProps {
  item: DimensionComparison;
}

function DimensionCard({ item }: DimensionCardProps) {
  return (
    <div className={`border rounded-lg p-3 ${getStatusRowColor(item.status)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {getStatusIcon(item.status)}
          <div className="space-y-1">
            {/* Wymiar i status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-medium text-sm">
                {item.widthMm} x {item.heightMm} mm
              </span>
              {getStatusBadge(item.status)}
            </div>

            {/* Porównanie ilości */}
            <div className="text-xs text-slate-600 flex gap-4">
              <span>
                Zamówiono: <strong>{item.ordered}</strong> szt.
              </span>
              <span>
                Dostarczono: <strong>{item.delivered}</strong> szt.
              </span>
              <span
                className={
                  item.difference > 0
                    ? 'text-orange-600 font-medium'
                    : item.difference < 0
                    ? 'text-red-600 font-medium'
                    : 'text-green-600'
                }
              >
                Różnica: {item.difference > 0 ? '+' : ''}
                {item.difference} szt.
              </span>
            </div>

            {/* Pozycje z zamówienia */}
            {item.orderedPositions.length > 0 && (
              <div className="text-xs text-slate-500">
                Pozycje: {item.orderedPositions.join(', ')}
              </div>
            )}

            {/* Info o dostawach dla tego wymiaru */}
            {item.deliveries.length > 0 && (
              <div className="text-xs text-slate-500 mt-1">
                <span className="font-medium">Dostawy:</span>{' '}
                {item.deliveries.map((d, idx) => (
                  <span key={d.deliveryId}>
                    {idx > 0 && ', '}
                    <span className="font-mono">#{d.deliveryId}</span> ({d.quantity}{' '}
                    szt. - {formatDate(d.deliveryDate)})
                  </span>
                ))}
              </div>
            )}

            {/* Typ szkła */}
            {item.glassType && (
              <div className="text-xs text-slate-400">
                Typ: {item.glassType}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
