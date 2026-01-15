import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'AKROBUD - System zarządzania produkcją',
  description: 'System do zarządzania zamówieniami, magazynem i dostawami okien',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <a href="#main-content" className="skip-to-main">
          Przejdź do głównej treści
        </a>
        <Providers>
          <ErrorBoundary>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
