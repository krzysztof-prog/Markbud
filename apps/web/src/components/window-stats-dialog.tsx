/**
 * Dialog ze statystykami okien, skrzydeł i szyb w dostawach
 * Zawiera zakładki: Statystyki miesięczne i Statystyki wg dni tygodnia
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWindowStats, useWindowStatsByWeekday } from '@/hooks/useWindowStats';
import { BarChart3, TrendingUp, Package, Calendar } from 'lucide-react';

interface WindowStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WindowStatsDialog({ open, onOpenChange }: WindowStatsDialogProps) {
  const [selectedMonths, setSelectedMonths] = useState(6);
  const { data: monthlyData, isLoading: monthlyLoading } = useWindowStats(selectedMonths);
  const { data: weekdayData, isLoading: weekdayLoading } = useWindowStatsByWeekday(selectedMonths);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6" />
            Statystyki okien w dostawach
          </DialogTitle>
          <DialogDescription>
            Analiza produkcji okien - miesięczne i tygodniowe zestawienia
          </DialogDescription>
        </DialogHeader>

        {/* Wybór okresu */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium">Okres:</span>
          <div className="flex gap-2">
            {[3, 6, 12].map((months) => (
              <Button
                key={months}
                variant={selectedMonths === months ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMonths(months)}
              >
                {months} {months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs - Miesięczne vs Dni tygodnia */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Statystyki miesięczne
            </TabsTrigger>
            <TabsTrigger value="weekday" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dni tygodnia
            </TabsTrigger>
          </TabsList>

          {/* Statystyki miesięczne */}
          <TabsContent value="monthly" className="mt-6">
            {monthlyLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : monthlyData && monthlyData.stats.length > 0 ? (
              <div className="space-y-6">
                {monthlyData.stats.map((monthStat) => (
                  <Card key={`${monthStat.year}-${monthStat.month}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span>{monthStat.monthLabel}</span>
                        </div>
                        <Badge variant="outline">
                          {monthStat.deliveriesCount}{' '}
                          {monthStat.deliveriesCount === 1
                            ? 'dostawa'
                            : monthStat.deliveriesCount < 5
                            ? 'dostawy'
                            : 'dostaw'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthStat.deliveriesCount > 0 ? (
                        <div className="space-y-4">
                          {/* Główne statystyki */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-blue-600 mb-1">Okna</div>
                              <div className="text-2xl font-bold text-blue-900">
                                {monthStat.totalWindows}
                              </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-green-600 mb-1">
                                Skrzydła
                              </div>
                              <div className="text-2xl font-bold text-green-900">
                                {monthStat.totalSashes}
                              </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-purple-600 mb-1">Szyby</div>
                              <div className="text-2xl font-bold text-purple-900">
                                {monthStat.totalGlasses}
                              </div>
                            </div>
                          </div>

                          {/* Średnie wartości */}
                          <div className="border-t pt-4">
                            <div className="text-sm font-medium text-slate-600 mb-2">
                              Średnie wartości na dostawę:
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">Okien:</span>
                                <span className="font-semibold text-blue-600">
                                  {(monthStat.totalWindows / monthStat.deliveriesCount).toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">Skrzydeł:</span>
                                <span className="font-semibold text-green-600">
                                  {(monthStat.totalSashes / monthStat.deliveriesCount).toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">Szyb:</span>
                                <span className="font-semibold text-purple-600">
                                  {(monthStat.totalGlasses / monthStat.deliveriesCount).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Brak danych dla tego miesiąca
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>Brak danych statystycznych dla wybranego okresu</p>
              </div>
            )}
          </TabsContent>

          {/* Statystyki według dni tygodnia */}
          <TabsContent value="weekday" className="mt-6">
            {weekdayLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : weekdayData && weekdayData.stats.length > 0 ? (
              <div className="space-y-6">
                {/* Podsumowanie okresu */}
                <Card className="bg-slate-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">
                      Okres analizy:{' '}
                      <span className="font-semibold">
                        {new Date(weekdayData.periodStart).toLocaleDateString('pl-PL')} -{' '}
                        {new Date(weekdayData.periodEnd).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Statystyki dla każdego dnia tygodnia */}
                <div className="grid grid-cols-1 gap-4">
                  {weekdayData.stats
                    .filter((stat) => stat.weekday !== 0 && stat.weekday !== 6) // Pomijamy weekend
                    .map((weekdayStat) => (
                      <Card key={weekdayStat.weekday}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-blue-600" />
                              <span>{weekdayStat.weekdayName}</span>
                            </div>
                            <Badge variant="outline">
                              {weekdayStat.deliveriesCount}{' '}
                              {weekdayStat.deliveriesCount === 1
                                ? 'dostawa'
                                : weekdayStat.deliveriesCount < 5
                                ? 'dostawy'
                                : 'dostaw'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {weekdayStat.deliveriesCount > 0 ? (
                            <div className="space-y-4">
                              {/* Sumy */}
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-blue-600 mb-1">
                                    Okna (suma)
                                  </div>
                                  <div className="text-xl font-bold text-blue-900">
                                    {weekdayStat.totalWindows}
                                  </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-green-600 mb-1">
                                    Skrzydła (suma)
                                  </div>
                                  <div className="text-xl font-bold text-green-900">
                                    {weekdayStat.totalSashes}
                                  </div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-purple-600 mb-1">
                                    Szyby (suma)
                                  </div>
                                  <div className="text-xl font-bold text-purple-900">
                                    {weekdayStat.totalGlasses}
                                  </div>
                                </div>
                              </div>

                              {/* Średnie */}
                              <div className="border-t pt-3">
                                <div className="text-xs font-medium text-slate-600 mb-2">
                                  Średnia na dostawę:
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 text-xs">Okien:</span>
                                    <span className="font-semibold text-blue-600">
                                      {weekdayStat.avgWindowsPerDelivery.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 text-xs">Skrzydeł:</span>
                                    <span className="font-semibold text-green-600">
                                      {weekdayStat.avgSashesPerDelivery.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 text-xs">Szyb:</span>
                                    <span className="font-semibold text-purple-600">
                                      {weekdayStat.avgGlassesPerDelivery.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 text-center py-4">
                              Brak dostaw w tym dniu tygodnia
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>Brak danych statystycznych dla wybranego okresu</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
