'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

export default function ProfileNaDostawyPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to warehouse tab
    router.replace('/magazyn/akrobud/szczegoly?tab=magazyn');
  }, [router]);

  return <TableSkeleton />;
}
