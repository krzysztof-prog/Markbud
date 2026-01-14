'use client';

/**
 * Operator Dashboard Page - /operator
 *
 * Nowy dashboard operatora z prawdziwymi danymi.
 * Dostepny dla wszystkich zalogowanych uzytkownikow.
 *
 * Funkcjonalnosci:
 * - Prawdziwe dane z API (nie mock)
 * - Przelacznik "Tylko moje zlecenia" (dla KIEROWNIK+)
 * - Sekcja krytycznych alertow
 * - Karty statystyk
 * - Kompletnosc zlecen
 * - Ostatnie dzialania
 * - Szybkie akcje
 */

import React from 'react';
import { NewOperatorDashboard } from '@/features/dashboard';
import { Header } from '@/components/layout/header';

export default function OperatorPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard Operatora" alertsCount={0} />
      <div className="flex-1 overflow-auto">
        <NewOperatorDashboard />
      </div>
    </div>
  );
}
