/**
 * Dostawy Page
 *
 * Client component with lazy loading for better performance
 * Uses dynamic import to reduce initial bundle size
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const DostawyPageContent = dynamic(
  () => import('./DostawyPageContent').then((mod) => mod.default),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
);

function DostawyPageInner() {
  const searchParams = useSearchParams();
  const _router = useRouter();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Handle order query param
  useEffect(() => {
    const orderId = searchParams.get('order');
    if (orderId) {
      const id = parseInt(orderId, 10);
      if (!isNaN(id)) {
        setSelectedOrderId(id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [searchParams]);

  return <DostawyPageContent initialSelectedOrderId={selectedOrderId} />;
}

export default function DostawyPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DostawyPageInner />
    </Suspense>
  );
}
