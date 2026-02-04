'use client';

/**
 * LogisticsRightPanel - Prawa kolumna layoutu 3-strefowego
 *
 * Panel z tabami:
 * - "Szczegóły" - szczegóły pozycji i blokady
 * - "Parser" - formularz do wklejania maili
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Package,
  GitCompare,
  Trash2,
  UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { logisticsApi } from '../api/logisticsApi';
import { MailParserForm } from './MailParserForm';
import { ParsedMailPreview } from './ParsedMailPreview';
import { DeliveryVersionDiff } from './DeliveryVersionDiff';
import { useSaveMailList, useOrphanOrders, useRemoveOrderFromDelivery } from '../hooks';
import type { ParseResult, SaveMailListInput, ItemStatus } from '../types';
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_FLAG_LABELS,
  mailItemToFlags,
  formatDeliveryCode,
} from '../types';

// ========== Props ==========

export type RightPanelMode = 'details' | 'parser' | 'preview';

interface LogisticsRightPanelProps {
  /** Kod wybranej dostawy */
  deliveryCode: string | null;
  /** Callback po zapisaniu (aby odświeżyć kalendarz i wybrać nową dostawę) */
  onDeliverySaved?: (newDeliveryCode: string) => void;
  /** Callback odświeżenia kalendarza */
  onRefreshCalendar?: () => void;
}

// ========== Komponenty pomocnicze ==========

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

function DetailsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function EmptyDetails() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <FileText className="h-12 w-12 text-slate-300 mb-3" />
      <p className="text-muted-foreground">
        Wybierz dostawę aby zobaczyć szczegóły
      </p>
    </div>
  );
}

/**
 * Sekcja "Dlaczego 🔴?" pokazująca blokujące pozycje
 */
