'use client';

import { useMemo } from 'react';

interface DeliveryStatsProps {
  delivery: {
    deliveryOrders?: Array<{
      order: {
        totalWindows?: number | null;
        totalSashes?: number | null;
        totalGlasses?: number | null;
      };
    }>;
  };
}

export default function DeliveryStats({ delivery }: DeliveryStatsProps) {
  const stats = useMemo(() => {
    const deliveryOrders = delivery.deliveryOrders || [];

    const totalWindows = deliveryOrders.reduce(
      (sum, do_) => sum + (do_.order.totalWindows || 0),
      0
    );

    const totalSashes = deliveryOrders.reduce(
      (sum, do_) => sum + (do_.order.totalSashes || 0),
      0
    );

    const totalGlasses = deliveryOrders.reduce(
      (sum, do_) => sum + (do_.order.totalGlasses || 0),
      0
    );

    return { totalWindows, totalSashes, totalGlasses };
  }, [delivery.deliveryOrders]);

  const { totalWindows, totalSashes, totalGlasses } = stats;

  const isEmpty =
    totalWindows === 0 && totalSashes === 0 && totalGlasses === 0;

  if (isEmpty) {
    return (
      <span className="text-xs text-slate-400">Brak</span>
    );
  }

  return (
    <div className="flex gap-3 text-sm">
      <div>
        <span className="text-slate-500">O:</span>
        <span className="font-medium ml-1">{totalWindows}</span>
      </div>
      <div>
        <span className="text-slate-500">S:</span>
        <span className="font-medium ml-1">{totalSashes}</span>
      </div>
      <div>
        <span className="text-slate-500">Sz:</span>
        <span className="font-medium ml-1">{totalGlasses}</span>
      </div>
    </div>
  );
}
