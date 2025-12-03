'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { currencyConfigApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';

export function CurrencyConfig() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: currentRate } = useQuery({
    queryKey: ['currencyConfig', 'current'],
    queryFn: () => currencyConfigApi.getCurrent(),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['currencyConfig', 'history'],
    queryFn: () => currencyConfigApi.getHistory(10),
    enabled: showHistory,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateValue = parseFloat(rate);
    if (!rate || isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: 'Błąd',
        description: 'Proszę wprowadzić prawidłową wartość kursu',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await currencyConfigApi.setRate(rateValue);

      toast({
        title: 'Sukces',
        description: `Kurs EUR/PLN zaktualizowany na ${rateValue.toFixed(4)}`,
        variant: 'success',
      });

      setRate('');
      queryClient.invalidateQueries({ queryKey: ['currencyConfig'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować kursu';
      toast({
        title: 'Błąd',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Konfiguracja kursu walut EUR/PLN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentRate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">Aktualny kurs EUR/PLN</p>
              <p className="text-3xl font-bold text-blue-900">{currentRate.eurToPlnRate.toFixed(4)}</p>
              <p className="text-xs text-slate-500 mt-2">
                Obowiązuje od {formatDate(currentRate.effectiveDate)}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Nowy kurs EUR/PLN</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                placeholder="np. 4.25"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Wpisz kurs wymany (np. 4.25 oznacza że 1 EUR = 4.25 PLN)
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Aktualizowanie...' : 'Zaktualizuj kurs'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full text-left hover:opacity-75 transition-opacity"
          >
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historia kursów
              </span>
              <span className="text-xs font-normal text-slate-500">
                {showHistory ? '▼' : '▶'}
              </span>
            </CardTitle>
          </button>
        </CardHeader>

        {showHistory && (
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-2">
                {history.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                      <p className="font-semibold">{entry.eurToPlnRate.toFixed(4)}</p>
                      <p className="text-xs text-slate-500">{formatDate(entry.effectiveDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Brak historii kursów</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
