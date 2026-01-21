/**
 * Kontrola Etykiet - Detail Page
 *
 * Client component with conditional lazy loading
 * DEV: lazy loading (faster start)
 * PROD: eager loading (faster runtime)
 */

'use client';

import { createDynamicComponent } from '@/lib/dynamic-import';
import { use } from 'react';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const LabelCheckDetailContent = createDynamicComponent(
  () => import('./LabelCheckDetailContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LabelCheckDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <LabelCheckDetailContent id={Number(id)} />;
}
