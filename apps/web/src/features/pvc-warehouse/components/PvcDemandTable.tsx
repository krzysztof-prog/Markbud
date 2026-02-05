/**
 * PvcDemandTable - tabela zapotrzebowania na profile PVC
 */

'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PvcDemandItem, DemandOrder, SystemType } from '../types';
import { SYSTEM_LABELS } from '../types';

/** Maksymalna liczba zleceń widocznych inline */
const MAX_INLINE_ORDERS = 3;

interface PvcDemandTableProps {
  demand: PvcDemandItem[];
  isLoading?: boolean;
}

interface OrdersModalData {
  profileNumber: string;
  profileName: string;
  orders: DemandOrder[];
}

/**
 * Pobiera aktywne systemy dla profilu
 */
function getActiveSystems(profile: PvcDemandItem['profile']): SystemType[] {
  const active: SystemType[] = [];
  if (profile.isLiving) active.push('living');
  if (profile.isBlok) active.push('blok');
  if (profile.isVlak) active.push('vlak');
  if (profile.isCt70) active.push('ct70');
  if (profile.isFocusing) active.push('focusing');
  return active;
}

export const PvcDemandTable: React.FC<PvcDemandTableProps> = ({
  demand,
  isLoading = false,
}) => {
  const [ordersModal, setOrdersModal] = useState<OrdersModalData | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-32">System</TableHead>
              <TableHead className="w-28">Kolor</TableHead>
              <TableHead className="w-28 text-right">Zapotrzebowanie</TableHead>
              <TableHead className="w-32">Zlecenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}>
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (demand.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-slate-500">
        Brak zapotrzebowania dla wybranych filtrów
      </div>
    );
  }

  const totalBeams = demand.reduce((acc, d) => acc + d.totalBeams, 0);

  return (
    <div className="rounded-md border">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-40">System</TableHead>
              <TableHead className="w-32">Kolor</TableHead>
              <TableHead className="w-32 text-right">Zapotrzebowanie</TableHead>
              <TableHead>Zlecenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demand.map((item, idx) => {
              const activeSystems = getActiveSystems(item.profile);

              return (
                <TableRow key={`${item.profile.id}-${item.color?.id ?? 'no-color'}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                  {/* Numer profilu */}
                  <TableCell className="font-mono text-sm">
                    {item.profile.number}
                  </TableCell>

                  {/* Nazwa */}
                  <TableCell className="text-sm">{item.profile.name}</TableCell>

                  {/* Systemy */}
                  <TableCell>
                    <div className="flex gap-0.5 flex-nowrap">
                      {activeSystems.map((system) => (
                        <Badge
                          key={system}
                          variant="outline"
                          className="text-[10px] px-1 py-0 leading-4"
                        >
                          {SYSTEM_LABELS[system]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  {/* Kolor */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border flex-shrink-0"
                        style={{ backgroundColor: item.color?.hexColor || '#ccc' }}
                      />
                      <span className="font-mono text-xs">{item.color?.code || 'Brak'}</span>
                    </div>
                  </TableCell>

                  {/* Zapotrzebowanie */}
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {item.totalBeams} beli
                  </TableCell>

                  {/* Zlecenia - max 3 inline, reszta w modalu */}
                  <TableCell>
                    <div className="flex flex-nowrap gap-1 items-center">
                      {item.orders.slice(0, MAX_INLINE_ORDERS).map((order) => (
                        <Tooltip key={order.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-help"
                            >
                              {order.number}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{order.beams} beli</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {item.orders.length > MAX_INLINE_ORDERS && (
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-slate-100"
                          onClick={() => setOrdersModal({
                            profileNumber: item.profile.number,
                            profileName: item.profile.name,
                            orders: item.orders,
                          })}
                        >
                          +{item.orders.length - MAX_INLINE_ORDERS}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TooltipProvider>

      {/* Summary */}
      <div className="p-3 bg-slate-50 border-t text-sm text-slate-600 flex justify-between">
        <span>Razem: {demand.length} pozycji</span>
        <span>
          Łączne zapotrzebowanie: <strong>{totalBeams} beli</strong>
        </span>
      </div>

      {/* Modal ze wszystkimi zleceniami */}
      <Dialog open={ordersModal !== null} onOpenChange={(open) => { if (!open) setOrdersModal(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Zlecenia - profil {ordersModal?.profileNumber} {ordersModal?.profileName}
            </DialogTitle>
          </DialogHeader>
          {ordersModal && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-3">
                Łącznie {ordersModal.orders.length} zleceń
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ordersModal.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-slate-50/50 text-sm"
                  >
                    <span className="font-mono font-medium">{order.number}</span>
                    <span className="text-muted-foreground text-xs">{order.beams} beli</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PvcDemandTable;
