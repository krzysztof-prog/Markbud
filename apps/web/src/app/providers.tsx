'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// Create persister for localStorage
const persister = typeof window !== 'undefined'
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'AKROBUD_REACT_QUERY_CACHE',
    })
  : undefined;

function RealtimeSyncWrapper({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes default
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 404 or 403
              if (error?.status === 404 || error?.status === 403) {
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

  // Use PersistQueryClientProvider if persister is available (client-side)
  if (persister) {
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
        <RealtimeSyncWrapper>{children}</RealtimeSyncWrapper>
        <Toaster />
      </PersistQueryClientProvider>
    );
  }

  // Fallback for server-side rendering
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSyncWrapper>{children}</RealtimeSyncWrapper>
      <Toaster />
    </QueryClientProvider>
  );
}
