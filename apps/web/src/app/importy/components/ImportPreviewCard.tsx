'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, X, AlertCircle, Download } from 'lucide-react';
import { OrderVariantConflictModal } from '@/features/orders/components/OrderVariantConflictModal';
import type { ImportPreview } from '@/types';

// Typy pomocnicze dla danych importu
interface ImportMetadata {
  orderNumber?: string;
  reference?: string;
  valueNetto?: number;
  valueBrutto?: number;
  currency?: string;
  dimensions?: { width?: number; height?: number };
  totals?: { windows?: number; sashes?: number; glasses?: number };
}

interface ImportDataItem {
  type?: 'requirement' | 'window' | string;
  articleNumber?: string;
  profileNumber?: string;
  colorCode?: string;
  calculatedBeams?: number;
  calculatedMeters?: number;
  lp?: number;
  szer?: number;
  wys?: number;
  typProfilu?: string;
  ilosc?: number;
  referencja?: string;
}

interface ImportPreviewCardProps {
  preview: ImportPreview | null;
  isLoading: boolean;
  isPending: boolean;
  isRejectPending?: boolean;
  onApprove: (resolution?: { type: 'keep_existing' | 'use_latest'; deleteOlder?: boolean }) => void;
  onReject?: (id: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportPreviewCard({
  preview,
  isLoading,
  isPending,
  isRejectPending,
  onApprove,
  onReject,
  open,
  onOpenChange,
}: ImportPreviewCardProps) {
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  const hasConflict = preview?.variantConflict?.type && preview.variantConflict.existingOrders.length > 0;
  const hasErrors = preview?.errors && preview.errors.length > 0;

  const handleApprove = () => {
    if (hasConflict) {
      setConflictModalOpen(true);
    } else {
      onApprove();
    }
  };

  const handleResolveConflict = (
    resolutionType: 'keep_existing' | 'use_latest',
    deleteOlder?: boolean
  ) => {
    const resolution = { type: resolutionType, deleteOlder };
    onApprove(resolution);
    setConflictModalOpen(false);
  };

  const handleDownloadErrors = () => {
    if (!preview?.errors || preview.errors.length === 0) return;

    // Generuj CSV z błędami
    const headers = ['Wiersz', 'Pole', 'Powód błędu', 'Surowe dane'];
    const rows = preview.errors.map((error) => [
      error.row.toString(),
      error.field || '-',
      error.reason,
      JSON.stringify(error.rawData),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Pobierz jako plik
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bledy_importu_${metadata?.orderNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Metadata can be in preview.metadata (new format) or preview.import.metadata (legacy)
  const metadata = (preview?.metadata || preview?.import?.metadata) as ImportMetadata | undefined;
  const data = (preview?.data as ImportDataItem[]) || [];
  const requirementItems = data.filter((d) => d.type === 'requirement');
  const windowItems = data.filter((d) => d.type === 'window');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-12">
              Podglad importu - Zlecenie {metadata?.orderNumber || '...'}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !preview || !preview.import ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nie mozna zaladowac podgladu</p>
              <div className="flex gap-2 justify-center pt-4 mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Zamknij
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            {/* Naglowek z numerem zlecenia */}
            <PreviewHeader metadata={metadata} requirementCount={requirementItems.length} windowCount={windowItems.length} />

            {/* Konflikt wariantow - warning */}
            {hasConflict && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900 mb-1">Wykryto konflikt wariantow</h4>
                    <p className="text-sm text-orange-800 mb-3">
                      W systemie istnieja juz zlecenia z tym numerem bazowym.
                      Kliknij "Rozwiaz konflikt" aby zdecydowac jak obsluzyc import.
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Typ: {preview.variantConflict?.type}
                      </Badge>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Istniejace: {preview.variantConflict?.existingOrders.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TASK 7: Bledy walidacji CSV */}
            {hasErrors && preview.errors && (
              <ErrorsSection
                errors={preview.errors}
                summary={preview.summary}
                onDownload={handleDownloadErrors}
              />
            )}

            {/* Podsumowanie z PDF - wartosc i waluta */}
            {(metadata?.valueNetto || metadata?.currency) && (
              <PdfSummary metadata={metadata} />
            )}

            {/* Podsumowanie z CSV */}
            {(metadata?.totals?.windows || metadata?.totals?.sashes || metadata?.totals?.glasses) && (
              <CsvSummary metadata={metadata} />
            )}

            {/* Lista wymaganych materialow */}
            {requirementItems.length > 0 && (
              <RequirementsTable items={requirementItems} />
            )}

            {/* Lista okien */}
            {windowItems.length > 0 && (
              <WindowsTable items={windowItems} />
            )}

            {preview.message && (
              <p className="text-sm text-slate-500">{preview.message}</p>
            )}

            <div className="flex gap-2 pt-4 border-t">
              {preview.import.status === 'pending' && (
                <>
                  {hasConflict ? (
                    <Button
                      onClick={() => setConflictModalOpen(true)}
                      variant="outline"
                      className="border-orange-400 text-orange-700 hover:bg-orange-50"
                      disabled={isPending}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Rozwiaz konflikt
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApprove}
                      disabled={isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Zatwierdz import
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      variant="destructive"
                      onClick={() => onReject(preview.import.id)}
                      disabled={isRejectPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Odrzuc
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Zamknij
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal konfliktu wariantow */}
      <OrderVariantConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflict={preview?.variantConflict || null}
        onResolve={handleResolveConflict}
        isResolving={isPending}
      />
    </>
  );
}

function PreviewHeader({ metadata, requirementCount, windowCount }: {
  metadata: ImportMetadata | undefined;
  requirementCount: number;
  windowCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">Numer zlecenia</p>
        <p className="text-lg font-mono">{metadata?.orderNumber}</p>
      </div>
      {metadata?.reference && (
        <div>
          <p className="text-sm font-medium text-slate-500">Referencja</p>
          <p className="text-lg font-mono">{metadata?.reference}</p>
        </div>
      )}
      {requirementCount > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-500">Pozycje materialow</p>
          <p className="text-lg">{requirementCount}</p>
        </div>
      )}
      {windowCount > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-500">Pozycje okien</p>
          <p className="text-lg">{windowCount}</p>
        </div>
      )}
    </div>
  );
}

function PdfSummary({ metadata }: { metadata: ImportMetadata | undefined }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="text-center">
        <p className="text-2xl font-bold text-green-700">
          {metadata?.valueNetto?.toFixed(2) || '0.00'}
        </p>
        <p className="text-sm text-green-600">Suma netto</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-700">
          {metadata?.valueBrutto?.toFixed(2) || '0.00'}
        </p>
        <p className="text-sm text-green-600">Suma brutto</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-700">
          {metadata?.currency === 'EUR' ? 'EUR' : 'PLN'}
        </p>
        <p className="text-sm text-green-600">Waluta</p>
      </div>
      {metadata?.dimensions && (
        <div className="text-center">
          <p className="text-lg font-bold text-green-700">
            {metadata.dimensions?.width} x {metadata.dimensions?.height}
          </p>
          <p className="text-sm text-green-600">Wymiary (mm)</p>
        </div>
      )}
    </div>
  );
}

function CsvSummary({ metadata }: { metadata: ImportMetadata | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-700">{metadata?.totals?.windows || 0}</p>
        <p className="text-sm text-blue-600">Okna/Drzwi</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-700">{metadata?.totals?.sashes || 0}</p>
        <p className="text-sm text-blue-600">Skrzydla</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-700">{metadata?.totals?.glasses || 0}</p>
        <p className="text-sm text-blue-600">Szyby</p>
      </div>
    </div>
  );
}

function RequirementsTable({ items }: { items: ImportDataItem[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500 mb-2">Zapotrzebowanie na materialy:</p>
      <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left">Nr artykulu</th>
              <th className="px-3 py-2 text-left">Profil</th>
              <th className="px-3 py-2 text-left">Kolor</th>
              <th className="px-3 py-2 text-center">Bele</th>
              <th className="px-3 py-2 text-center">Metry</th>
            </tr>
          </thead>
          <tbody>
            {items.map((req, i) => (
              <tr key={i} className={`border-t hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                <td className="px-3 py-2 font-mono">{req.articleNumber}</td>
                <td className="px-3 py-2">{req.profileNumber}</td>
                <td className="px-3 py-2">{req.colorCode}</td>
                <td className="px-3 py-2 text-center">{req.calculatedBeams}</td>
                <td className="px-3 py-2 text-center">{req.calculatedMeters}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WindowsTable({ items }: { items: ImportDataItem[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500 mb-2">Lista okien i drzwi:</p>
      <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-center">Lp.</th>
              <th className="px-3 py-2 text-center">Szerokosc</th>
              <th className="px-3 py-2 text-center">Wysokosc</th>
              <th className="px-3 py-2 text-left">Typ profilu</th>
              <th className="px-3 py-2 text-center">Ilosc</th>
              <th className="px-3 py-2 text-left">Referencja</th>
            </tr>
          </thead>
          <tbody>
            {items.map((win, i) => (
              <tr key={i} className={`border-t hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                <td className="px-3 py-2 text-center">{win.lp}</td>
                <td className="px-3 py-2 text-center">{win.szer} mm</td>
                <td className="px-3 py-2 text-center">{win.wys} mm</td>
                <td className="px-3 py-2">{win.typProfilu}</td>
                <td className="px-3 py-2 text-center">{win.ilosc}</td>
                <td className="px-3 py-2 font-mono">{win.referencja}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * TASK 7: Sekcja wyswietlania bledow walidacji CSV
 */
function ErrorsSection({
  errors,
  summary,
  onDownload,
}: {
  errors: Array<{ row: number; field?: string; reason: string; rawData: unknown }>;
  summary: { totalRecords: number; validRecords: number; invalidRecords: number };
  onDownload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayErrors = expanded ? errors : errors.slice(0, 5);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-red-900">Wykryto błędy walidacji</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Pobierz CSV
            </Button>
          </div>
          <p className="text-sm text-red-800 mb-3">
            Import zawiera {summary.invalidRecords} błędnych {summary.invalidRecords === 1 ? 'wiersz' : 'wierszy'}
            {' '}z {summary.totalRecords} całkowitych. Sprawdź szczegóły poniżej.
          </p>

          {/* Statystyki */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded p-2 text-center border border-red-200">
              <p className="text-xl font-bold text-red-700">{summary.totalRecords}</p>
              <p className="text-xs text-red-600">Wszystkie wiersze</p>
            </div>
            <div className="bg-white rounded p-2 text-center border border-green-200">
              <p className="text-xl font-bold text-green-700">{summary.validRecords}</p>
              <p className="text-xs text-green-600">Poprawne</p>
            </div>
            <div className="bg-white rounded p-2 text-center border border-red-300">
              <p className="text-xl font-bold text-red-700">{summary.invalidRecords}</p>
              <p className="text-xs text-red-600">Błędne</p>
            </div>
          </div>

          {/* Lista błędów */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {displayErrors.map((error, idx) => (
              <div key={idx} className="bg-white rounded p-3 border border-red-200 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-red-700 border-red-300 flex-shrink-0">
                    Wiersz {error.row}
                  </Badge>
                  {error.field && (
                    <Badge variant="outline" className="text-orange-700 border-orange-300 flex-shrink-0">
                      {error.field}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-red-900">{error.reason}</p>
                {error.rawData !== undefined && error.rawData !== null && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      Pokaż surowe dane
                    </summary>
                    <pre className="mt-1 p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(error.rawData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Przycisk rozwiń/zwiń */}
          {errors.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
            >
              {expanded ? 'Zwiń' : `Pokaż wszystkie (${errors.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
