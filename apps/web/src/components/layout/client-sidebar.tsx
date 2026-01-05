'use client';

import dynamic from 'next/dynamic';

// Dynamiczny import z wyłączonym SSR aby uniknąć hydration mismatch
// Sidebar używa useState i useEffect, co powoduje różnice między SSR a klientem
const Sidebar = dynamic(
  () => import('./sidebar').then((mod) => mod.Sidebar),
  {
    ssr: false,
    loading: () => (
      <div className="hidden md:flex h-full w-64 flex-col bg-slate-900" />
    ),
  }
);

export function ClientSidebar() {
  return <Sidebar />;
}
