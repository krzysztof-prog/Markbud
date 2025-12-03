'use client';

import { useState } from 'react';
import { monthlyReportsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface GenerateReportFormProps {
  onSuccess?: () => void;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

export function GenerateReportForm({ onSuccess }: GenerateReportFormProps) {
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!year || !month) {
      toast({
        title: 'Błąd',
        description: 'Proszę wybrać rok i miesiąc',
        variant: 'destructive',
      });
      return;
    }

    if (month < 1 || month > 12) {
      toast({
        title: 'Błąd',
        description: 'Miesiąc musi być między 1 a 12',
        variant: 'destructive',
      });
      return;
    }

    const selectedDate = new Date(year, month - 1, 1);
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (selectedDate > maxDate) {
      toast({
        title: 'Błąd',
        description: 'Nie można generować raportu dla przyszłego okresu',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await monthlyReportsApi.generate(year, month);

      toast({
        title: 'Sukces',
        description: `Raport dla ${MONTH_NAMES[month - 1]} ${year} został wygenerowany`,
        variant: 'success',
      });

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się wygenerować raportu';
      toast({
        title: 'Błąd generowania',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Generuj raport miesięczny
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Rok</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max={now.getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Miesiąc</Label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name} ({index + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Generowanie...' : 'Generuj raport'}
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900">
              <strong>Info:</strong> Raport będzie zawierać wszystkie zlecenia z fakturą z wybranego miesiąca,
              pogrupowane według numeru faktury.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
