'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { FileText } from 'lucide-react';
import type { OrderTableData } from '@/types';

interface WarehouseOrdersTableProps {
  data: OrderTableData | undefined;
  isLoading: boolean;
  onOrderClick?: (orderId: number, orderNumber: string) => void;
}

/**
 * Tabela zleceń dla wybranego koloru
 * Wyświetla zlecenia w formie tabeli z profilami i ich zapotrzebowaniem
 */
export const WarehouseOrdersTable = React.memo(function WarehouseOrdersTable({
  data,
  isLoading,
  onOrderClick,
}: WarehouseOrdersTableProps) {
  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <>
        <MobileScrollHint />
        <Card>
          <CardContent className="p-0">
            <TableSkeleton rows={8} columns={6} />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!data?.orders?.length) {
    return (
      <>
        <MobileScrollHint />
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Brak zleceń"
              description="Nie znaleziono żadnych aktywnych zleceń dla tego koloru. Zlecenia pojawią się tutaj po dodaniu zamówień wymagających tego profilu."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      </>
    );
  }

  const profiles = data.profiles || [];
  const orders = data.orders || [];
  const totals = data.totals || {};

  return (
    <>
      <MobileScrollHint />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-sm min-w-[800px] table-fixed">
              <thead className="bg-slate-50 border-b sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 sticky left-0 bg-slate-50 z-30 w-32">
                    Zlecenie
                  </th>
                  {profiles.map((profile: OrderTableData['profiles'][0]) => (
                    <th
                      key={profile.id}
                      colSpan={2}
                      className="px-4 py-3 text-center font-medium text-slate-700 border-l min-w-[140px]"
                    >
                      {profile.number}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-100 border-b text-xs">
                  <th className="px-4 py-2 text-left text-slate-500 sticky left-0 bg-slate-100 z-30 w-32"></th>
                  {profiles.map((profile: OrderTableData['profiles'][0]) => (
                    <React.Fragment key={profile.id}>
                      <th className="px-2 py-2 text-center text-slate-700 font-semibold border-l-4 border-l-blue-400 bg-blue-100 min-w-[70px]">
                        bele
                      </th>
                      <th className="px-2 py-2 text-center text-slate-500 border-l min-w-[70px]">
                        m
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Suma */}
                <tr className="bg-blue-50 font-semibold sticky top-[74px] z-10">
                  <td className="px-4 py-3 sticky left-0 bg-blue-50 z-20 w-32">SUMA</td>
                  {profiles.map((profile: OrderTableData['profiles'][0]) => {
                    const total = totals[profile.number] || { beams: 0, meters: 0 };
                    return (
                      <React.Fragment key={`total-${profile.id}`}>
                        <td className="px-2 py-3 text-center border-l-4 border-l-blue-400 bg-blue-200 font-bold min-w-[70px]">
                          {total.beams}
                        </td>
                        <td className="px-2 py-3 text-center border-l bg-blue-50 min-w-[70px]">
                          {total.meters.toFixed(1)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {orders.map((order: OrderTableData['orders'][0], index: number) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-100';
                  return (
                    <tr key={order.orderId} className={`border-b hover:bg-slate-100 ${rowBg}`}>
                      <td className={`px-4 py-3 font-mono font-medium sticky left-0 z-10 w-32 ${rowBg}`}>
                        <button
                          onClick={() => onOrderClick?.(order.orderId, order.orderNumber)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {order.orderNumber}
                        </button>
                      </td>
                      {profiles.map((profile: OrderTableData['profiles'][0]) => {
                        const req = order.requirements[profile.number] || { beams: 0, meters: 0 };
                        return (
                          <React.Fragment key={`${order.orderId}-${profile.id}`}>
                            <td className="px-2 py-3 text-center border-l-4 border-l-blue-400 bg-blue-50 font-medium min-w-[70px]">
                              {req.beams || '-'}
                            </td>
                            <td className="px-2 py-3 text-center border-l min-w-[70px]">
                              {req.meters || '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
});
