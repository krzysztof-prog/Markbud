'use client';

/**
 * Admin Layout
 * Dedykowany layout dla panelu administracyjnego /admin/*
 * Ma własny sidebar z menu admina
 * Protected: tylko OWNER i ADMIN mogą dostać się tutaj (middleware sprawdza)
 */

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { ErrorReportButton } from '@/components/ErrorReportButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main id="main-content" className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>

      {/* Przycisk zgłaszania błędów - prawy dolny róg */}
      <div className="fixed bottom-4 right-4 z-50">
        <ErrorReportButton />
      </div>
    </div>
  );
}
