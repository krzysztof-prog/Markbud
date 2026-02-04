'use client';

/**
 * HelpButton - Floating "?" button w prawym dolnym rogu
 *
 * Widoczny tylko gdy:
 * 1. Strona ma zdefiniowaną instrukcję
 * 2. Użytkownik ma dostęp do tej strony (RoleGate)
 */

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHelpContent } from '@/features/help/hooks/useHelpContent';

// Lazy load dialog - ciężki komponent (next/dynamic dla App Router)
const HelpDialog = dynamic(() => import('./HelpDialog'), {
  ssr: false,
});

function HelpDialogSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { hasHelp, helpContent } = useHelpContent();

  // Nie pokazuj jeśli brak instrukcji dla tej strony
  if (!hasHelp || !helpContent) {
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700"
        aria-label="Otwórz instrukcję obsługi"
        title="Pomoc"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Suspense fallback={<HelpDialogSkeleton />}>
          <HelpDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            content={helpContent}
          />
        </Suspense>
      )}
    </>
  );
}
