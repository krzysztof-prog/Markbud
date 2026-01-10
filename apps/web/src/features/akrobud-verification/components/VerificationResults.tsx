'use client';

/**
 * VerificationResults - Wyświetla wyniki weryfikacji
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { VerificationResult, ApplyChangesParams } from '@/types';

interface VerificationResultsProps {
  result: VerificationResult;
  onApplyChanges: (params: ApplyChangesParams) => void;
  isPending?: boolean;
}

export const VerificationResults: React.FC<VerificationResultsProps> = ({
  result,
  onApplyChanges,
  isPending = false,
}) => {
  // Stan zaznaczonych elementów do dodania/usunięcia
  const [selectedToAdd, setSelectedToAdd] = useState<Set<number>>(
    new Set(result.missing.map((m) => m.orderId))
  );
  const [selectedToRemove, setSelectedToRemove] = useState<Set<number>>(
    new Set(result.excess.map((e) => e.orderId))
  );

  const toggleAdd = (orderId: number) => {
    const newSet = new Set(selectedToAdd);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToAdd(newSet);
  };

  const toggleRemove = (orderId: number) => {
    const newSet = new Set(selectedToRemove);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToRemove(newSet);
  };

  const handleApply = () => {
    onApplyChanges({
      addMissing: Array.from(selectedToAdd),
      removeExcess: Array.from(selectedToRemove),
    });
  };

  const { summary } = result;
  const hasChanges = selectedToAdd.size > 0 || selectedToRemove.size > 0;

  return (
    <div className="space-y-6">
      {/* Podsumowanie */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.matchedCount}</p>
                <p className="text-sm text-muted-foreground">Zgodne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{summary.missingCount}</p>
                <p className="text-sm text-muted-foreground">Brakujące</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{summary.excessCount}</p>
                <p className="text-sm text-muted-foreground">Nadmiarowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{summary.notFoundCount}</p>
                <p className="text-sm text-muted-foreground">Nieznane</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informacja o dostawie */}
      {result.delivery ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-medium">Dostawa:</span>{' '}
              {result.delivery.deliveryNumber ?? `ID ${result.delivery.id}`}
              <Badge variant="outline" className="ml-2">
                {result.delivery.status}
              </Badge>
            </p>
          </CardContent>
        </Card>
      ) : result.needsDeliveryCreation ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">
                Brak dostawy na ten dzień. Zostanie utworzona automatycznie przy
                aplikowaniu zmian.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Brakujące w dostawie */}
      {result.missing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Brakujące w dostawie ({result.missing.length})
              <span className="text-sm font-normal text-muted-foreground">
                - są na liście klienta, ale nie w dostawie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedToAdd(new Set(result.missing.map((m) => m.orderId)))
                }
              >
                Zaznacz wszystkie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedToAdd(new Set())}
              >
                Odznacz wszystkie
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {result.missing.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedToAdd.has(item.orderId)}
                      onCheckedChange={() => toggleAdd(item.orderId)}
                    />
                    <span className="font-mono font-medium">
                      {toRoman(item.position)}. {item.orderNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.client}
                      {item.project && ` - ${item.project}`}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      <Plus className="h-3 w-3 mr-1" />
                      Dodaj
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Nadmiarowe w dostawie */}
      {result.excess.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Nadmiarowe w dostawie ({result.excess.length})
              <span className="text-sm font-normal text-muted-foreground">
                - są w dostawie, ale nie na liście klienta
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedToRemove(new Set(result.excess.map((e) => e.orderId)))
                }
              >
                Zaznacz wszystkie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedToRemove(new Set())}
              >
                Odznacz wszystkie
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {result.excess.map((item) => (
                  <div
                    key={item.orderId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedToRemove.has(item.orderId)}
                      onCheckedChange={() => toggleRemove(item.orderId)}
                    />
                    <span className="font-mono font-medium">{item.orderNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.client}
                      {item.project && ` - ${item.project}`}
                    </span>
                    <Badge variant="destructive" className="ml-auto">
                      <Minus className="h-3 w-3 mr-1" />
                      Usuń
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Nieznane w systemie */}
      {result.notFound.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Nieznane w systemie ({result.notFound.length})
              <span className="text-sm font-normal text-muted-foreground">
                - nie istnieją w bazie - zaimportuj najpierw
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {result.notFound.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 p-2 rounded bg-red-50"
                  >
                    <span className="font-mono font-medium">
                      {toRoman(item.position)}. {item.orderNumberInput}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      Brak w systemie
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Duplikaty na liście */}
      {result.duplicates.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              Duplikaty na liście ({result.duplicates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {result.duplicates.map((dup, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="font-mono font-medium">{dup.orderNumber}</span>
                  <span className="text-muted-foreground">
                    na pozycjach: {dup.positions.map(toRoman).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Przyciski akcji */}
      <div className="flex flex-col sm:flex-row gap-3">
        {result.missing.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onApplyChanges({ addMissing: Array.from(selectedToAdd) })
            }
            disabled={selectedToAdd.size === 0 || isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zaznaczone ({selectedToAdd.size})
          </Button>
        )}

        {result.excess.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onApplyChanges({ removeExcess: Array.from(selectedToRemove) })
            }
            disabled={selectedToRemove.size === 0 || isPending}
          >
            <Minus className="h-4 w-4 mr-2" />
            Usuń zaznaczone ({selectedToRemove.size})
          </Button>
        )}

        {hasChanges && (
          <Button onClick={handleApply} disabled={isPending} className="ml-auto">
            {isPending ? 'Aplikowanie...' : 'Zastosuj wszystkie zmiany'}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Konwersja liczby na cyfrę rzymską
 */
function toRoman(num: number): string {
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
}

export default VerificationResults;
