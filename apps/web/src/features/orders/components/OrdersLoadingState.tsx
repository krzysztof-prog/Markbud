'use client';

/**
 * Komponent stanu ładowania dla zestawienia zleceń
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// ================================
// Komponent
// ================================

export const OrdersLoadingState: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </CardContent>
    </Card>
  );
};

export default OrdersLoadingState;
