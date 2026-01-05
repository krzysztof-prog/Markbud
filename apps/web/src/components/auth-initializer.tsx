'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/auth-token';

/**
 * AuthInitializer - ensures authentication token is loaded before app initialization
 *
 * This component:
 * 1. Fetches/loads the authentication token on mount
 * 2. Stores it in localStorage for subsequent requests
 * 3. Shows loading state while token is being fetched
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch or retrieve authentication token
        await getAuthToken();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      } finally {
        setIsReady(true);
      }
    };

    initAuth();
  }, []);

  // Show loading state while initializing auth
  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
          <p className="text-sm text-slate-600">Inicjalizacja...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
