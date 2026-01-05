'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Package, FileText } from 'lucide-react';

interface GlassOrderConflictDetails {
  existingOrder: {
    id: number;
    glassOrderNumber: string;
    orderDate: Date | string;
    supplier: string;
    status: string;
    itemsCount: number;
  };
  newOrder: {
    glassOrderNumber: string;
    orderDate: Date | string;
    supplier: string;
    itemsCount: number;
  };
}

interface GlassOrderConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: GlassOrderConflictDetails | null;
  onResolve: (action: 'cancel' | 'replace' | 'skip') => void;
  isResolving?: boolean;
}

export function GlassOrderConflictModal({
  open,
  onOpenChange,
  conflict,
  onResolve,
  isResolving = false,
}: GlassOrderConflictModalProps) {
  if (!conflict) return null;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ordered: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Konflikt: Zamówienie szkła już istnieje
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Zamówienie o numerze <strong>{conflict.newOrder.glassOrderNumber}</strong> już istnieje w
            systemie. Wybierz, jak chcesz postąpić.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nowe zamówienie */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-900">
              <Package className="h-4 w-4" />
              Nowe zamówienie (do importu)
            </h4>
            <div className="rounded-lg border bg-white border-blue-300 p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Numer zamówienia</span>
                  <p className="font-mono font-medium">{conflict.newOrder.glassOrderNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data zamówienia
                  </span>
                  <p className="font-medium">{formatDate(conflict.newOrder.orderDate)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Dostawca</span>
                  <p className="font-medium">{conflict.newOrder.supplier}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Liczba pozycji</span>
                  <p className="font-medium">{conflict.newOrder.itemsCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Istniejące zamówienie */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4" />
              Istniejące zamówienie w systemie
            </h4>
            <div className="rounded-lg border bg-white p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Numer zamówienia</span>
                  <p className="font-mono font-medium">{conflict.existingOrder.glassOrderNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data zamówienia
                  </span>
                  <p className="font-medium">{formatDate(conflict.existingOrder.orderDate)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Dostawca</span>
                  <p className="font-medium">{conflict.existingOrder.supplier}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Liczba pozycji</span>
                  <p className="font-medium">{conflict.existingOrder.itemsCount}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-xs">Status</span>
                  <p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(conflict.existingOrder.status)}`}
                    >
                      {conflict.existingOrder.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Porównanie */}
          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <h4 className="font-medium mb-3 text-yellow-900">Różnice</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-600">Różnica w liczbie pozycji:</span>
                <span className="ml-2 font-medium">
                  {conflict.newOrder.itemsCount - conflict.existingOrder.itemsCount > 0 && '+'}
                  {conflict.newOrder.itemsCount - conflict.existingOrder.itemsCount}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Różnica w datach:</span>
                <span className="ml-2 font-medium">
                  {Math.abs(
                    new Date(conflict.newOrder.orderDate).getTime() -
                      new Date(conflict.existingOrder.orderDate).getTime()
                  ) /
                    (1000 * 60 * 60 * 24)}{' '}
                  dni
                </span>
              </div>
            </div>
          </div>

          {/* Ostrzeżenie */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Uwaga:</strong> Zastąpienie istniejącego zamówienia spowoduje usunięcie
              starych danych i utworzenie nowego zamówienia z zaimportowanych danych.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onResolve('cancel');
              onOpenChange(false);
            }}
            disabled={isResolving}
          >
            Anuluj import
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onResolve('skip');
              onOpenChange(false);
            }}
            disabled={isResolving}
            className="border-slate-400 text-slate-700 hover:bg-slate-100"
          >
            Pomiń (zachowaj istniejące)
          </Button>
          <Button
            onClick={() => onResolve('replace')}
            disabled={isResolving}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isResolving ? 'Zastępowanie...' : 'Zastąp istniejące'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
