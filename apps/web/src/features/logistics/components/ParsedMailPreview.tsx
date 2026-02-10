'use client';

/**
 * ParsedMailPreview - Podgląd i edycja sparsowanego emaila
 *
 * Wyświetla:
 * - Datę dostawy z wskaźnikiem pewności
 * - Badge "Aktualizacja" jeśli isUpdate
 * - Ostrzeżenia z parsowania
 * - Karty z poszczególnymi dostawami (Klient nr X)
 * - Tabele pozycji z matchowanymi zleceniami
 * - Możliwość edycji flag i przypisania zleceń
 * - Zapisywanie WSZYSTKICH dostaw (nie tylko pierwszej)
 */

import { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle, Ban, RefreshCw, Pencil, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ParseResult,
  type ParseResultDelivery,
  type ParseResultItem,
  type ItemStatus,
  type SaveMailListInput,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_FLAG_LABELS,
  type ItemFlag,
} from '../types';
import { ParsedItemEditor } from './ParsedItemEditor';
import { useSetOrderDeliveryDate } from '../hooks';

// ========== Typy Props ==========

interface ParsedMailPreviewProps {
  parseResult: ParseResult;
  rawMailText: string;
  onSaveAll: (data: SaveMailListInput[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Tryb kompaktowy dla panelu bocznego */
  compact?: boolean;
}

interface DeliveryStatusBadgeProps {
  status: ItemStatus;
}

interface DeliveryCardProps {
  delivery: ParseResultDelivery;
  deliveryDate: string;
  onEditItem: (deliveryIndex: number, itemPosition: number) => void;
  onDeleteItem: (deliveryIndex: number, itemPosition: number) => void;
  onSetDeliveryDate: (orderId: number, deliveryCode: string) => void;
  isSettingDeliveryDate: boolean;
}

// ========== Komponenty pomocnicze ==========

/**
 * Ikona statusu pozycji
 * Zwraca odpowiednią ikonę dla danego statusu
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
 * Badge ze statusem pozycji/dostawy
 * Używa kolorów zdefiniowanych w types
 */
export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
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
 * Wskaźnik pewności rozpoznania daty
 * Zielony = wysoka pewność, żółty = niska pewność
 */
function ConfidenceIndicator({ confidence }: { confidence: 'high' | 'low' }) {
  if (confidence === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">Wysoka pewność</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-600">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs">Niska pewność - sprawdź datę</span>
    </span>
  );
}

/**
 * Formatuje flagi pozycji do czytelnej formy
 */
function _formatFlags(flags: ItemFlag[]): string {
  if (flags.length === 0) return '';
  return flags.map((flag) => ITEM_FLAG_LABELS[flag]).join(', ');
}

/**
 * Wylicza status pozycji na podstawie flag (kopia z backendu)
 */
function calculateItemStatus(flags: ItemFlag[]): ItemStatus {
  // 1. Sprawdź czy wyłączone z produkcji
  if (flags.includes('EXCLUDE_FROM_PRODUCTION')) {
    return 'excluded';
  }

  // 2. Sprawdź flagi blokujące
  const blockingFlags: ItemFlag[] = [
    'MISSING_FILE',
    'UNCONFIRMED',
    'DIMENSIONS_UNCONFIRMED',
    'DRAWING_UNCONFIRMED',
  ];

  for (const flag of blockingFlags) {
    if (flags.includes(flag)) {
      return 'blocked';
    }
  }

  // 3. Sprawdź czy czeka na siatkę
  if (flags.includes('REQUIRES_MESH')) {
    return 'waiting';
  }

  // 4. Brak flag - OK
  return 'ok';
}

/**
 * Karta z pojedynczą dostawą (Klient nr X)
 */
function DeliveryCard({ delivery, deliveryDate, onEditItem, onDeleteItem, onSetDeliveryDate, isSettingDeliveryDate }: DeliveryCardProps) {
  // Formatuj datę do krótkiej formy DD.MM
  const shortDate = (() => {
    try {
      const date = new Date(deliveryDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}.${month}`;
    } catch {
      return 'DD.MM';
    }
  })();
  // Zliczamy pozycje z różnymi statusami
  const statusCounts = delivery.items.reduce(
    (acc, item) => {
      acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
      return acc;
    },
    {} as Record<ItemStatus, number>
  );

  // Zliczamy nieznalezione zlecenia
  const notFoundCount = delivery.items.filter((item) => item.orderNotFound).length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {delivery.clientLabel || `Klient nr ${delivery.deliveryIndex}`}
            </CardTitle>
            <CardDescription>Kod dostawy: {delivery.deliveryCode}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Podsumowanie statusów */}
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
        </div>
        {/* Ostrzeżenie o nieznalezionych zleceniach */}
        {notFoundCount > 0 && (
          <div className="mt-2 flex items-center gap-2 text-yellow-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {notFoundCount} {notFoundCount === 1 ? 'pozycja nie znaleziona' : 'pozycji nie znalezionych'} w bazie
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Lp</TableHead>
              <TableHead>Nr Projektu</TableHead>
              <TableHead className="w-16 text-center">Ilość</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead>Adnotacje</TableHead>
              <TableHead>Zlecenie</TableHead>
              <TableHead className="w-20 text-center">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delivery.items.map((item) => (
              <TableRow
                key={`${delivery.deliveryCode}-${item.position}`}
                className={item.orderNotFound ? 'bg-yellow-50' : ''}
              >
                <TableCell className="font-medium">{item.position}</TableCell>
                <TableCell className="font-mono text-sm">{item.projectNumber}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-center">
                  <DeliveryStatusBadge status={item.itemStatus} />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {/* Oryginalne notatki z maila */}
                    {item.rawNotes && (
                      <span className="text-sm text-muted-foreground">{item.rawNotes}</span>
                    )}
                    {/* Rozpoznane flagi */}
                    {item.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.flags.map((flag) => (
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
                  </div>
                </TableCell>
                <TableCell>
                  {item.matchedOrder ? (
                    <div className="space-y-0.5">
                      <div className="font-medium">{item.matchedOrder.orderNumber}</div>
                      {item.matchedOrder.client && (
                        <div className="text-xs text-muted-foreground">
                          {item.matchedOrder.client}
                        </div>
                      )}
                      {/* Komunikat gdy zlecenie ma wiele projektów */}
                      {item.matchedOrder.hasMultipleProjects && item.matchedOrder.otherProjects && item.matchedOrder.otherProjects.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1">
                          + inne projekty: {item.matchedOrder.otherProjects.join(', ')}
                        </div>
                      )}
                      {/* Wyświetl datę dostawy jeśli jest ustawiona */}
                      {item.matchedOrder.deliveryDate ? (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Data: {new Date(item.matchedOrder.deliveryDate).toLocaleDateString('pl-PL')}
                        </div>
                      ) : (
                        /* Przycisk "Ustaw datę" gdy zlecenie istnieje ale nie ma daty dostawy */
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs mt-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                          disabled={isSettingDeliveryDate}
                          onClick={() => onSetDeliveryDate(item.matchedOrder!.id, delivery.deliveryCode)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          {isSettingDeliveryDate ? 'Ustawianie...' : `Ustaw datę ${shortDate}`}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-yellow-600 text-sm flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Nie znaleziono
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditItem(delivery.deliveryIndex, item.position)}
                      title="Edytuj pozycję"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteItem(delivery.deliveryIndex, item.position)}
                      title="Usuń pozycję"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ========== Główny komponent ==========

/**
 * Podgląd sparsowanego emaila z listą projektów
 *
 * Wyświetla:
 * - Datę dostawy z wskaźnikiem pewności
 * - Badge "Aktualizacja" jeśli isUpdate
 * - Ostrzeżenia z parsowania
 * - Karty z poszczególnymi dostawami (Klient nr X)
 * - Tabele pozycji z matchowanymi zleceniami
 * - Przyciski Zapisz/Anuluj
 */
export function ParsedMailPreview({
  parseResult,
  rawMailText,
  onSaveAll,
  onCancel,
  isSaving,
  compact = false,
}: ParsedMailPreviewProps) {
  const { deliveryDate, isUpdate, warnings } = parseResult;

  // Stan lokalny: edytowane dostawy
  const [editedDeliveries, setEditedDeliveries] = useState<ParseResultDelivery[]>(
    parseResult.deliveries
  );

  // Stan edycji pozycji
  const [editingItem, setEditingItem] = useState<{
    deliveryIndex: number;
    itemPosition: number;
    item: ParseResultItem;
  } | null>(null);

  // Mutacja do ustawiania daty dostawy zlecenia
  const setDeliveryDateMutation = useSetOrderDeliveryDate({
    onSuccess: (data) => {
      // Po ustawieniu daty, zaktualizuj lokalny stan - dodaj deliveryDate do matchedOrder
      setEditedDeliveries((prev) =>
        prev.map((delivery) => ({
          ...delivery,
          items: delivery.items.map((item) => {
            if (item.matchedOrder?.id === data.orderId) {
              return {
                ...item,
                matchedOrder: {
                  ...item.matchedOrder,
                  deliveryDate: data.deliveryDate,
                },
              };
            }
            return item;
          }),
        }))
      );
    },
  });

  // Obsługa otwarcia edycji pozycji
  const handleEditItem = useCallback((deliveryIndex: number, itemPosition: number) => {
    const delivery = editedDeliveries.find((d) => d.deliveryIndex === deliveryIndex);
    const item = delivery?.items.find((i) => i.position === itemPosition);
    if (item) {
      setEditingItem({ deliveryIndex, itemPosition, item });
    }
  }, [editedDeliveries]);

  // Obsługa usunięcia pozycji
  const handleDeleteItem = useCallback((deliveryIndex: number, itemPosition: number) => {
    setEditedDeliveries((prev) =>
      prev.map((delivery) => {
        if (delivery.deliveryIndex !== deliveryIndex) return delivery;
        return {
          ...delivery,
          items: delivery.items
            .filter((item) => item.position !== itemPosition)
            // Przenumeruj pozycje
            .map((item, idx) => ({ ...item, position: idx + 1 })),
        };
      })
    );
  }, []);

  // Obsługa zapisania edycji pozycji
  const handleSaveItem = useCallback((updatedItem: ParseResultItem) => {
    if (!editingItem) return;

    setEditedDeliveries((prev) =>
      prev.map((delivery) => {
        if (delivery.deliveryIndex !== editingItem.deliveryIndex) return delivery;
        return {
          ...delivery,
          items: delivery.items.map((item) => {
            if (item.position !== editingItem.itemPosition) return item;
            // Przelicz status na podstawie nowych flag
            return {
              ...updatedItem,
              itemStatus: calculateItemStatus(updatedItem.flags),
            };
          }),
        };
      })
    );
    setEditingItem(null);
  }, [editingItem]);

  // Obsługa usunięcia pozycji z edytora
  const handleDeleteFromEditor = useCallback(() => {
    if (!editingItem) return;
    handleDeleteItem(editingItem.deliveryIndex, editingItem.itemPosition);
    setEditingItem(null);
  }, [editingItem, handleDeleteItem]);

  // Zamknij edytor
  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  /**
   * Przygotowuje dane do zapisania
   * Zapisuje WSZYSTKIE dostawy (nie tylko pierwszą!)
   */
  const handleSave = () => {
    if (editedDeliveries.length === 0) return;

    // Tworzymy SaveMailListInput dla KAŻDEJ dostawy
    const allSaveData: SaveMailListInput[] = editedDeliveries.map((delivery) => ({
      deliveryDate: deliveryDate.suggested,
      deliveryIndex: delivery.deliveryIndex,
      deliveryCode: delivery.deliveryCode,
      isUpdate,
      rawMailText,
      items: delivery.items.map((item) => ({
        position: item.position,
        projectNumber: item.projectNumber,
        quantity: item.quantity,
        rawNotes: item.rawNotes || undefined,
        flags: item.flags,
        customColor: item.customColor,
        orderId: item.matchedOrder?.id,
      })),
    }));

    onSaveAll(allSaveData);
  };

  // Formatowanie daty do czytelnej formy
  const formattedDate = new Date(deliveryDate.suggested).toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Łączna liczba pozycji
  const totalItems = editedDeliveries.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Nagłówek z datą i statusami */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle>Podgląd listy projektów</CardTitle>
                {isUpdate && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700">
                    <RefreshCw className="h-3 w-3" />
                    Aktualizacja
                  </Badge>
                )}
              </div>
              <CardDescription>
                Kliknij ikonę ołówka aby edytować pozycję. Pozycje oznaczone na żółto nie zostały znalezione w bazie.
              </CardDescription>
            </div>
            {/* Przyciski akcji - na górze strony */}
            <div className="flex items-center gap-3">
              {editedDeliveries.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  Zapisane zostaną <strong>wszystkie {editedDeliveries.length} dostawy</strong>
                </span>
              )}
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Anuluj
              </Button>
              <Button onClick={handleSave} disabled={isSaving || totalItems === 0}>
                {isSaving ? 'Zapisywanie...' : `Zapisz ${editedDeliveries.length > 1 ? 'wszystkie listy' : 'listę'}`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Data dostawy */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Data dostawy</div>
              <div className="text-lg font-medium">{formattedDate}</div>
              <ConfidenceIndicator confidence={deliveryDate.confidence} />
            </div>
            {/* Liczba dostaw */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Liczba dostaw</div>
              <div className="text-lg font-medium">{editedDeliveries.length}</div>
            </div>
            {/* Łączna liczba pozycji */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Łącznie pozycji</div>
              <div className="text-lg font-medium">{totalItems}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ostrzeżenia */}
      {warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Ostrzeżenia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Karty dostaw */}
      <div className="space-y-4">
        {editedDeliveries.map((delivery) => (
          <DeliveryCard
            key={delivery.deliveryCode}
            delivery={delivery}
            deliveryDate={deliveryDate.suggested}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onSetDeliveryDate={(orderId, deliveryCode) => setDeliveryDateMutation.mutate({ orderId, deliveryCode })}
            isSettingDeliveryDate={setDeliveryDateMutation.isPending}
          />
        ))}
      </div>

      {/* Edytor pozycji */}
      {editingItem && (
        <ParsedItemEditor
          item={editingItem.item}
          onSave={handleSaveItem}
          onCancel={handleCancelEdit}
          onDelete={handleDeleteFromEditor}
        />
      )}
    </div>
  );
}

export default ParsedMailPreview;
