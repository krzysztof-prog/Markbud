'use client';

/**
 * Modal pokazujący rozbieżności w dostawie szyb dla zlecenia
 * Wyświetla listę problemów: brakujące szyby, nadwyżki, konflikty
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';

// ================================
// Typy
// ================================

interface GlassValidation {
  id: number;
  orderNumber: string;
  validationType: string;
  severity: 'info' | 'warning' | 'error';
  expectedQuantity: number | null;
  orderedQuantity: number | null;
  deliveredQuantity: number | null;
  message: string;
  details: string | null;
  resolved: boolean;
  createdAt: string;
}

interface GlassDiscrepancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string | null;
}

// ================================
// Pomocnicze funkcje
// ================================

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'error':
      return <Badge variant="destructive">Błąd</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ostrzeżenie</Badge>;
    case 'info':
      return <Badge variant="secondary">Info</Badge>;
    default:
      return <Badge variant="outline">Nieznany</Badge>;
  }
};

const getValidationTypeLabel = (type: string) => {
  switch (type) {
    case 'suffix_mismatch':
      return 'Konflikt suffiksu';
    case 'unmatched_delivery':
      return 'Brak dopasowania';
    case 'quantity_mismatch':
      return 'Różnica ilości';
    case 'missing_order':
      return 'Brak zamówienia';
    default:
      return type;
  }
};

// ================================
// Komponent
// ================================

export function GlassDiscrepancyModal({
  open,
  onOpenChange,
  orderNumber,
}: GlassDiscrepancyModalProps) {
  // Pobierz walidacje dla zlecenia
  const { data: validations, isLoading, error } = useQuery<GlassValidation[]>({
    queryKey: ['glass-validations', orderNumber],
    queryFn: () => fetchApi(`/api/glass-validations/order/${orderNumber}`),
    enabled: open && !!orderNumber,
  });

  if (!orderNumber) return null;

  // Grupuj walidacje po severity
  const groupedValidations = {
    errors: validations?.filter(v => v.severity === 'error') || [],
    warnings: validations?.filter(v => v.severity === 'warning') || [],
    info: validations?.filter(v => v.severity === 'info') || [],
  };

  const hasIssues = (validations?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Rozbieżności szyb - Zlecenie {orderNumber}
          </DialogTitle>
          <DialogDescription>
            Lista problemów wykrytych podczas dopasowywania dostaw szyb do zamówienia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Nie udało się pobrać danych o rozbieżnościach.
            </div>
          )}

          {!isLoading && !error && !hasIssues && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">
                Brak wykrytych rozbieżności dla tego zlecenia.
              </span>
            </div>
          )}

          {/* Błędy (najważniejsze) */}
          {groupedValidations.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Błędy ({groupedValidations.errors.length})
              </h3>
              <div className="space-y-2">
                {groupedValidations.errors.map((validation) => (
                  <ValidationCard key={validation.id} validation={validation} />
                ))}
              </div>
            </div>
          )}

          {/* Ostrzeżenia */}
          {groupedValidations.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-yellow-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ostrzeżenia ({groupedValidations.warnings.length})
              </h3>
              <div className="space-y-2">
                {groupedValidations.warnings.map((validation) => (
                  <ValidationCard key={validation.id} validation={validation} />
                ))}
              </div>
            </div>
          )}

          {/* Informacje */}
          {groupedValidations.info.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-blue-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Informacje ({groupedValidations.info.length})
              </h3>
              <div className="space-y-2">
                {groupedValidations.info.map((validation) => (
                  <ValidationCard key={validation.id} validation={validation} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================
// Komponent karty walidacji
// ================================

interface ValidationCardProps {
  validation: GlassValidation;
}

function ValidationCard({ validation }: ValidationCardProps) {
  // Parsuj details jeśli to JSON
  let details: Record<string, unknown> | null = null;
  if (validation.details) {
    try {
      details = JSON.parse(validation.details);
    } catch {
      // Nie jest JSON - zostaw null
    }
  }

  return (
    <div className={`border rounded-lg p-3 ${
      validation.severity === 'error'
        ? 'bg-red-50 border-red-200'
        : validation.severity === 'warning'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {getSeverityIcon(validation.severity)}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {getValidationTypeLabel(validation.validationType)}
              </span>
              {getSeverityBadge(validation.severity)}
              {validation.resolved && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Rozwiązane
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {validation.message}
            </p>

            {/* Szczegóły ilości */}
            {(validation.orderedQuantity !== null || validation.deliveredQuantity !== null) && (
              <div className="mt-2 text-xs text-slate-500 flex gap-4">
                {validation.orderedQuantity !== null && (
                  <span>Zamówiono: <strong>{validation.orderedQuantity}</strong></span>
                )}
                {validation.deliveredQuantity !== null && (
                  <span>Dostarczono: <strong>{validation.deliveredQuantity}</strong></span>
                )}
                {validation.expectedQuantity !== null && (
                  <span>Oczekiwano: <strong>{validation.expectedQuantity}</strong></span>
                )}
              </div>
            )}

            {/* Dodatkowe szczegóły z JSON */}
            {details && (
              <div className="mt-2 text-xs text-slate-500">
                {typeof details.widthMm === 'number' && typeof details.heightMm === 'number' && (
                  <span>Wymiary: {details.widthMm} x {details.heightMm} mm</span>
                )}
                {typeof details.glassComposition === 'string' && (
                  <span className="ml-3">Zespolenie: {details.glassComposition}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
