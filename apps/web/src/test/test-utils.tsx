/**
 * Test utilities for React component testing
 * Provides wrapper with QueryClient and other providers
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        gcTime: 0, // Don't cache results
        staleTime: 0, // Always consider data stale
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function customRender(
  ui: ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {}
) {
  const testQueryClient = queryClient ?? createTestQueryClient();

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: AllTheProviders, ...options }),
    queryClient: testQueryClient,
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render method
export { customRender as render };
