'use client';

import { Suspense } from 'react';
import { createDynamicComponent } from '@/lib/dynamic-import';
import { Skeleton } from '@/components/ui/skeleton';

// DEV: lazy loading (faster start), PROD: eager loading (faster runtime)
const VerificationPageContent = createDynamicComponent(
  () => import('./VerificationPageContent').then((mod) => mod.default),
  { loading: () => <VerificationPageSkeleton /> }
);

function VerificationPageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Right columns */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function VeryfikacjaPage() {
  return (
    <Suspense fallback={<VerificationPageSkeleton />}>
      <VerificationPageContent />
    </Suspense>
  );
}
