'use client';

import { useMemo } from 'react';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '@/lib/money';

interface DeliveryValueProps {
  delivery: {
    deliveryOrders?: Array<{
      order: {
        valuePln?: string | number | null;
        valueEur?: string | number | null;
      };
    }>;
  };
}

export const DeliveryValue = ({ delivery }: DeliveryValueProps) => {
  // Wartości są w groszach/centach - sumuj w jednostkach bazowych, konwertuj na końcu
  const { totalPln, totalEur } = useMemo(() => {
    let sumGrosze = 0;
    let sumCenty = 0;

    if (delivery.deliveryOrders && Array.isArray(delivery.deliveryOrders)) {
      delivery.deliveryOrders.forEach(({ order }) => {
        if (order.valuePln !== null && order.valuePln !== undefined) {
          const grosze = typeof order.valuePln === 'number' ? order.valuePln : parseInt(String(order.valuePln), 10);
          if (!isNaN(grosze)) {
            sumGrosze += grosze;
          }
        }
        if (order.valueEur !== null && order.valueEur !== undefined) {
          const centy = typeof order.valueEur === 'number' ? order.valueEur : parseInt(String(order.valueEur), 10);
          if (!isNaN(centy)) {
            sumCenty += centy;
          }
        }
      });
    }

    // Konwertuj grosze na PLN i centy na EUR
    return {
      totalPln: groszeToPln(sumGrosze as Grosze),
      totalEur: centyToEur(sumCenty as Centy)
    };
  }, [delivery.deliveryOrders]);

  if (totalPln === 0 && totalEur === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="text-sm">
      <div className="font-medium">
        {totalPln.toLocaleString('pl-PL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        PLN
      </div>
      <div className="text-slate-500">
        {totalEur.toLocaleString('pl-PL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        EUR
      </div>
    </div>
  );
};

export default DeliveryValue;
