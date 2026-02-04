/**
 * Magazyn PVC - Zapotrzebowanie Content
 *
 * Komponent z logiką strony zapotrzebowania - wymaga Suspense boundary
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ArrowLeft, Box, FileText } from 'lucide-react';
import Link from 'next/link';

import {
  SystemFilters,
  ColorSidebarRight,
  PvcDemandTable,
  usePvcDemand,
  usePvcStock,
  usePvcSystems,
  type SystemType,
} from '@/features/pvc-warehouse';

export function PvcZapotrzebowanieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Stan z URL params
  const systemsParam = searchParams.get('systems');
  const colorIdParam = searchParams.get('colorId');

  // Lokalne stany
  const [selectedSystems, setSelectedSystems] = useState<SystemType[]>(
    systemsParam ? (systemsParam.split(',') as SystemType[]) : []
  );
  const [selectedColorId, setSelectedColorId] = useState<number | null>(
    colorIdParam ? parseInt(colorIdParam, 10) : null
  );

  // Pobierz dane
  const { data: demandData, isLoading: demandLoading } = usePvcDemand({
    systems: selectedSystems.length > 0 ? selectedSystems : undefined,
    colorId: selectedColorId ?? undefined,
  });

  // Pobierz kolory dla sidebara
  const { data: stockData } = usePvcStock({});

  const { data: systemsData } = usePvcSystems();

  // Aktualizacja URL przy zmianie filtrów
  const updateUrl = useCallback(
    (systems: SystemType[], colorId: number | null) => {
      const params = new URLSearchParams();
      if (systems.length > 0) params.set('systems', systems.join(','));
      if (colorId) params.set('colorId', colorId.toString());

      const query = params.toString();
      router.replace(
        `/magazyn/pvc/zapotrzebowanie${query ? `?${query}` : ''}`,
        { scroll: false }
      );
    },
    [router]
  );

  // Handlery zmian
  const handleSystemsChange = (systems: SystemType[]) => {
    setSelectedSystems(systems);
    updateUrl(systems, selectedColorId);
  };

  const handleColorSelect = (colorId: number | null) => {
    setSelectedColorId(colorId);
    updateUrl(selectedSystems, colorId);
  };

  // Pobierz statystyki systemów
  const systemCounts = systemsData?.systems
    ? {
        living: systemsData.systems.living.count,
        blok: systemsData.systems.blok.count,
        vlak: systemsData.systems.vlak.count,
        ct70: systemsData.systems.ct70.count,
        focusing: systemsData.systems.focusing.count,
      }
    : undefined;

  // Kolory do sidebara
  const colors = stockData?.colors || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Header title="Zapotrzebowanie PVC">
        <div className="flex gap-2">
          <Link href="/magazyn/pvc">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Magazyn PVC
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </Header>

      {/* Breadcrumb */}
      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn PVC', href: '/magazyn/pvc', icon: <Box className="h-4 w-4" /> },
            { label: 'Zapotrzebowanie', icon: <FileText className="h-4 w-4" /> },
          ]}
        />
      </div>

      {/* Filtry systemów */}
      <div className="px-6 pt-4">
        <SystemFilters
          selectedSystems={selectedSystems}
          onChange={handleSystemsChange}
          systemCounts={systemCounts}
        />
      </div>

      {/* Główna zawartość + Sidebar */}
      <div className="flex flex-1 overflow-hidden mt-4">
        {/* Lewa strona - tabela zapotrzebowania */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Zapotrzebowanie na profile
            </h2>
            <p className="text-sm text-slate-500">
              Agregowane zapotrzebowanie z aktywnych zleceń
            </p>
          </div>

          <PvcDemandTable demand={demandData?.demand || []} isLoading={demandLoading} />

          {/* Summary */}
          {demandData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {demandData.totals.totalPositions}
                  </div>
                  <div className="text-sm text-blue-600">Pozycji</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {demandData.totals.totalBeams}
                  </div>
                  <div className="text-sm text-blue-600">Beli razem</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {demandData.totals.totalOrders}
                  </div>
                  <div className="text-sm text-blue-600">Zleceń</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prawa strona - sidebar kolorów */}
        <ColorSidebarRight
          colors={colors}
          selectedColorId={selectedColorId}
          onColorSelect={handleColorSelect}
          height="h-full"
        />
      </div>
    </div>
  );
}
