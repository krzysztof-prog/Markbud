/**
 * Magazyn Stal Page
 *
 * Widok magazynu wzmocnień stalowych
 * W przeciwieństwie do magazynu PVC, stal nie ma kolorów
 *
 * DEV: lazy loading (faster start)
 * PROD: eager loading (faster runtime)
 */

'use client';

import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const MagazynStalPageContent = createDynamicComponent(
  () => import('./MagazynStalPageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
);

export default function MagazynStalPage() {
  return <MagazynStalPageContent />;
}
