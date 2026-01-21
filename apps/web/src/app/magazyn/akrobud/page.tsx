/**
 * Magazyn Akrobud Page
 *
 * Client component with conditional lazy loading
 * DEV: lazy loading (faster start)
 * PROD: eager loading (faster runtime)
 */

'use client';

import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const MagazynAkrobudPageContent = createDynamicComponent(
  () => import('./MagazynAkrobudPageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
);

export default function MagazynAkrobudPage() {
  return <MagazynAkrobudPageContent />;
}
