/**
 * Logistyka Page
 *
 * Strona modułu logistyki - parsowanie maili z listami dostaw
 */

'use client';

import { Suspense } from 'react';
import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const LogistykaPageContent = createDynamicComponent(
  () => import('@/features/logistics/components/LogistykaPageContent').then((mod) => mod.LogistykaPageContent),
  { loading: () => <TableSkeleton /> }
);

export default function LogistykaPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <LogistykaPageContent />
    </Suspense>
  );
}
