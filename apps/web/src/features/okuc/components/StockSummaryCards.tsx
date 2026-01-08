'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StockSummary } from '@/types/okuc';

interface StockSummaryCardsProps {
  summary: StockSummary[];
  isLoading?: boolean;
}

/**
 * Karty podsumowania stanów magazynowych OKUC
 *
 * Wyświetla karty dla każdego magazynu (PVC, ALU) z:
 * - Total (łączna liczba artykułów)
 * - BelowMin (liczba artykułów poniżej minimum - czerwony badge)
 * - BelowMax (liczba artykułów poniżej maximum - żółty badge)
 *
 * Layout: Responsive (mobile: stack, desktop: grid)
 */
export const StockSummaryCards: React.FC<StockSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  // Formatowanie nazwy magazynu
  const formatWarehouseName = (warehouseType: string, subWarehouse?: string | null) => {
    const type = warehouseType.toUpperCase();
    if (!subWarehouse) return type;

    const subMap: Record<string, string> = {
      production: 'Produkcja',
      buffer: 'Bufor',
      gabaraty: 'Gabaraty',
    };

    return `${type} - ${subMap[subWarehouse] || subWarehouse}`;
  };

  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Pusta lista
  if (summary.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              Brak danych do wyświetlenia
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {summary.map((item, index) => {
        const warehouseName = formatWarehouseName(item.warehouseType, item.subWarehouse);

        return (
          <Card key={`${item.warehouseType}-${item.subWarehouse || 'main'}-${index}`}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{warehouseName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Total Articles - Duża liczba */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Łącznie artykułów</div>
                <div className="text-3xl font-bold text-gray-900">{item.totalArticles}</div>
              </div>

              {/* Below Minimum - Czerwony badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Poniżej minimum:</span>
                <Badge variant="destructive" className="font-semibold">
                  {item.criticalCount}
                </Badge>
              </div>

              {/* Below Maximum - Żółty badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Poniżej maksimum:</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-semibold">
                  {item.availableCount}
                </Badge>
              </div>

              {/* Opcjonalnie: Zarezerwowane (jeśli będzie potrzebne) */}
              {item.reservedTotal > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Zarezerwowane:</span>
                  <Badge variant="outline" className="font-mono">
                    {item.reservedTotal}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StockSummaryCards;
