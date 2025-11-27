'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  positive?: boolean;
  className?: string;
  suffix?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  positive = true,
  className,
  suffix = '',
}: StatCardProps) {
  const showTrend = trend !== undefined && trend !== 0;
  const trendColor = positive ? 'text-green-600' : 'text-red-600';
  const trendBgColor = positive ? 'bg-green-50' : 'bg-red-50';
  const TrendIcon = positive ? ArrowUp : ArrowDown;

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <div className="h-8 w-8 text-slate-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900">
            {value}{suffix}
          </div>
          {showTrend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                trendBgColor,
                trendColor
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {showTrend && (
          <p className="mt-1 text-xs text-slate-500">
            {positive ? 'Wzrost' : 'Spadek'} w porównaniu z poprzednim okresem
          </p>
        )}
      </CardContent>
    </Card>
  );
}
