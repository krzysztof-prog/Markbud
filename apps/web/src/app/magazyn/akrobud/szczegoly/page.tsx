/**
 * Magazyn Akrobud - Szczegóły Page
 *
 * Client component with lazy loading for better performance
 * Uses dynamic import to reduce initial bundle size
 */

'use client';

import dynamic from 'next/dynamic';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const MagazynAkrobudPageContent = dynamic(
  () => import('./MagazynAkrobudPageContent').then((mod) => mod.default),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
);

export default function MagazynAkrobudSzczegolyPage() {
  return <MagazynAkrobudPageContent />;
}
