/**
 * Logistyka Page
 *
 * Strona modułu logistyki - parsowanie maili z listami dostaw
 */

'use client';

import { Suspense } from 'react';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { LogistykaPageContent } from '@/features/logistics/components/LogistykaPageContent';

export default function LogistykaPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <LogistykaPageContent />
    </Suspense>
  );
}
