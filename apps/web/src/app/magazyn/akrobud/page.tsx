'use client';

import { Suspense } from 'react';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import MagazynAkrobudPageContent from './MagazynAkrobudPageContent';

export default function MagazynAkrobudPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <MagazynAkrobudPageContent />
    </Suspense>
  );
}
