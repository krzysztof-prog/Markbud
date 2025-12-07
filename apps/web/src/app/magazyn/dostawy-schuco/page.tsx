/**
 * Dostawy Schuco Page
 *
 * Client component with lazy loading for better performance
 * Uses dynamic import to reduce initial bundle size
 */

'use client';

import dynamic from 'next/dynamic';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const DostawySchucoPageContent = dynamic(() => import('./DostawySchucoPageContent'), {
  loading: () => <TableSkeleton />,
  ssr: false,
});

export default function DostawySchucoPage() {
  return <DostawySchucoPageContent />;
}
