'use client';

/**
 * Dashboard Page
 *
 * Client component (data fetching happens client-side)
 * Uses lazy loading for faster initial load
 */

import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';

const DashboardContent = dynamic(
  () => import('@/features/dashboard/components/DashboardContent').then((mod) => mod.default),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);

export default function DashboardPage() {
  return <DashboardContent />;
}
