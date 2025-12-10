'use client';

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton } from '@/components/loaders/CardSkeleton';
import { useLatestImportSummary } from '../hooks/useGlassDeliveries';

export function LatestImportSummary() {
  const { data, isLoading } = useLatestImportSummary();

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ostatni import</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Brak zaimportowanych dostaw</p>
        </CardContent>
      </Card>
    );
  }

  const { delivery, stats, orderSummary } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ostatni import - {delivery.rackNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-medium">Data dostowy:</span> {new Date(delivery.deliveryDate).toLocaleDateString('pl-PL')}
          </p>
          <p>
            <span className="font-medium">Numer zlecenia:</span> {delivery.customerOrderNumber}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500 text-center">Pozycji</p>
          </div>

          <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-600">{stats.matched}</p>
            <p className="text-xs text-gray-500">Dopasowane</p>
          </div>

          <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mb-1" />
            <p className="text-lg font-bold text-yellow-600">{stats.conflict}</p>
            <p className="text-xs text-gray-500">Konflikty</p>
          </div>

          <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mb-1" />
            <p className="text-lg font-bold text-red-600">{stats.unmatched}</p>
            <p className="text-xs text-gray-500">Niedop.</p>
          </div>

          <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Oczekujące</p>
          </div>
        </div>

        {orderSummary.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Zlecenia ({orderSummary.length}):
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {orderSummary.map((order) => (
                <div
                  key={order.orderNumber}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <span className="font-mono font-medium">{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{order.quantity} szt.</span>
                    <div className="flex gap-1 text-xs">
                      {order.matchStatus.matched > 0 && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          ✓{order.matchStatus.matched}
                        </span>
                      )}
                      {order.matchStatus.conflict > 0 && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                          ⚠{order.matchStatus.conflict}
                        </span>
                      )}
                      {order.matchStatus.unmatched > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                          ✗{order.matchStatus.unmatched}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
