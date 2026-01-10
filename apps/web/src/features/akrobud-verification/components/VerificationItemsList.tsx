'use client';

/**
 * VerificationItemsList - Lista elementów na liście weryfikacyjnej
 */

import React from 'react';
import { Trash2, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AkrobudVerificationItem } from '@/types';

interface VerificationItemsListProps {
  items: AkrobudVerificationItem[];
  onDeleteItem?: (itemId: number) => void;
  isPending?: boolean;
}

export const VerificationItemsList: React.FC<VerificationItemsListProps> = ({
  items,
  onDeleteItem,
  isPending = false,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'found':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'variant_match':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'found':
        return <Badge variant="default" className="bg-green-100 text-green-800">Znalezione</Badge>;
      case 'variant_match':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Wariant</Badge>;
      case 'not_found':
        return <Badge variant="destructive">Brak</Badge>;
      default:
        return <Badge variant="secondary">Oczekujące</Badge>;
    }
  };

  // Konwersja na rzymskie
  const toRoman = (num: number): string => {
    if (num <= 0 || num > 100) return num.toString();

    const romanNumerals: [number, string][] = [
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];

    let result = '';
    let remaining = num;

    for (const [value, numeral] of romanNumerals) {
      while (remaining >= value) {
        result += numeral;
        remaining -= value;
      }
    }

    return result;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Brak elementów na liście. Dodaj numery zleceń powyżej.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Poz.</TableHead>
            <TableHead>Nr zlecenia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dopasowane zlecenie</TableHead>
            {onDeleteItem && <TableHead className="w-16"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {toRoman(item.position)}
              </TableCell>
              <TableCell className="font-mono">{item.orderNumberInput}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.matchStatus)}
                  {getStatusBadge(item.matchStatus)}
                </div>
              </TableCell>
              <TableCell>
                {item.matchedOrder ? (
                  <div className="text-sm">
                    <span className="font-mono">{item.matchedOrder.orderNumber}</span>
                    {item.matchedOrder.client && (
                      <span className="text-muted-foreground ml-2">
                        - {item.matchedOrder.client}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {onDeleteItem && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteItem(item.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default VerificationItemsList;
