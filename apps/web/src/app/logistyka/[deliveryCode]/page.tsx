'use client';

import { Suspense } from 'react';
import { DeliveryDetailContent } from './DeliveryDetailContent';
import { Skeleton } from '@/components/ui/skeleton';

interface DeliveryDetailPageProps {
  params: Promise<{ deliveryCode: string }>;
}

/**
 * Skeleton dla ładowania strony szczegółów dostawy
 */
function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>

      {/* Tabela pozycji */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryDetailPage({ params }: DeliveryDetailPageProps) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DeliveryDetailContent paramsPromise={params} />
    </Suspense>
  );
}
