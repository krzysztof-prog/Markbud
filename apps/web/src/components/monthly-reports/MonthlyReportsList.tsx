'use client';

import { useQuery } from '@tanstack/react-query';
import { monthlyReportsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

interface MonthlyReportsListProps {
  limit?: number;
}

export function MonthlyReportsList({ limit = 12 }: MonthlyReportsListProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['monthlyReports', limit],
    queryFn: () => monthlyReportsApi.getAll(limit),
  });

  if (error) {
    toast({
      title: 'Błąd wczytywania',
      description: 'Nie udało się załadować raportów',
      variant: 'destructive',
    });
  }

  const handleExport = async (year: number, month: number, format: 'excel' | 'pdf') => {
    try {
      setExporting(`${year}-${month}-${format}`);

      const blob = format === 'excel'
        ? await monthlyReportsApi.exportExcel(year, month)
        : await monthlyReportsApi.exportPdf(year, month);

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `raport-${year}-${String(month).padStart(2, '0')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Eksport pomyślny',
        description: `Raport został pobrany w formacie ${format.toUpperCase()}`,
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się wyeksportować raportu';
      toast({
        title: 'Błąd eksportu',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-slate-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 text-center">
            Brak wygenerowanych raportów. Generuj raport za pomocą formularza powyżej.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Historia raportów</h3>
      {reports.map((report) => (
        <Card key={`${report.year}-${report.month}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {MONTH_NAMES[report.month - 1]} {report.year}
              </CardTitle>
              <span className="text-xs text-slate-500">
                {formatDate(report.reportDate)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Zlecenia</p>
                <p className="text-lg font-semibold">{report.totalOrders}</p>
              </div>
              <div>
                <p className="text-slate-600">Okna</p>
                <p className="text-lg font-semibold">{report.totalWindows}</p>
              </div>
              <div>
                <p className="text-slate-600">Skrzydła</p>
                <p className="text-lg font-semibold">{report.totalSashes}</p>
              </div>
              <div>
                <p className="text-slate-600">Pozycje</p>
                <p className="text-lg font-semibold">{report._count?.reportItems || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-3 border-t border-slate-200">
              <div>
                <p className="text-slate-600">Wartość PLN</p>
                <p className="text-base font-semibold">
                  {formatCurrency(report.totalValuePln, 'PLN')}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Wartość EUR</p>
                <p className="text-base font-semibold">
                  {formatCurrency(report.totalValueEur, 'EUR')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport(report.year, report.month, 'excel')}
                disabled={exporting === `${report.year}-${report.month}-excel`}
                className="gap-2"
              >
                {exporting === `${report.year}-${report.month}-excel` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport(report.year, report.month, 'pdf')}
                disabled={exporting === `${report.year}-${report.month}-pdf`}
                className="gap-2"
              >
                {exporting === `${report.year}-${report.month}-pdf` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
