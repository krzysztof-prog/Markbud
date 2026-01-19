'use client';

/**
 * Pending Prices Page
 * Pokazuje oczekujące ceny (ceny dla zleceń które jeszcze nie istnieją w bazie)
 */

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { PendingPricesList } from './PendingPricesList';
import { Skeleton } from '@/components/ui/skeleton';

function PendingPricesListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function PendingPricesPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Oczekujące ceny" alertsCount={0} />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<PendingPricesListSkeleton />}>
            <PendingPricesList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
