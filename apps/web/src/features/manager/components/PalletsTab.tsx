'use client';

import React from 'react';
import { PalletMonthView } from '@/features/pallets/components/PalletMonthView';

/**
 * Zakładka Paletówki - zarządzanie stanem palet
 */
export const PalletsTab: React.FC = () => {
  return (
    <div className="h-full overflow-auto">
      <PalletMonthView />
    </div>
  );
};

export default PalletsTab;