function BlockedItemsSection({ blockedItems }: { blockedItems: { projectNumber: string; reason: string }[] }) {
  if (blockedItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <h4 className="text-sm font-medium text-red-800 flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4" />
        Dlaczego 🔴 ZABLOKOWANA?
      </h4>
      <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
        {blockedItems.map((item, index) => (
          <li key={index}>
            <span className="font-mono font-medium">{item.projectNumber}</span>
            {' – '}
            {item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Sekcja zleceń przypisanych do dostawy, ale nieobecnych na liście mailowej
 */
function OrphanOrdersSection({ deliveryCode }: { deliveryCode: string }) {
  const { data, isLoading } = useOrphanOrders(deliveryCode);
  const { mutate: removeFromDelivery, isPending } = useRemoveOrderFromDelivery();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Skeleton className="h-4 w-40 mb-2" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!data || data.totalCount === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <h4 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
        <UserX className="h-4 w-4" />
        Zlecenia poza listą mailową ({data.totalCount})
      </h4>
      <p className="text-xs text-amber-700 mb-2">
        Te zlecenia mają ustawioną datę dostawy, ale nie ma ich na liście mailowej.
      </p>
      <div className="space-y-1.5">
        {data.orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-amber-200"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-medium truncate">
                {order.orderNumber}
              </div>
              {order.client && (
                <div className="text-xs text-muted-foreground truncate">
                  {order.client}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => removeFromDelivery(order.id)}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Usuń z dostawy
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== Panel szczegółów ==========

interface DetailsPanelProps {
  deliveryCode: string;
}

function DetailsPanel({ deliveryCode }: DetailsPanelProps) {
  const [diffDialog, setDiffDialog] = useState<{
    open: boolean;
    versionFrom: number;
    versionTo: number;
  }>({ open: false, versionFrom: 0, versionTo: 0 });

  const { data: mailList, isLoading, error } = useQuery({
    queryKey: ['logistics', 'delivery', deliveryCode],
    queryFn: () => logisticsApi.getLatestVersion(deliveryCode),
  });

  const { data: allVersions } = useQuery({
    queryKey: ['logistics', 'delivery', deliveryCode, 'versions'],
    queryFn: () => logisticsApi.getVersionsByCode(deliveryCode),
    enabled: !!mailList,
  });

  const handleShowDiff = useCallback(() => {
    if (mailList && mailList.version > 1) {
      setDiffDialog({
        open: true,
        versionFrom: mailList.version - 1,
        versionTo: mailList.version,
      });
    }
  }, [mailList]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (error || !mailList) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600">Błąd ładowania szczegółów</p>
      </div>
    );
  }

  const items = mailList.items ?? [];
  const deliveryDate = new Date(mailList.deliveryDate).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{formatDeliveryCode(deliveryCode)}</h3>
          <p className="text-xs text-muted-foreground capitalize">{deliveryDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            v{mailList.version}
          </Badge>
          {mailList.version > 1 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleShowDiff}>
              <GitCompare className="h-3 w-3 mr-1" />
              Zmiany
            </Button>
          )}
        </div>
      </div>

      {/* Sekcja blokad */}
      <BlockedItemsSection blockedItems={mailList.blockedItems} />

      {/* Sekcja zleceń poza listą mailową */}
      <OrphanOrdersSection deliveryCode={deliveryCode} />

      {/* Lista pozycji - kompaktowa */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Pozycje ({items.length})
        </h4>
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {items.map((item) => {
            const flags = mailItemToFlags(item);

            return (
              <div
                key={item.id}
                className={cn(
                  'p-2 rounded border text-xs',
                  item.itemStatus === 'blocked' && 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.itemStatus} />
                    <span className="font-mono font-medium">{item.projectNumber}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    x{item.quantity}
                  </Badge>
                </div>

                {/* Flagi */}
                {flags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {flags.map((flag) => (
                      <Badge key={flag} variant="outline" className="text-xs bg-gray-50">
                        {ITEM_FLAG_LABELS[flag]}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Zlecenie */}
                {item.order && (
                  <div className="mt-1.5 text-muted-foreground">
                    {item.order.orderNumber}
                    {item.order.client && ` • ${item.order.client}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Oryginalny mail - zwinięty */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Oryginalny tekst maila
        </summary>
        <pre className="mt-2 p-3 bg-muted rounded text-xs whitespace-pre-wrap font-mono overflow-x-auto max-h-[200px]">
          {mailList.rawMailText}
        </pre>
      </details>

      {/* Dialog z diffem */}
      <Dialog open={diffDialog.open} onOpenChange={(open) => setDiffDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zmiany w liście: {deliveryCode}</DialogTitle>
          </DialogHeader>
          {diffDialog.open && (
            <DeliveryVersionDiff
              deliveryCode={deliveryCode}
              versionFrom={diffDialog.versionFrom}
              versionTo={diffDialog.versionTo}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Panel parsera ==========

interface ParserPanelProps {
  onParsed: (result: ParseResult, rawText: string) => void;
}

function ParserPanel({ onParsed }: ParserPanelProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-600" />
          Nowy mail z awizacją
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Wklej treść maila aby sparsować listę pozycji
        </p>
      </div>
      <MailParserForm onParsed={onParsed} compact />
    </div>
  );
}

// ========== Główny komponent ==========

export function LogisticsRightPanel({
  deliveryCode,
  onDeliverySaved,
  onRefreshCalendar,
}: LogisticsRightPanelProps) {
  const [mode, setMode] = useState<RightPanelMode>('details');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [rawMailText, setRawMailText] = useState<string>('');

  // Hook do zapisywania
  const { mutate: saveMailList, isPending: isSaving } = useSaveMailList({
    onSuccess: (data) => {
      // Po sukcesie wracamy do szczegółów i wybieramy nowo utworzoną dostawę
      setMode('details');
      setParseResult(null);
      setRawMailText('');
      onRefreshCalendar?.();
      // Jeśli dostępny deliveryCode z odpowiedzi, ustaw go
      if (data?.deliveryCode) {
        onDeliverySaved?.(data.deliveryCode);
      }
    },
  });

  // Handlery
  const handleParsed = useCallback((result: ParseResult, mailText: string) => {
    setParseResult(result);
    setRawMailText(mailText);
    setMode('preview');
  }, []);

  const handleSaveAll = useCallback(
    async (allData: SaveMailListInput[]) => {
      if (allData.length === 0) return;

      // Zapisujemy sekwencyjnie
      for (const data of allData) {
        await new Promise<void>((resolve, reject) => {
          saveMailList(data, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
        });
      }
    },
    [saveMailList]
  );

  const handleCancelPreview = useCallback(() => {
    setMode('parser');
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-2 px-4 border-b flex-shrink-0">
        <Tabs value={mode === 'preview' ? 'parser' : mode} onValueChange={(v) => setMode(v as RightPanelMode)}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="details" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Szczegóły
            </TabsTrigger>
            <TabsTrigger value="parser" className="text-xs">
              <Mail className="h-3 w-3 mr-1" />
              Parser
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {mode === 'details' && (
          deliveryCode ? (
            <DetailsPanel deliveryCode={deliveryCode} />
          ) : (
            <EmptyDetails />
          )
        )}

        {mode === 'parser' && (
          <ParserPanel onParsed={handleParsed} />
        )}

        {mode === 'preview' && parseResult && (
          <ParsedMailPreview
            parseResult={parseResult}
            rawMailText={rawMailText}
            onSaveAll={handleSaveAll}
            onCancel={handleCancelPreview}
            isSaving={isSaving}
            compact
          />
        )}
      </CardContent>
    </Card>
  );
}

export default LogisticsRightPanel;
