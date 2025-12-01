/**
 * Dialog ze statystykami profili w dostawach
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfileStats } from '@/hooks/useProfileStats';
import { BarChart3, TrendingUp, Package } from 'lucide-react';

interface ProfileStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileStatsDialog({ open, onOpenChange }: ProfileStatsDialogProps) {
  const [selectedMonths, setSelectedMonths] = useState(6);
  const { data, isLoading } = useProfileStats(selectedMonths);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6" />
            Statystyki profili w dostawach
          </DialogTitle>
          <DialogDescription>
            Historia użycia profili w dostawach - miesięczne podsumowanie
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

        {/* Statystyki */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data && data.stats.length > 0 ? (
          <div className="space-y-6">
            {data.stats.map((monthStat) => (
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
                  {monthStat.profiles.length > 0 ? (
                    <div className="space-y-2">
                      {/* Nagłówki */}
                      <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-slate-600 border-b pb-2">
                        <div className="col-span-2">Profil</div>
                        <div>Kolor</div>
                        <div className="text-right">Bel</div>
                        <div className="text-right">Metry</div>
                        <div className="text-right">Dostaw</div>
                      </div>

                      {/* Wiersze danych */}
                      {monthStat.profiles.map((profile, idx) => (
                        <div
                          key={`${profile.profileId}-${profile.colorId}`}
                          className={`grid grid-cols-6 gap-4 text-sm py-2 px-2 rounded ${
                            idx % 2 === 0 ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div className="col-span-2 flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{profile.profileNumber}</span>
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {profile.colorCode}
                            </Badge>
                          </div>
                          <div className="text-right font-semibold text-blue-600">
                            {profile.totalBeams}
                          </div>
                          <div className="text-right text-slate-600">
                            {profile.totalMeters.toFixed(2)} m
                          </div>
                          <div className="text-right text-slate-500">
                            {profile.deliveryCount}
                          </div>
                        </div>
                      ))}

                      {/* Podsumowanie miesiąca */}
                      <div className="grid grid-cols-6 gap-4 text-sm font-bold border-t pt-2 mt-2">
                        <div className="col-span-3 text-right">Razem:</div>
                        <div className="text-right text-blue-700">
                          {monthStat.profiles.reduce((sum, p) => sum + p.totalBeams, 0)} bel
                        </div>
                        <div className="text-right text-slate-700">
                          {monthStat.profiles
                            .reduce((sum, p) => sum + p.totalMeters, 0)
                            .toFixed(2)}{' '}
                          m
                        </div>
                        <div></div>
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
      </DialogContent>
    </Dialog>
  );
}
