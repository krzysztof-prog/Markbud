'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
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
  onApprove: () => void;
  onClose: () => void;
}

export function ImportPreviewCard({
  preview,
  isLoading,
  isPending,
  onApprove,
  onClose,
}: ImportPreviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podglad importu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview || !preview.import) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podglad importu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nie mozna zaladowac podgladu</p>
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metadata = preview.import.metadata as ImportMetadata;
  const data = preview.data as unknown as ImportDataItem[];
  const requirementItems = data?.filter((d) => d.type === 'requirement') || [];
  const windowItems = data?.filter((d) => d.type === 'window') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podglad importu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Naglowek z numerem zlecenia */}
          <PreviewHeader metadata={metadata} requirementCount={requirementItems.length} windowCount={windowItems.length} />

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
              <Button
                onClick={onApprove}
                disabled={isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Zatwierdz import
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewHeader({ metadata, requirementCount, windowCount }: {
  metadata: ImportMetadata;
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

function PdfSummary({ metadata }: { metadata: ImportMetadata }) {
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

function CsvSummary({ metadata }: { metadata: ImportMetadata }) {
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
              <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
              <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
