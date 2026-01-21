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
import { toast } from '@/hooks/useToast';
import { formatGrosze, formatCenty, type Grosze, type Centy } from '@/lib/money';
import { Package, Layers, Grid3X3, Calendar, FileText, FileDown, ChevronDown, ChevronUp, Truck, Calculator } from 'lucide-react';
import type { Order, SchucoDeliveryLink } from '@/types';
import type { Requirement } from '@/types';
import { ReadinessChecklist } from '@/components/ReadinessChecklist';
import { isAkrobudOrder } from '../helpers/orderHelpers';

// Extended order with additional fields from PDF/imports
interface OrderDetail extends Order {
  windows?: {
    id?: number;
    widthMm?: number;
    heightMm?: number;
    profileType?: string;
    quantity?: number;
    reference?: string;
  }[];
  glasses?: {
    id: number;
    lp: number;
    position: number;
    widthMm: number;
    heightMm: number;
    quantity: number;
    packageType: string;
    areaSqm: number;
  }[];
  totalWindows?: number;
  totalSashes?: number;
  totalGlasses?: number;
  deliveryDate?: string;
  invoiceNumber?: string;
  notes?: string;
  requirements?: Requirement[];
  schucoLinks?: SchucoDeliveryLink[];
  // Sumy z materiałówki (wartości w groszach)
  windowsNetValue?: number | null;
  windowsMaterial?: number | null;
  assemblyValue?: number | null;
  extrasValue?: number | null;
  otherValue?: number | null;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- enabled check guarantees orderId is not null
    queryFn: () => ordersApi.getById(orderId!) as Promise<OrderDetail>,
    enabled: !!orderId && open,
  });

  const [hasPdf, setHasPdf] = React.useState(false);
  const [windowsExpanded, setWindowsExpanded] = React.useState(false);
  const [glassesExpanded, setGlassesExpanded] = React.useState(false);
  const [requirementsExpanded, setRequirementsExpanded] = React.useState(false);
  const [schucoExpanded, setSchucoExpanded] = React.useState(true); // Domyślnie rozwinięte

  // Sprawdź czy istnieje PDF dla tego zlecenia w bazie danych
  // UWAGA: Używamy isMounted pattern aby uniknąć race condition przy unmount
  React.useEffect(() => {
    let isMounted = true;

    if (orderId && open) {
      ordersApi.checkPdf(orderId)
        .then((result) => {
          if (isMounted) {
            setHasPdf(result.hasPdf);
          }
        })
        .catch(() => {
          if (isMounted) {
            setHasPdf(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [orderId, open]);

  const handleOpenPdf = async () => {
    if (!orderId) return;

    try {
      // Pobierz PDF przez fetchBlob (z tokenem autoryzacyjnym)
      const { fetchBlob } = await import('@/lib/api-client');
      const blob = await fetchBlob(`/api/orders/${orderId}/pdf`);

      // Utwórz URL dla blob i otwórz w nowej karcie
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Zwolnij URL natychmiast po otwarciu okna (przeglądarka już ma dane)
      // UWAGA: setTimeout powodował memory leak gdy komponent był odmontowany
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Błąd podczas otwierania PDF:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się otworzyć pliku PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-12">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Zlecenie {orderNumber || order?.orderNumber || '...'}
              </div>
              {order?.clientName && (
                <div className="text-sm font-normal text-slate-600">
                  Klient: {order.clientName}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPdf}
              disabled={!hasPdf}
              className={hasPdf
                  ? 'border-green-500 text-green-700 hover:bg-green-50'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50 opacity-60'
              }
            >
              <FileDown className="h-4 w-4 mr-2" />
              {hasPdf ? 'Otwórz PDF' : 'Brak PDF'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* P1-R4: System Brain - Production Readiness Checklist */}
            {order.status === 'new' && (
              <ReadinessChecklist
                type="production"
                entityId={order.id}
                className="mb-4"
              />
            )}

            {/* Podsumowanie */}
            {(() => {
              // Oblicz totals z danych okien jako fallback
              const calculatedWindows = order.windows?.reduce(
                (sum: number, w) => sum + (w.quantity || 1),
                0
              ) || 0;
              const displayWindows = order.totalWindows ?? (calculatedWindows > 0 ? calculatedWindows : '-');
              const displaySashes = order.totalSashes ?? '-';
              const displayGlasses = order.totalGlasses ?? '-';

              return (
                <div className="grid grid-cols-3 gap-2">
                  <SummaryCard
                    icon={<Grid3X3 className="h-3.5 w-3.5 text-blue-500" />}
                    label="Okna/Drzwi"
                    value={displayWindows}
                  />
                  <SummaryCard
                    icon={<Layers className="h-3.5 w-3.5 text-green-500" />}
                    label="Skrzydła"
                    value={displaySashes}
                  />
                  <SummaryCard
                    icon={<Package className="h-3.5 w-3.5 text-purple-500" />}
                    label="Szyby"
                    value={displayGlasses}
                  />
                </div>
              );
            })()}

            {/* Informacje o zleceniu i Projekty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informacje o zleceniu */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informacje o zleceniu
                </h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Status:</span>{' '}
                    <Badge
                      variant={
                        order.status === 'new'
                          ? 'secondary'
                          : order.status === 'completed'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {order.status === 'new'
                        ? 'Nowe'
                        : order.status === 'in_progress'
                        ? 'W produkcji'
                        : order.status === 'completed'
                        ? 'Zakończone'
                        : order.status === 'archived'
                        ? 'Zarchiwizowane'
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
                      <span className="font-medium">{formatGrosze(order.valuePln as Grosze)}</span>
                    </div>
                  )}
                  {order.valueEur && (
                    <div>
                      <span className="text-slate-500">Wartość EUR:</span>{' '}
                      <span className="font-medium">{formatCenty(order.valueEur as Centy)}</span>
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

              {/* Projekty - widoczne tylko dla klientów AKROBUD */}
              {isAkrobudOrder(order.clientName) && (() => {
                const references = Array.from(
                  new Set(
                    order.windows
                      ?.map((w) => w.reference)
                      .filter((ref): ref is string => ref !== null && ref !== undefined && ref.trim() !== '') || []
                  )
                );

                if (references.length > 0) {
                  return (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-900">
                        <FileText className="h-4 w-4" />
                        Projekty
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {references.map((ref, i) => (
                          <span
                            key={i}
                            className="inline-block px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-mono text-blue-900 shadow-sm"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Materiałówka - sumy wartości */}
            {(order.windowsNetValue || order.windowsMaterial || order.assemblyValue || order.extrasValue || order.otherValue) && (
              <div className="border rounded-lg border-emerald-200 bg-emerald-50/30">
                <div className="px-4 py-3">
                  <h4 className="font-medium flex items-center gap-2 text-emerald-900 mb-3">
                    <Calculator className="h-4 w-4" />
                    Materiałówka - sumy
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {order.windowsNetValue != null && order.windowsNetValue > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Wartość netto okien</div>
                        <div className="font-semibold text-emerald-700">
                          {formatGrosze(order.windowsNetValue as Grosze)}
                        </div>
                      </div>
                    )}
                    {order.windowsMaterial != null && order.windowsMaterial > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Materiał okien</div>
                        <div className="font-semibold text-emerald-700">
                          {formatGrosze(order.windowsMaterial as Grosze)}
                        </div>
                      </div>
                    )}
                    {order.assemblyValue != null && order.assemblyValue > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Wartość montażu</div>
                        <div className="font-semibold text-emerald-700">
                          {formatGrosze(order.assemblyValue as Grosze)}
                        </div>
                      </div>
                    )}
                    {order.extrasValue != null && order.extrasValue > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Wartość dodatków</div>
                        <div className="font-semibold text-emerald-700">
                          {formatGrosze(order.extrasValue as Grosze)}
                        </div>
                      </div>
                    )}
                    {order.otherValue != null && order.otherValue > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Inne</div>
                        <div className="font-semibold text-emerald-700">
                          {formatGrosze(order.otherValue as Grosze)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Zamówienia Schuco - Collapsible */}
            {order.schucoLinks && order.schucoLinks.length > 0 && (
              <div className="border rounded-lg border-orange-200 bg-orange-50/30">
                <button
                  onClick={() => setSchucoExpanded(!schucoExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors rounded-t-lg"
                >
                  <h4 className="font-medium flex items-center gap-2 text-orange-900">
                    <Truck className="h-4 w-4" />
                    Zamówienia Schuco ({order.schucoLinks.length})
                  </h4>
                  {schucoExpanded ? (
                    <ChevronUp className="h-5 w-5 text-orange-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-orange-500" />
                  )}
                </button>
                {schucoExpanded && (
                  <div className="border-t border-orange-200">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left">Nr zamówienia</th>
                            <th className="px-3 py-2 text-left">Nazwa</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2 text-center">Tydzień dostawy</th>
                            <th className="px-3 py-2 text-right">Wartość</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.schucoLinks.map((link, index) => {
                            const delivery = link.schucoDelivery;
                            const statusColor = delivery.shippingStatus.toLowerCase().includes('dostarcz')
                              ? 'bg-green-100 text-green-700'
                              : delivery.shippingStatus.toLowerCase().includes('wysłan') || delivery.shippingStatus.toLowerCase().includes('wyslan')
                              ? 'bg-blue-100 text-blue-700'
                              : delivery.shippingStatus.toLowerCase().includes('otwart')
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-slate-100 text-slate-600';

                            return (
                              <tr key={link.id} className={`border-t border-orange-100 hover:bg-orange-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50/20'}`}>
                                <td className="px-3 py-2 font-mono font-medium">{delivery.orderNumber}</td>
                                <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={delivery.orderName || ''}>
                                  {delivery.orderName || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                    {delivery.shippingStatus}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {delivery.deliveryWeek || '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {delivery.totalAmount ? `${delivery.totalAmount} €` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista okien - Collapsible */}
            {order.windows && order.windows.length > 0 && (
              <div className="border rounded-lg">
                <button
                  onClick={() => setWindowsExpanded(!windowsExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <h4 className="font-medium">Lista okien i drzwi ({order.windows.length})</h4>
                  {windowsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {windowsExpanded && (
                  <div className="border-t">
                    <div className="max-h-[400px] overflow-y-auto">
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
                          {order.windows.map((win, i: number) => (
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
              </div>
            )}

            {/* Lista szyb - Collapsible */}
            {order.glasses && order.glasses.length > 0 && (
              <div className="border rounded-lg border-cyan-200">
                <button
                  onClick={() => setGlassesExpanded(!glassesExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-cyan-50 transition-colors"
                >
                  <h4 className="font-medium flex items-center gap-2 text-cyan-900">
                    <Package className="h-4 w-4" />
                    Lista szyb ({order.glasses.length})
                  </h4>
                  {glassesExpanded ? (
                    <ChevronUp className="h-5 w-5 text-cyan-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cyan-500" />
                  )}
                </button>
                {glassesExpanded && (
                  <div className="border-t border-cyan-200">
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-cyan-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-center w-12">Lp.</th>
                            <th className="px-3 py-2 text-center">Pozycja</th>
                            <th className="px-3 py-2 text-center">Szerokość</th>
                            <th className="px-3 py-2 text-center">Wysokość</th>
                            <th className="px-3 py-2 text-center">Ilość</th>
                            <th className="px-3 py-2 text-left">Typ pakietu</th>
                            <th className="px-3 py-2 text-right">Pow. (m²)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.glasses.map((glass, i: number) => (
                            <tr key={glass.id} className={`border-t hover:bg-cyan-50 ${i % 2 === 0 ? 'bg-white' : 'bg-cyan-50/30'}`}>
                              <td className="px-3 py-2 text-center text-slate-500">{glass.lp}</td>
                              <td className="px-3 py-2 text-center font-medium">{glass.position}</td>
                              <td className="px-3 py-2 text-center font-mono">{glass.widthMm} mm</td>
                              <td className="px-3 py-2 text-center font-mono">{glass.heightMm} mm</td>
                              <td className="px-3 py-2 text-center font-medium">{glass.quantity}</td>
                              <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={glass.packageType}>
                                {glass.packageType}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{glass.areaSqm.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-cyan-100 font-medium">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right">Suma:</td>
                            <td className="px-3 py-2 text-center">
                              {order.glasses.reduce((sum, g) => sum + g.quantity, 0)}
                            </td>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 text-right font-mono">
                              {order.glasses.reduce((sum, g) => sum + g.areaSqm * g.quantity, 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista zapotrzebowania na profile - Collapsible */}
            {order.requirements && order.requirements.length > 0 && (
              <div className="border rounded-lg">
                <button
                  onClick={() => setRequirementsExpanded(!requirementsExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <h4 className="font-medium">Zapotrzebowanie na profile ({order.requirements.length})</h4>
                  {requirementsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {requirementsExpanded && (
                  <div className="border-t">
                    <div className="max-h-[400px] overflow-y-auto">
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
                          {order.requirements.map((req: Requirement & { beamsCount?: number; meters?: number; restMm?: number }, index: number) => (
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
                              <td className="px-3 py-2 text-center">{req.meters?.toFixed(1)}</td>
                              <td className="px-3 py-2 text-center text-slate-500">{req.restMm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
