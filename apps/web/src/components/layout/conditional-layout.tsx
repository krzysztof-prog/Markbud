'use client';

/**
 * Conditional Layout
 * Pokazuje sidebar tylko na stronach innych niż /login
 *
 * Fix Hydration Error: używamy useState + useEffect aby sprawdzić pathname
 * dopiero po montowaniu komponentu (client-side only)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ClientSidebar } from './client-sidebar';
import { ErrorReportButton } from '@/components/ErrorReportButton';
import { HelpButton } from '@/components/help';

/**
 * Hook do przeciągania elementu (drag).
 * Pozycja startowa: prawy dolny róg.
 * Zapamiętuje pozycję w sessionStorage.
 */
function useDraggable() {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Odczytaj zapisaną pozycję z sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('floating-buttons-pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {
        // ignoruj błędne dane
      }
    }
  }, []);

  // Zapisz pozycję do sessionStorage
  useEffect(() => {
    if (position) {
      sessionStorage.setItem('floating-buttons-pos', JSON.stringify(position));
    }
  }, [position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Nie zaczynaj drag jeśli kliknięto w przycisk
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    e.preventDefault();
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    e.preventDefault();

    const { startX, startY, origX, origY } = dragState.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const el = ref.current;
    if (!el) return;

    // Ogranicz do widocznego obszaru
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    const newX = Math.max(0, Math.min(maxX, origX + dx));
    const newY = Math.max(0, Math.min(maxY, origY + dy));

    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return { ref, position, handlePointerDown, handlePointerMove, handlePointerUp };
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { ref, position, handlePointerDown, handlePointerMove, handlePointerUp } = useDraggable();

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

  // Styl pozycjonowania: domyślnie prawy dolny róg, po przeciągnięciu - absolutna pozycja
  const floatingStyle: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : {};

  // Inne strony - z sidebarem + przycisk zgłaszania błędów
  return (
    <div className="flex h-screen">
      <ClientSidebar />
      <main id="main-content" className="flex-1 overflow-auto bg-slate-50 transition-all duration-300">
        {children}
      </main>

      {/* Przyciski w prawym dolnym rogu: Pomoc + Zgłoś problem - przeciągalne */}
      <div
        ref={ref}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 cursor-grab active:cursor-grabbing rounded-full p-1"
        style={floatingStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <HelpButton />
        <ErrorReportButton />
      </div>
    </div>
  );
}
