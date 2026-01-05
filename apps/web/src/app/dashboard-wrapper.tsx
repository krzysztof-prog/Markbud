'use client';

/**
 * Client Component Wrapper dla Dashboard
 * Rozwiązuje problemy z lazy loading i Suspense
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import { Header } from '@/components/layout/header';

const DashboardContent = dynamic(
  () => import('@/features/dashboard/components/DashboardContent').then((mod) => mod.DashboardContent),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);

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
