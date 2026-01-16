'use client';

/**
 * Client Component Wrapper dla Dashboard
 *
 * Bezposredni import - next/dynamic z ssr:false powoduje blad hydration
 * w Next.js 15.5.7. DashboardContent ma wlasne loading states.
 */

import { DashboardContent } from '@/features/dashboard/components/DashboardContent';

export function DashboardWrapper() {
  return <DashboardContent />;
}
