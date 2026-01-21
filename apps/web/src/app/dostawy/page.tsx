/**
 * Dostawy Page
 *
 * Client component with conditional lazy loading
 * DEV: lazy loading (faster start)
 * PROD: eager loading (faster runtime)
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDynamicComponent } from '@/lib/dynamic-import';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const DostawyPageContent = createDynamicComponent(
  () => import('./DostawyPageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton /> }
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
