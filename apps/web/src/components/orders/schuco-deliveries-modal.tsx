'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import type { SchucoDeliveryLink } from '@/types';

interface SchucoDeliveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  schucoLinks: SchucoDeliveryLink[];
}

const getSchucoStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('dostarcz')) return 'bg-green-100 text-green-700';
  if (lowerStatus.includes('wysłan') || lowerStatus.includes('wyslan')) return 'bg-blue-100 text-blue-700';
  if (lowerStatus.includes('otwart')) return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
};

export function SchucoDeliveriesModal({
  isOpen,
  onClose,
  orderNumber,
  schucoLinks,
}: SchucoDeliveriesModalProps) {
  if (!schucoLinks || schucoLinks.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Zamówienia Schuco dla zlecenia {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Znaleziono {schucoLinks.length} powiązanych zamówień Schuco
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Nr zamówienia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status wysyłki
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Tydzień dostawy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Data zamówienia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Nazwa zlecenia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Powiązanie
                  </th>
                </tr>
              </thead>
              <tbody>
                {schucoLinks.map((link) => (
                  <tr key={link.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {link.schucoDelivery.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSchucoStatusColor(
                          link.schucoDelivery.shippingStatus
                        )}`}
                      >
                        {link.schucoDelivery.shippingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {link.schucoDelivery.deliveryWeek || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {link.schucoDelivery.orderDateParsed
                        ? formatDate(link.schucoDelivery.orderDateParsed)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {link.schucoDelivery.orderName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          link.linkedBy === 'auto'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {link.linkedBy === 'auto' ? 'Automatyczne' : 'Ręczne'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {schucoLinks.some((link) => link.linkedBy === 'auto') && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md">
              ℹ️ Powiązania zostały utworzone automatycznie na podstawie numerów zleceń w
              zamówieniach Schuco
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
