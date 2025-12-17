'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { AuthInitializer } from '@/components/auth-initializer';

function RealtimeSyncWrapper({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
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
            staleTime: 2 * 60 * 1000, // 2 minutes default
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: (failureCount, error: unknown) => {
              // Don't retry on 404 or 403
              const err = error as { status?: number };
              if (err?.status === 404 || err?.status === 403) {
                return false;
              }
              // Retry max 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  useEffect(() => {
    setMounted(true);
    // Create persister only on client side
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
          maxAge: 24 * 60 * 60 * 1000, // 24 hours cache persistence
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist successful queries
              return query.state.status === 'success';
            },
          },
        }}
      >
        <AuthInitializer>
          <RealtimeSyncWrapper>{children}</RealtimeSyncWrapper>
        </AuthInitializer>
        <Toaster />
      </PersistQueryClientProvider>
    );
  }

  // Initial render (SSR and first client render) - use regular QueryClientProvider
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <RealtimeSyncWrapper>{children}</RealtimeSyncWrapper>
      </AuthInitializer>
      <Toaster />
    </QueryClientProvider>
  );
}
