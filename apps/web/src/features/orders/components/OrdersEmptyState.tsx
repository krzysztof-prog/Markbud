'use client';

/**
 * Komponent pustego stanu dla zestawienia zleceń
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

// ================================
// Typy
// ================================

interface OrdersEmptyStateProps {
  hasSearchQuery: boolean;
}

// ================================
// Komponent
// ================================

export const OrdersEmptyState: React.FC<OrdersEmptyStateProps> = ({ hasSearchQuery }) => {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">
            {hasSearchQuery ? 'Brak wyników dla podanego wyszukiwania' : 'Brak zleceń w systemie'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersEmptyState;
