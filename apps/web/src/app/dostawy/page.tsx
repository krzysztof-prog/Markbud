/**
 * Dostawy Page
 *
 * Client component with lazy loading for better performance
 * Uses dynamic import to reduce initial bundle size
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const DostawyPageContent = dynamic(() => import('./DostawyPageContent'), {
  loading: () => <TableSkeleton />,
  ssr: false,
});

export default function DostawyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
