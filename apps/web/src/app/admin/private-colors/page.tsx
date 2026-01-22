/**
 * Admin Panel - Zarządzanie kolorami prywatnymi (zewnętrznymi)
 *
 * Kolory prywatne są tworzone automatycznie podczas importu uzyte_bele_prywatne
 * gdy kolor nie istnieje w palecie Akrobud.
 *
 * Dostęp: Tylko owner i admin
 */

'use client';

import React, { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { PrivateColorsList } from '@/features/private-colors/components/PrivateColorsList';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">Ładowanie...</span>
  </div>
);

export default function PrivateColorsPage() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Panel Administratora" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Kolory prywatne (zewnętrzne)</h1>
            <p className="text-gray-600 mt-2">
              Lista kolorów spoza palety Akrobud, utworzonych automatycznie podczas importu zleceń prywatnych.
              Możesz edytować nazwę koloru aby lepiej go opisać.
            </p>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <PrivateColorsList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
