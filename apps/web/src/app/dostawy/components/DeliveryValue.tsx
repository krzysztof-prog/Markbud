'use client';

import { useMemo } from 'react';

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
  const { totalPln, totalEur } = useMemo(() => {
    let sumPln = 0;
    let sumEur = 0;

    if (delivery.deliveryOrders && Array.isArray(delivery.deliveryOrders)) {
      delivery.deliveryOrders.forEach(({ order }) => {
        if (order.valuePln !== null && order.valuePln !== undefined) {
          const plnValue = parseFloat(String(order.valuePln));
          if (!isNaN(plnValue)) {
            sumPln += plnValue;
          }
        }
        if (order.valueEur !== null && order.valueEur !== undefined) {
          const eurValue = parseFloat(String(order.valueEur));
          if (!isNaN(eurValue)) {
            sumEur += eurValue;
          }
        }
      });
    }

    return { totalPln: sumPln, totalEur: sumEur };
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
