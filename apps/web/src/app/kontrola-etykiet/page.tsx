/**
 * Kontrola Etykiet Page
 *
 * Client component with conditional lazy loading
 * DEV: lazy loading (faster start)
 * PROD: eager loading (faster runtime)
 */

'use client';

import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const LabelChecksPageContent = createDynamicComponent(
  () => import('./LabelChecksPageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
);

export default function LabelChecksPage() {
  return <LabelChecksPageContent />;
}
