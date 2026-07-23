'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { setupGlobalErrorHandler } from '@/lib/error-logger';
import { AuthProvider } from '@/features/auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { DeliveryAlerts } from '@/features/deliveries/components/DeliveryAlerts';

function RealtimeSyncWrapper({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  // WebSocket with graceful degradation - nie blokuje gdy nie działa
  // enabled=false podczas initial render, true dopiero po mount z persister
  // żeby uniknąć podwójnego WebSocket connection
  useRealtimeSync({ enabled });
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [persister, setPersister] = useState<ReturnType<typeof createSyncStoragePersister> | null>(null);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 sekund - krótki cache, real-time UX
            gcTime: 30 * 60 * 1000, // 30 minut - cache przechowywany dłużej
            refetchOnWindowFocus: true, // Odśwież przy powrocie do zakładki
            refetchOnMount: true, // Odśwież przy nawigacji między stronami
            refetchOnReconnect: true, // Pobieraj ponownie przy reconnect
            retry: (failureCount, error: unknown) => {
              // Nie retry na 404 lub 403
              const err = error as { status?: number };
              if (err?.status === 404 || err?.status === 403) {
                return false;
              }
              // Maksymalnie 1 retry dla innych błędów
              return failureCount < 1;
            },
            retryDelay: 1000, // Stałe opóźnienie 1s
            networkMode: 'online', // Tylko online
          },
          mutations: {
            retry: 0, // Bez retry dla mutacji
            retryDelay: 1000,
            networkMode: 'online',
          },
        },
      })
  );

  useEffect(() => {
    setMounted(true);

    // Konfiguracja globalnego error handlera
    setupGlobalErrorHandler();

    // Tworzenie persister tylko po stronie klienta
    const storagePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'AKROBUD_REACT_QUERY_CACHE',
    });
    setPersister(storagePersister);
  }, []);

  // Always render the same structure to avoid hydration mismatch
  // Use PersistQueryClientProvider once mounted with persister
  if (mounted && persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 5 * 60 * 1000, // 5 minut - krótki cache dla real-time UX
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist successful queries without errors
              return (
                query.state.status === 'success' &&
                query.state.data !== null &&
                query.state.data !== undefined
              );
            },
          },
        }}
      >
        <AuthProvider>
          <ErrorBoundary>
            <ConditionalLayout>
              <RealtimeSyncWrapper enabled>{children}</RealtimeSyncWrapper>
            </ConditionalLayout>
          </ErrorBoundary>
        </AuthProvider>
        <Toaster />
        <DeliveryAlerts />
      </PersistQueryClientProvider>
    );
  }

  // Initial render (SSR and first client render) - use regular QueryClientProvider
  // WebSocket wyłączony - będzie włączony dopiero po full mount z persister
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <ConditionalLayout>
            <RealtimeSyncWrapper enabled={false}>{children}</RealtimeSyncWrapper>
          </ConditionalLayout>
        </ErrorBoundary>
      </AuthProvider>
      <Toaster />
      <DeliveryAlerts />
    </QueryClientProvider>
  );
}
