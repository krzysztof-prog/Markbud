'use client';

/**
 * Client Component Wrapper dla Dashboard
 * Rozwiązuje problemy z lazy loading i Suspense
 */

import { Suspense } from 'react';
import { DashboardContent } from '@/features/dashboard/components/DashboardContent';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import { Header } from '@/components/layout/header';

export function DashboardWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Dashboard" alertsCount={0} />
          <DashboardSkeleton />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
