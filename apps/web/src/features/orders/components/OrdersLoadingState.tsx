'use client';

/**
 * Komponent stanu ładowania dla zestawienia zleceń
 * Pokazuje skeleton tabeli zamiast spinnera dla lepszego UX
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ================================
// Komponent
// ================================

export const OrdersLoadingState: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-4">
        {/* Skeleton dla filtrów */}
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Skeleton dla tabeli */}
        <div className="space-y-3">
          {/* Header tabeli */}
          <div className="flex gap-4 pb-2 border-b">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Wiersze tabeli */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
        {/* Skeleton dla paginacji */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersLoadingState;
