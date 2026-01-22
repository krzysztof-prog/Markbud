/**
 * Magazyn PVC Page
 *
 * Lazy loading głównego komponentu dla lepszej wydajności
 */

'use client';

import { Suspense } from 'react';
import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const PvcWarehousePageContent = createDynamicComponent(
  () => import('./PvcWarehousePageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
);

export default function MagazynPVCPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <PvcWarehousePageContent />
    </Suspense>
  );
}
