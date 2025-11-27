import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'AKROBUD - System zarządzania produkcją',
  description: 'System do zarządzania zamówieniami, magazynem i dostawami okien',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-slate-50 md:ml-0">{children}</main>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
