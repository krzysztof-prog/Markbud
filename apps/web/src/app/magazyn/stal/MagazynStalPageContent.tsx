'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { steelApi } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Warehouse, History } from 'lucide-react';
import Link from 'next/link';
import { SteelStockTable } from '@/features/steel/components/SteelStockTable';
import { SteelHistory } from '@/features/steel/components/SteelHistory';

export default function MagazynStalPageContent() {
  const [activeTab, setActiveTab] = useState<'magazyn' | 'historia'>('magazyn');

  // Pobierz wszystkie stale ze stanem magazynowym
  const { data: steels, isLoading } = useQuery({
    queryKey: ['steels-with-stock'],
    queryFn: () => steelApi.getAllWithStock(),
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Magazyn Stal">
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrot
            </Button>
          </Link>
        </div>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn', icon: <Warehouse className="h-4 w-4" /> },
            { label: 'Stal' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold">
            Wzmocnienia stalowe
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stan magazynowy stali do profili PVC. Numery artykulow zaczynajace sie od 201 lub 202.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'magazyn' | 'historia')}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="magazyn" className="flex-1 md:flex-none text-xs md:text-sm">
              Stan magazynowy
            </TabsTrigger>
            <TabsTrigger value="historia" className="flex-1 md:flex-none text-xs md:text-sm">
              <History className="h-4 w-4 mr-1" />
              Historia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="magazyn" className="mt-3 md:mt-4">
            <SteelStockTable
              data={steels || []}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="historia" className="mt-3 md:mt-4">
            <SteelHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
