'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Undo2, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAllRemanentHistory, useRollback } from '@/features/warehouse/remanent/hooks/useRemanentHistory';
import { groupRemanentHistory } from '@/features/warehouse/remanent/hooks/useRemanentHistory';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function RemanentHistoryPage() {
  const { data: historyData, isLoading } = useAllRemanentHistory();
  const rollbackMutation = useRollback();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedHistory = useMemo(
    () => (historyData ? groupRemanentHistory(historyData) : []),
    [historyData]
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const handleRollback = useCallback(async (colorId: number) => {
    if (
      !confirm(
        'Czy na pewno chcesz cofnąć ostatni remanent? Przywróci to poprzednie stany magazynu.'
      )
    ) {
      return;
    }
    await rollbackMutation.mutateAsync(colorId);
  }, [rollbackMutation]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-12 text-slate-500">Ładowanie historii...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/magazyn/akrobud/remanent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do remanentu
            </Link>
          </Button>
        </div>

        <h1 className="text-3xl font-bold">Historia remanentów</h1>
        <p className="text-slate-600 mt-1">Przeglądaj wykonane inwentaryzacje</p>
      </div>

      {/* History Groups */}
      {groupedHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <p className="text-lg font-medium">Brak historii remanentów</p>
              <p className="text-sm mt-2">Wykonaj pierwszy remanent, aby zobaczyć historię</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedHistory.map((group) => {
            const groupKey = `${group.date}-${group.colorId}`;
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <Card key={groupKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border-2 border-slate-300"
                        style={{ backgroundColor: group.colorCode }}
                        title={group.colorCode}
                      />
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(group.date), 'PPPP', { locale: pl })}
                        </CardTitle>
                        <CardDescription>
                          {group.colorName} ({group.colorCode})
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-600">
                          Profile: {group.totalProfiles}
                        </div>
                        {group.differencesCount > 0 ? (
                          <div className="text-sm text-yellow-600">
                            Różnice: {group.differencesCount}
                          </div>
                        ) : (
                          <div className="text-sm text-green-600 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3 w-3" />
                            Zgodne
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {group.canRollback && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(group.colorId)}
                            disabled={rollbackMutation.isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Cofnij
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          {isExpanded ? 'Ukryj' : 'Pokaż'} szczegóły
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profil</TableHead>
                          <TableHead className="text-center">Stan obliczony</TableHead>
                          <TableHead className="text-center">Stan rzeczywisty</TableHead>
                          <TableHead className="text-center">Różnica</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono font-semibold">
                              {entry.profile.number}
                              <div className="text-xs text-slate-500 font-normal">
                                {entry.profile.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.calculatedStock} bel
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.actualStock} bel
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.difference === 0 ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />0
                                </Badge>
                              ) : entry.difference > 0 ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  +{entry.difference} bel
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  {entry.difference} bel
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
