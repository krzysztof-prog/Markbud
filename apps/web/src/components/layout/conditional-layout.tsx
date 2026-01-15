'use client';

/**
 * Conditional Layout
 * Pokazuje sidebar tylko na stronach innych niż /login
 *
 * Fix Hydration Error: używamy useState + useEffect aby sprawdzić pathname
 * dopiero po montowaniu komponentu (client-side only)
 */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ClientSidebar } from './client-sidebar';
import { ErrorReportButton } from '@/components/ErrorReportButton';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  // Mounting check - zapobiega hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Podczas server-side render lub przed montowaniem - pokazuj layout bez sidebara
  // (bezpieczne dla SEO, unika hydration error)
  if (!isMounted) {
    return <>{children}</>;
  }

  // Po zamontowaniu - sprawdź pathname (tylko client-side)
  const isLoginPage = pathname === '/login';
  const isAdminPage = pathname?.startsWith('/admin');

  if (isLoginPage || isAdminPage) {
    // Strona logowania lub admin - bez głównego sidebara
    // (admin ma własny layout z AdminSidebar w apps/web/src/app/admin/layout.tsx)
    return <>{children}</>;
  }

  // Inne strony - z sidebarem + przycisk zgłaszania błędów
  return (
    <div className="flex h-screen">
      <ClientSidebar />
      <main id="main-content" className="flex-1 overflow-auto bg-slate-50 transition-all duration-300">
        {children}
      </main>

      {/* Przycisk zgłaszania błędów - prawy dolny róg */}
      <div className="fixed bottom-4 right-4 z-50">
        <ErrorReportButton />
      </div>
    </div>
  );
}
