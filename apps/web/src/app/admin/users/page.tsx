/**
 * Admin Panel - Zarządzanie użytkownikami
 *
 * Dostęp: Tylko owner i admin
 */

'use client';

// Wymuszenie dynamicznego renderowania - strona używa AuthContext
export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { UsersList } from '@/features/admin';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">Ładowanie...</span>
  </div>
);

export default function AdminUsersPage() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Panel Administratora" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Zarządzanie użytkownikami</h1>
            <p className="text-gray-600 mt-2">
              Dodawaj, edytuj i usuwaj użytkowników systemu. Tylko administratorzy i właściciele mają dostęp do tego
              panelu.
            </p>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <UsersList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
