'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/lib/api';
import { Package, Layers, Grid3X3, Calendar, FileText, FileDown } from 'lucide-react';
import type { Order } from '@/types';

// Extended order with additional fields from PDF/imports
interface OrderDetail extends Order {
  windows?: any[];
  totalWindows?: number;
  totalSashes?: number;
  totalGlasses?: number;
  deliveryDate?: string;
  invoiceNumber?: string;
  notes?: string;
  requirements?: any[];
}

interface OrderDetailModalProps {
  orderId: number | null;
  orderNumber?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailModal({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: OrderDetailModalProps) {
  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['order-detail', orderId],
    queryFn: () => ordersApi.getById(orderId!) as Promise<OrderDetail>,
    enabled: !!orderId && open,
  });

  const [hasPdf, setHasPdf] = React.useState(false);

  // Sprawdź czy istnieje PDF dla tego zlecenia
  React.useEffect(() => {
    if (orderId && open) {
      ordersApi.getPdf(orderId)
        .then(() => setHasPdf(true))
        .catch(() => setHasPdf(false));
    }
  }, [orderId, open]);

  const handleOpenPdf = () => {
    if (orderId) {
      // Otwórz PDF przez endpoint API
      window.open(`http://localhost:3001/api/orders/${orderId}/pdf`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Zlecenie {orderNumber || order?.orderNumber || '...'}
            </div>
            {hasPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPdf}
                className="ml-auto"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Otwórz PDF z ceną
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Podsumowanie */}
            {(() => {
              // Oblicz totals z danych okien jako fallback
              const calculatedWindows = order.windows?.reduce(
                (sum: number, w: any) => sum + (w.quantity || 1),
                0
              ) || 0;
              const displayWindows = order.totalWindows ?? (calculatedWindows > 0 ? calculatedWindows : '-');
              const displaySashes = order.totalSashes ?? '-';
              const displayGlasses = order.totalGlasses ?? '-';

              return (
                <div className="grid grid-cols-3 gap-4">
                  <SummaryCard
                    icon={<Grid3X3 className="h-5 w-5 text-blue-500" />}
                    label="Okna/Drzwi"
                    value={displayWindows}
                  />
                  <SummaryCard
                    icon={<Layers className="h-5 w-5 text-green-500" />}
                    label="Skrzydła"
                    value={displaySashes}
                  />
                  <SummaryCard
                    icon={<Package className="h-5 w-5 text-purple-500" />}
                    label="Szyby"
                    value={displayGlasses}
                  />
                </div>
              );
            })()}

            {/* Informacje o zleceniu */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informacje o zleceniu
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <Badge
                    variant={
                      order.status === 'pending'
                        ? 'secondary'
                        : order.status === 'completed'
                        ? 'default'
                        : 'outline'
                    }
                  >
                    {order.status === 'pending'
                      ? 'Oczekujące'
                      : order.status === 'completed'
                      ? 'Zakończone'
                      : order.status === 'archived'
                      ? 'Zarchiwizowane'
                      : order.status === 'active'
                      ? 'Aktywne'
                      : order.status}
                  </Badge>
                </div>
                {order.deliveryDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Data dostawy:</span>{' '}
                    <span className="font-medium">
                      {new Date(order.deliveryDate).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                )}
                {order.valuePln && (
                  <div>
                    <span className="text-slate-500">Wartość PLN:</span>{' '}
                    <span className="font-medium">{parseFloat(order.valuePln).toFixed(2)} zł</span>
                  </div>
                )}
                {order.valueEur && (
                  <div>
                    <span className="text-slate-500">Wartość EUR:</span>{' '}
                    <span className="font-medium">{parseFloat(order.valueEur).toFixed(2)} €</span>
                  </div>
                )}
                {order.invoiceNumber && (
                  <div>
                    <span className="text-slate-500">Nr faktury:</span>{' '}
                    <span className="font-mono">{order.invoiceNumber}</span>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-slate-500 text-sm">Notatki:</span>
                  <p className="text-sm mt-1">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Lista okien */}
            {order.windows && order.windows.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Lista okien i drzwi ({order.windows.length})</h4>
                <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-center w-12">Lp.</th>
                        <th className="px-3 py-2 text-center">Szerokość</th>
                        <th className="px-3 py-2 text-center">Wysokość</th>
                        <th className="px-3 py-2 text-left">Typ profilu</th>
                        <th className="px-3 py-2 text-center">Ilość</th>
                        <th className="px-3 py-2 text-left">Referencja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.windows.map((win: any, i: number) => (
                        <tr key={win.id || i} className={`border-t hover:bg-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                          <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2 text-center font-mono">{win.widthMm} mm</td>
                          <td className="px-3 py-2 text-center font-mono">{win.heightMm} mm</td>
                          <td className="px-3 py-2">{win.profileType}</td>
                          <td className="px-3 py-2 text-center font-medium">{win.quantity}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{win.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lista zapotrzebowania na profile */}
            {order.requirements && order.requirements.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Zapotrzebowanie na profile ({order.requirements.length})</h4>
                <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left">Profil</th>
                        <th className="px-3 py-2 text-left">Kolor</th>
                        <th className="px-3 py-2 text-center">Bele</th>
                        <th className="px-3 py-2 text-center">Metry</th>
                        <th className="px-3 py-2 text-center">Reszta (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.requirements.map((req: any, index: number) => (
                        <tr key={req.id} className={`border-t hover:bg-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                          <td className="px-3 py-2 font-mono font-medium">{req.profile?.number}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: req.color?.hexColor || '#ccc' }}
                              />
                              <span className="font-mono text-xs">{req.color?.code}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{req.beamsCount}</td>
                          <td className="px-3 py-2 text-center">{req.meters.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{req.restMm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Nie znaleziono zlecenia
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
