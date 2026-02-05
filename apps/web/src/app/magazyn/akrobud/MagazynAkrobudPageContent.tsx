'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { colorsApi, ordersApi, warehouseApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, ClipboardCheck, History } from 'lucide-react';
import Link from 'next/link';
import { OrderDetailModal } from '@/features/orders/components/OrderDetailModal';
import type { Color } from '@/types';
import { WarehouseHistory } from '@/features/warehouse/components/WarehouseHistory';
import { WarehouseOrdersTable } from '@/features/warehouse/components/WarehouseOrdersTable';
import { WarehouseStockTable } from '@/features/warehouse/components/WarehouseStockTable';

export default function MagazynAkrobudPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'zlecenia' | 'magazyn' | 'historia' | null;

  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'zlecenia' | 'magazyn' | 'historia'>(tabParam || 'zlecenia');
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; number: string } | null>(null);

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ['zlecenia', 'magazyn', 'historia'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Pobierz kolory AKROBUD (isAkrobud=true)
  const { data: colors } = useQuery({
    queryKey: ['colors', { isAkrobud: true }],
    queryFn: () => colorsApi.getAll({ isAkrobud: true }),
  });

  // Pobierz tabel zleceD dla wybranego koloru
  const { data: ordersTable, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-table', selectedColorId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- selectedColorId is guaranteed to be non-null by enabled condition
    queryFn: () => ordersApi.getTable(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Pobierz stan magazynowy dla wybranego koloru
  const { data: warehouseData, isLoading: warehouseLoading } = useQuery({
    queryKey: ['warehouse', selectedColorId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- selectedColorId is guaranteed to be non-null by enabled condition
    queryFn: () => warehouseApi.getByColor(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Ustaw pierwszy kolor jako domy[lny
  if (colors?.length && !selectedColorId) {
    setSelectedColorId(colors[0].id);
  }

  const selectedColor = colors?.find((c: Color) => c.id === selectedColorId);

  // Wszystkie kolory AKROBUD (posortowane po kodzie z API)
  const allColors = colors || [];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Magazyn AKROBUD">
        <div className="flex gap-2">
          <Link href="/magazyn/akrobud/remanent">
            <Button variant="outline" size="sm">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Wykonaj remanent
            </Button>
          </Link>
          <BackButton href="/" />
        </div>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'AKROBUD', icon: <Warehouse className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Sidebar z kolorami */}
        <div className="w-full md:w-64 border-r border-b md:border-b-0 bg-white overflow-y-auto max-h-48 md:max-h-full">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
              Kolory
            </h3>

            <div className="space-y-1">
              {allColors.map((color: Color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColorId(color.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    selectedColorId === color.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color.hexColor || '#ccc' }}
                  />
                  <span className="font-mono text-xs">{color.code}</span>
                  <span className="flex-1 truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 p-4 md:p-6">
          {selectedColor && (
            <>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
                <div
                  className="w-8 h-8 md:w-10 md:h-10 rounded border-2 flex-shrink-0"
                  style={{ backgroundColor: selectedColor.hexColor || '#ccc' }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold truncate">
                    {selectedColor.code} - {selectedColor.name}
                  </h2>
                  <Badge variant={selectedColor.type === 'atypical' ? 'outline' : 'secondary'} className="mt-1">
                    {selectedColor.type === 'typical' ? 'Typowy' : 'Nietypowy'}
                  </Badge>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'zlecenia' | 'magazyn' | 'historia')}>
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="zlecenia" className="flex-1 md:flex-none text-xs md:text-sm">Tabela zleceń</TabsTrigger>
                  <TabsTrigger value="magazyn" className="flex-1 md:flex-none text-xs md:text-sm">Stan magazynowy</TabsTrigger>
                  <TabsTrigger value="historia" className="flex-1 md:flex-none text-xs md:text-sm">
                    <History className="h-4 w-4 mr-1" />
                    Historia
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="zlecenia" className="mt-3 md:mt-4">
                  <WarehouseOrdersTable
                    data={ordersTable}
                    isLoading={ordersLoading}
                    onOrderClick={(orderId, orderNumber) =>
                      setSelectedOrder({ id: orderId, number: orderNumber })
                    }
                  />
                </TabsContent>

                <TabsContent value="magazyn" className="mt-3 md:mt-4">
                  {selectedColorId && (
                    <WarehouseStockTable
                      data={warehouseData?.data || []}
                      isLoading={warehouseLoading}
                      colorId={selectedColorId}
                    />
                  )}
                </TabsContent>

                <TabsContent value="historia" className="mt-3 md:mt-4">
                  {selectedColorId && (
                    <WarehouseHistory
                      colorId={selectedColorId}
                      colorName={selectedColor?.name}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Modal szczegółów zlecenia */}
      <OrderDetailModal
        orderId={selectedOrder?.id || null}
        orderNumber={selectedOrder?.number}
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      />
    </div>
  );
}
