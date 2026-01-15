'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

/**
 * Custom 404 Page
 * Strona wyświetlana gdy żądana ścieżka nie istnieje
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6">
          <FileQuestion
            className="h-24 w-24 text-slate-300 mx-auto"
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">
          Strona nie znaleziona
        </h2>

        {/* Description */}
        <p className="text-slate-500 mb-8">
          Przepraszamy, ale strona której szukasz nie istnieje lub została
          przeniesiona. Sprawdź adres URL lub wróć do strony głównej.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="javascript:history.back()">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Wróć
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Strona główna
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-12">
        Jeśli uważasz, że to błąd, skontaktuj się z administratorem.
      </p>
    </div>
  );
}
