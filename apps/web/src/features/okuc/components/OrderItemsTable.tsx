/**
 * Tabela pozycji zamówienia OKUC (widok szczegółów)
 *
 * Read-only wyświetlanie pozycji zamówienia.
 * Kolumny: Artykuł (articleId + nazwa), Ilość, Jednostka, Cena szacowana (PLN!), Tydzień dostawy
 *
 * KRYTYCZNE: Ceny w eurocentach - dzielimy przez 100 dla wyświetlania w EUR!
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OkucOrderItem } from '@/types/okuc';

interface OrderItemsTableProps {
  items: OkucOrderItem[];
  isLoading?: boolean;
}

export function OrderItemsTable({
  items,
  isLoading = false,
}: OrderItemsTableProps) {
  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Ładowanie pozycji zamówienia...</p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Brak pozycji w zamówieniu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Artykuł</TableHead>
            <TableHead className="text-right">Ilość zamówiona</TableHead>
            <TableHead className="text-right">Ilość odebrana</TableHead>
            <TableHead>Jednostka</TableHead>
            <TableHead className="text-right">Cena jedn. (EUR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            // Nazwa artykułu (jeśli relacja załadowana)
            const articleDisplay = item.article
              ? `${item.article.articleId} - ${item.article.name}`
              : `ID: ${item.articleId}`;

            // Jednostka (jeśli relacja załadowana)
            const unit = item.article?.orderUnit === 'pack' ? 'Paczka' : 'Sztuka';

            // Cena w EUR (konwersja z eurocentów)
            const priceInEur = item.unitPrice
              ? item.unitPrice / 100
              : 0;

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {articleDisplay}
                </TableCell>
                <TableCell className="text-right">
                  {item.orderedQty}
                </TableCell>
                <TableCell className="text-right">
                  {item.receivedQty !== null && item.receivedQty !== undefined
                    ? item.receivedQty
                    : '-'}
                </TableCell>
                <TableCell>
                  {unit}
                </TableCell>
                <TableCell className="text-right">
                  {priceInEur > 0 ? `${priceInEur.toFixed(2)} €` : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Podsumowanie */}
      <div className="border-t p-4 bg-muted/50">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Łącznie pozycji:</span>
          <span>{items.length}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="font-medium">Łączna ilość zamówiona:</span>
          <span>
            {items.reduce((sum, item) => sum + item.orderedQty, 0)}
          </span>
        </div>
        {items.some(item => item.receivedQty !== null && item.receivedQty !== undefined) && (
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="font-medium">Łączna ilość odebrana:</span>
            <span>
              {items.reduce((sum, item) => sum + (item.receivedQty || 0), 0)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm mt-2 font-semibold">
          <span>Łączna wartość szacowana:</span>
          <span>
            {(() => {
              const totalCents = items.reduce(
                (sum, item) => sum + (item.orderedQty || 0) * (item.unitPrice || 0),
                0
              );
              if (totalCents === 0) return '-';
              return `${(totalCents / 100).toFixed(2)} €`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
