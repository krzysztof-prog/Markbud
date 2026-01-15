'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileDown } from 'lucide-react';
import { productionReportsApi } from '../api/productionReportsApi';
import type { ProductionReportSummary, CategorySummary } from '../types';

interface SummarySectionProps {
  summary: ProductionReportSummary | null | undefined;
  workingDays: number;
  totalValueEur?: number; // suma wartości EUR z zleceń (w centach)
  year: number;
  month: number;
}

// Domyślne wartości dla pustej kategorii
const emptyCategorySummary: CategorySummary = {
  windows: 0,
  units: 0,
  sashes: 0,
  valuePln: 0,
  averagePerUnit: null,
};

// Domyślny kurs EUR/PLN
const DEFAULT_EUR_RATE = 4.30;

// Formatowanie wartości PLN (grosze → PLN)
const formatPln = (grosze: number | undefined | null): string => {
  const value = grosze ?? 0;
  const pln = value / 100;
  return pln.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Formatowanie liczb (bez waluty)
const formatNumber = (value: number | undefined | null): string => {
  return (value ?? 0).toLocaleString('pl-PL');
};

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  workingDays,
  totalValueEur = 0,
  year,
  month,
}) => {
  // Stan kursu wymiany
  const [eurRate, setEurRate] = useState<number>(DEFAULT_EUR_RATE);

  // Bezpieczne wyciągnięcie danych z summary
  const safeTypowe = summary?.typowe ?? emptyCategorySummary;
  const safeAkrobud = summary?.akrobud ?? emptyCategorySummary;
  const safeReszta = summary?.reszta ?? emptyCategorySummary;
  const safeNietypowki = summary?.nietypowki ?? emptyCategorySummary;
  const safeRazem = summary?.razem ?? emptyCategorySummary;

  // Przelicz EUR na PLN (totalValueEur jest w centach)
  const eurInPln = (totalValueEur / 100) * eurRate;
  const eurInPlnGrosze = Math.round(eurInPln * 100);

  // Suma końcowa (RAZEM PLN + EUR przeliczone na PLN)
  const totalWithEur = safeRazem.valuePln + eurInPlnGrosze;

  const rows = [
    { label: 'TYPOWE', data: safeTypowe, className: '' },
    { label: 'AKROBUD', data: safeAkrobud, className: 'bg-blue-50' },
    { label: 'RESZTA', data: safeReszta, className: '' },
    { label: 'NIETYPÓWKI', data: safeNietypowki, className: 'bg-amber-50' },
    { label: 'RAZEM PLN', data: safeRazem, className: 'font-semibold bg-gray-50' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Podsumowanie</CardTitle>

          {/* Input kursu wymiany i przycisk PDF */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="eurRate" className="text-sm text-muted-foreground whitespace-nowrap">
                Kurs EUR/PLN:
              </Label>
              <Input
                id="eurRate"
                type="number"
                step="0.01"
                min="0"
                value={eurRate}
                onChange={(e) => setEurRate(parseFloat(e.target.value) || DEFAULT_EUR_RATE)}
                className="w-24 h-8 text-sm"
              />
            </div>

            {/* Przycisk eksportu PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await productionReportsApi.exportPdf(year, month, eurRate);
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Błąd eksportu PDF');
                }
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Eksportuj PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabela podsumowania */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Kategoria</TableHead>
              <TableHead className="text-right">Okna</TableHead>
              <TableHead className="text-right">Jednostki</TableHead>
              <TableHead className="text-right">Skrzydła</TableHead>
              <TableHead className="text-right">Wartość PLN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className={row.className}>
                <TableCell className={row.label.includes('RAZEM') ? 'font-semibold' : ''}>
                  {row.label}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(row.data.windows)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(row.data.units)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(row.data.sashes)}
                </TableCell>
                <TableCell className="text-right">
                  {formatPln(row.data.valuePln)} PLN
                </TableCell>
              </TableRow>
            ))}

            {/* Wiersz z przeliczeniem EUR jeśli są zlecenia w EUR */}
            {totalValueEur > 0 && (
              <>
                <TableRow className="bg-green-50">
                  <TableCell className="font-semibold">ZLECENIA EUR</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">
                    {(totalValueEur / 100).toLocaleString('pl-PL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} EUR
                    <span className="text-muted-foreground text-xs ml-1">
                      ({formatPln(eurInPlnGrosze)} PLN)
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold bg-gray-100">
                  <TableCell className="font-bold">RAZEM (PLN + EUR)</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">
                    {formatPln(totalWithEur)} PLN
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>

        {/* Statystyki dodatkowe */}
        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-muted-foreground">
              Średnia wartość na jednostkę:
            </span>
            <span className="font-semibold">
              {(summary?.avgPerUnit ?? 0).toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} PLN
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-muted-foreground">
              Średnia wartość na dzień roboczy ({workingDays} dni):
            </span>
            <span className="font-semibold">
              {(summary?.avgPerDay ?? 0).toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} PLN
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummarySection;
