'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  /** Nazwa funkcjonalności - wyświetlana w komunikacie błędu */
  featureName?: string;
  /** Własny komponent fallback (opcjonalny) */
  fallback?: React.ReactNode;
  /** Callback wywoływany po kliknięciu "Spróbuj ponownie" */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * FeatureErrorBoundary - granularny Error Boundary dla pojedynczych funkcjonalności
 *
 * Użycie:
 * ```tsx
 * <FeatureErrorBoundary featureName="Lista dostaw">
 *   <DeliveriesTable />
 * </FeatureErrorBoundary>
 * ```
 *
 * Różnice vs globalny ErrorBoundary:
 * - Mniejszy, kompaktowy widok błędu (Card zamiast full-page)
 * - Przycisk "Spróbuj ponownie" resetuje tylko tę funkcjonalność
 * - Reszta strony działa normalnie
 */
export class FeatureErrorBoundary extends React.Component<FeatureErrorBoundaryProps, State> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Loguj błąd do konsoli (w przyszłości można wysłać do serwisu monitoringu)
    console.error(
      `[FeatureErrorBoundary] Błąd w ${this.props.featureName || 'komponent'}:`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      // Użyj własnego fallback jeśli podany
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Domyślny kompaktowy widok błędu
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 text-base">
              <AlertCircle className="h-5 w-5" />
              Błąd ładowania
              {this.props.featureName && `: ${this.props.featureName}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-red-600 mb-3">
              Wystąpił problem podczas ładowania tej sekcji. Spróbuj ponownie lub odśwież stronę.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-xs font-mono text-red-800 break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Spróbuj ponownie
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                className="text-red-600 hover:bg-red-100"
              >
                Odśwież stronę
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
