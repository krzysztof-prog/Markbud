'use client';

/**
 * DeliveryDetailContent - Widok szczegółów dostawy
 *
 * Wyświetla:
 * - Nagłówek z kodem dostawy i statusem
 * - Sekcja "Dlaczego 🔴?" dla zablokowanych pozycji
 * - Tabela wszystkich pozycji z flagami
 * - Wersjonowanie (v1, v2...) z możliwością porównania
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Ban, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { logisticsApi } from '@/features/logistics/api/logisticsApi';
import {
  type ItemStatus,
  type DeliveryStatus,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  ITEM_FLAG_LABELS,
  mailItemToFlags,
  formatDeliveryCode,
} from '@/features/logistics/types';

interface DeliveryDetailContentProps {
  paramsPromise: Promise<{ deliveryCode: string }>;
}

// ========== Komponenty pomocnicze ==========

/**
 * Ikona statusu pozycji
 */
function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'blocked':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'waiting':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'excluded':
      return <Ban className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
}

/**
 * Badge ze statusem pozycji
 */
function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ITEM_STATUS_COLORS[status]}`}
    >
      <StatusIcon status={status} />
      {ITEM_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Badge ze statusem dostawy
 */
function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const colorClass = DELIVERY_STATUS_COLORS[status];
  const icon = status === 'ready' ? '🟢' : status === 'blocked' ? '🔴' : '🟠';

  return (
    <Badge
      variant="outline"
      className={`text-white ${colorClass} border-0`}
    >
      {icon} {DELIVERY_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Sekcja "Dlaczego 🔴?" pokazująca blokujące pozycje
 */
function BlockedItemsSection({ blockedItems }: { blockedItems: { projectNumber: string; reason: string }[] }) {
  if (blockedItems.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Dlaczego 🔴 ZABLOKOWANA?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
          {blockedItems.map((item, index) => (
            <li key={index}>
              <span className="font-mono font-medium">{item.projectNumber}</span>
              {' – '}
              {item.reason}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ========== Główny komponent ==========

export function DeliveryDetailContent({ paramsPromise }: DeliveryDetailContentProps) {
  const router = useRouter();
  const params = use(paramsPromise);
  const deliveryCode = decodeURIComponent(params.deliveryCode);

  // Pobierz najnowszą wersję listy
  const { data: mailList, isLoading, error, refetch } = useQuery({
    queryKey: ['logistics', 'delivery', deliveryCode],
    queryFn: () => logisticsApi.getLatestVersion(deliveryCode),
  });

  // Pobierz wszystkie wersje (do wyświetlenia historii)
  const { data: allVersions } = useQuery({
    queryKey: ['logistics', 'delivery', deliveryCode, 'versions'],
    queryFn: () => logisticsApi.getVersionsByCode(deliveryCode),
    enabled: !!mailList,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !mailList) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Błąd ładowania
            </CardTitle>
            <CardDescription className="text-red-600">
              Nie udało się załadować danych dostawy: {deliveryCode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wróć
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Spróbuj ponownie
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formatowanie daty dostawy
  const deliveryDate = new Date(mailList.deliveryDate).toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Zliczanie statusów pozycji
  const statusCounts = (mailList.items ?? []).reduce(
    (acc, item) => {
      acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
      return acc;
    },
    {} as Record<ItemStatus, number>
  );

  return (
    <div className="space-y-6">
      {/* Nagłówek z powrotem */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push('/logistyka')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Wróć
              </Button>
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">{formatDeliveryCode(deliveryCode)}</CardTitle>
                <CardDescription>{deliveryDate}</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status dostawy */}
              <DeliveryStatusBadge status={mailList.deliveryStatus} />

              {/* Wersja */}
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                v{mailList.version}
              </Badge>

              {/* Badge aktualizacja */}
              {mailList.isUpdate && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Aktualizacja
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 flex-wrap">
            {/* Podsumowanie statusów */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pozycje:</span>
              {statusCounts.ok && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {statusCounts.ok} OK
                </Badge>
              )}
              {statusCounts.blocked && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {statusCounts.blocked} zablokowanych
                </Badge>
              )}
              {statusCounts.waiting && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {statusCounts.waiting} oczekujących
                </Badge>
              )}
              {statusCounts.excluded && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  {statusCounts.excluded} wyłączonych
                </Badge>
              )}
            </div>

            {/* Historia wersji */}
            {allVersions && allVersions.length > 1 && (
              <div className="text-sm text-muted-foreground">
                Historia: {allVersions.length} wersji
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sekcja "Dlaczego 🔴?" */}
      <BlockedItemsSection blockedItems={mailList.blockedItems} />

      {/* Tabela pozycji */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pozycje ({mailList.items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Lp</TableHead>
                  <TableHead>Nr Projektu</TableHead>
                  <TableHead className="w-16 text-center">Ilość</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead>Flagi / Adnotacje</TableHead>
                  <TableHead>Zlecenie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(mailList.items ?? []).map((item) => {
                  const flags = mailItemToFlags(item);

                  return (
                    <TableRow
                      key={item.id}
                      className={item.itemStatus === 'blocked' ? 'bg-red-50' : ''}
                    >
                      <TableCell className="font-medium">{item.position}</TableCell>
                      <TableCell className="font-mono text-sm">{item.projectNumber}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <ItemStatusBadge status={item.itemStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {/* Flagi jako badge */}
                          {flags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {flags.map((flag) => (
                                <Badge
                                  key={flag}
                                  variant="outline"
                                  className="text-xs bg-gray-50"
                                >
                                  {ITEM_FLAG_LABELS[flag]}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {/* Kolor niestandardowy */}
                          {item.customColor && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              Kolor: {item.customColor}
                            </Badge>
                          )}
                          {/* Oryginalne notatki */}
                          {item.rawNotes && flags.length === 0 && (
                            <span className="text-sm text-muted-foreground">{item.rawNotes}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.order ? (
                          <div className="space-y-0.5">
                            <div className="font-medium">{item.order.orderNumber}</div>
                            {item.order.client && (
                              <div className="text-xs text-muted-foreground">
                                {item.order.client}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-yellow-600 text-sm flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Nie przypisano
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Oryginalny tekst maila (zwinięty) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Oryginalny tekst maila
          </CardTitle>
        </CardHeader>
        <CardContent>
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              Kliknij aby rozwinąć...
            </summary>
            <pre className="mt-4 p-4 bg-muted rounded-md text-xs whitespace-pre-wrap font-mono overflow-x-auto">
              {mailList.rawMailText}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeliveryDetailContent;
