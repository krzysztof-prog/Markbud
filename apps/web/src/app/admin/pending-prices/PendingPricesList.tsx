'use client';

/**
 * PendingPricesList
 * Lista oczekujących cen z możliwością filtrowania
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PendingPrice {
  id: number;
  orderNumber: string;
  reference: string | null;
  currency: string;
  valueNetto: number;
  valueBrutto: number | null;
  filename: string;
  filepath: string;
  status: 'pending' | 'applied' | 'expired';
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  appliedToOrderId: number | null;
}

interface PendingPricesResponse {
  success: boolean;
  data: PendingPrice[];
  count: number;
}

const statusConfig = {
  pending: {
    label: 'Oczekująca',
    icon: Clock,
    variant: 'warning' as const,
    color: 'bg-yellow-100 text-yellow-800',
  },
  applied: {
    label: 'Przypisana',
    icon: CheckCircle,
    variant: 'success' as const,
    color: 'bg-green-100 text-green-800',
  },
  expired: {
    label: 'Wygasła',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'bg-red-100 text-red-800',
  },
};

export function PendingPricesList() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const { data, isLoading, error, refetch, isRefetching } = useQuery<PendingPricesResponse>({
    queryKey: ['pending-prices', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return fetchApi<PendingPricesResponse>(`/cleanup/pending-prices/prices${params}`);
    },
    refetchInterval: 30000, // Odświeżaj co 30 sekund
  });

  // Formatowanie wartości w odpowiedniej walucie
  const formatCurrency = (value: number, currency: string) => {
    // Wartość przechowywana w groszach/centach
    const displayValue = value / 100;
    if (currency === 'EUR') {
      return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'EUR' }).format(displayValue);
    }
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(displayValue);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>
          Nie udało się pobrać listy oczekujących cen. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    );
  }

  const prices = data?.data || [];
  const pendingCount = prices.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Oczekujące ceny
          </CardTitle>
          <CardDescription>
            Ceny zaimportowane z PDF dla zleceń które jeszcze nie istnieją w bazie.
            Zostaną automatycznie przypisane gdy zlecenie zostanie zaimportowane.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusFilter === 'pending' && pendingCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {pendingCount} {pendingCount === 1 ? 'cena oczekuje' : 'cen oczekuje'} na przypisanie
              </AlertTitle>
              <AlertDescription>
                Te ceny zostaną automatycznie przypisane gdy odpowiednie zlecenia pojawią się w systemie.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtruj po statusie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="pending">Oczekujące</SelectItem>
              <SelectItem value="applied">Przypisane</SelectItem>
              <SelectItem value="expired">Wygasłe</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Znaleziono: {data?.count || 0} rekordów
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr zlecenia</TableHead>
                <TableHead>Referencja</TableHead>
                <TableHead>Wartość netto</TableHead>
                <TableHead>Plik PDF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utworzono</TableHead>
                <TableHead>Przypisano do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : prices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Brak rekordów do wyświetlenia
                  </TableCell>
                </TableRow>
              ) : (
                prices.map((price) => {
                  const config = statusConfig[price.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">{price.orderNumber}</TableCell>
                      <TableCell>{price.reference || '-'}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(price.valueNetto, price.currency)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={price.filename}>
                        {price.filename}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(price.createdAt), {
                          addSuffix: true,
                          locale: pl
                        })}
                      </TableCell>
                      <TableCell>
                        {price.appliedToOrderId ? (
                          <span className="text-green-600 font-medium">
                            Zlecenie #{price.appliedToOrderId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
