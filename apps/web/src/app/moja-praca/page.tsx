'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, FileText, Truck, Layers, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ConflictsList,
  ConflictDetailModal,
  UserOrdersList,
  UserDeliveriesList,
  UserGlassOrdersList,
  useConflictsCount,
  useDaySummary,
} from '@/features/moja-praca';
import type { ImportConflict } from '@/features/moja-praca';

export default function MojaPracaPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedConflict, setSelectedConflict] = useState<ImportConflict | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Formatuj datę do YYYY-MM-DD
  const dateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // Pobierz licznik konfliktów
  const { data: conflictsCount } = useConflictsCount();

  // Pobierz podsumowanie dnia
  const { data: summary } = useDaySummary(dateString);

  const handleSelectConflict = (conflict: ImportConflict) => {
    setSelectedConflict(conflict);
    setIsConflictModalOpen(true);
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moja Praca</h1>
          <p className="text-muted-foreground">
            Twoje zlecenia, dostawy i konflikty importu
          </p>
        </div>

        {/* Wybór daty */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDisplayDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Podsumowanie */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.conflicts.pending}</div>
                <div className="text-sm text-muted-foreground">Konflikty</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.ordersCount}</div>
                <div className="text-sm text-muted-foreground">Zlecenia</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.deliveriesCount}</div>
                <div className="text-sm text-muted-foreground">Dostawy</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.glassOrdersCount}</div>
                <div className="text-sm text-muted-foreground">Zamówienia szyb</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="conflicts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Konflikty
            {conflictsCount && conflictsCount.pending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {conflictsCount.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Zlecenia
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Dostawy
          </TabsTrigger>
          <TabsTrigger value="glass" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Szyby
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konflikty do rozwiązania</CardTitle>
            </CardHeader>
            <CardContent>
              <ConflictsList onSelectConflict={handleSelectConflict} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Twoje zlecenia z {formatDisplayDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserOrdersList date={dateString} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Dostawy na {formatDisplayDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserDeliveriesList date={dateString} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glass">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Zamówienia szyb z {formatDisplayDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserGlassOrdersList date={dateString} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal szczegółów konfliktu */}
      <ConflictDetailModal
        conflict={selectedConflict}
        open={isConflictModalOpen}
        onOpenChange={setIsConflictModalOpen}
      />
    </div>
  );
}
