'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <h1 className="text-3xl font-bold text-slate-900 text-center">
                Coś poszło nie tak
              </h1>
              <p className="text-slate-600 text-center">
                Przepraszamy, wystąpił nieoczekiwany błąd w aplikacji. Spróbuj odświeżyć stronę lub skontaktuj się z supportem.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-mono text-red-700 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Odśwież stronę
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  Wróć do strony głównej
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
