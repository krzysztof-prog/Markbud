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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Package, FileText, Trash2 } from 'lucide-react';
import type { VariantConflict } from '@/types/import';

interface OrderVariantConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: VariantConflict | null;
  onResolve: (resolution: 'keep_existing' | 'use_latest', deleteOlder?: boolean) => void;
  isResolving?: boolean;
}

export function OrderVariantConflictModal({
  open,
  onOpenChange,
  conflict,
  onResolve,
  isResolving = false,
}: OrderVariantConflictModalProps) {
  if (!conflict) return null;

  const getConflictTitle = () => {
    switch (conflict.type) {
      case 'base_exists':
        return 'Konflikt: Zlecenie bazowe już istnieje';
      case 'variant_exists':
        return 'Konflikt: Wariant zlecenia już istnieje';
      case 'multiple_variants':
        return 'Konflikt: Wiele wariantów zlecenia';
      default:
        return 'Konflikt wariantów zlecenia';
    }
  };

  const getConflictDescription = () => {
    switch (conflict.type) {
      case 'base_exists':
        return 'W systemie istnieje już zlecenie bazowe. Importowanie wariantu może spowodować duplikację danych.';
      case 'variant_exists':
        return 'W systemie istnieje już ten wariant zlecenia. Możesz zachować istniejący lub użyć nowego.';
      case 'multiple_variants':
        return 'W systemie istnieje wiele wariantów tego zlecenia. Zdecyduj, jak obsłużyć nowy import.';
      default:
        return 'Wykryto konflikt między nowym importem a istniejącymi zleceniami.';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            {getConflictTitle()}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {getConflictDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nowe zlecenie */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-900">
              <Package className="h-4 w-4" />
              Nowe zlecenie (do importu)
            </h4>
            <OrderVariantCard variant={conflict.newOrder} isNew />
          </div>

          {/* Istniejące zlecenia */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4" />
              Istniejące zlecenia w systemie ({conflict.existingOrders.length})
            </h4>
            <div className="space-y-3">
              {conflict.existingOrders.map((order, index) => (
                <OrderVariantCard key={index} variant={order} />
              ))}
            </div>
          </div>

          {/* Metryki porównawcze */}
          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <h4 className="font-medium mb-3 text-yellow-900">Różnice</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-600">Różnica w liczbie okien:</span>
                <span className="ml-2 font-medium">{conflict.comparisonMetrics.windowCountDiff}</span>
              </div>
              <div>
                <span className="text-slate-600">Różnica w liczbie profili:</span>
                <span className="ml-2 font-medium">{conflict.comparisonMetrics.requirementCountDiff}</span>
              </div>
            </div>
          </div>

          {/* Rekomendacja */}
          {conflict.recommendation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Rekomendacja:</strong> {conflict.recommendation}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            Anuluj
          </Button>
          <Button
            variant="outline"
            onClick={() => onResolve('keep_existing')}
            disabled={isResolving}
            className="border-slate-400 text-slate-700 hover:bg-slate-100"
          >
            Zachowaj istniejące
          </Button>
          {conflict.type === 'multiple_variants' && (
            <Button
              variant="destructive"
              onClick={() => onResolve('use_latest', true)}
              disabled={isResolving}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Użyj nowego i usuń stare
            </Button>
          )}
          <Button
            onClick={() => onResolve('use_latest', false)}
            disabled={isResolving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isResolving ? 'Przetwarzanie...' : 'Użyj nowego'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderVariantCard({ variant, isNew = false }: { variant: any; isNew?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${isNew ? 'bg-white border-blue-300' : 'bg-white'}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-slate-500 text-xs">Numer zlecenia</span>
          <p className="font-mono font-medium">{variant.orderNumber}</p>
        </div>
        {variant.windowCount !== undefined && (
          <div>
            <span className="text-slate-500 text-xs">Liczba okien</span>
            <p className="font-medium">{variant.windowCount}</p>
          </div>
        )}
        {variant.requirementCount !== undefined && (
          <div>
            <span className="text-slate-500 text-xs">Liczba profili</span>
            <p className="font-medium">{variant.requirementCount}</p>
          </div>
        )}
        {variant.delivery && (
          <div>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Dostawa
            </span>
            <p className="font-mono text-xs">{variant.delivery.deliveryNumber}</p>
            <p className="text-xs text-slate-600">
              {new Date(variant.delivery.deliveryDate).toLocaleDateString('pl-PL')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
