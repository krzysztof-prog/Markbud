'use client';

import { Badge } from '@/components/ui/badge';
import { Ban, Truck, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DroppableDelivery } from '../DragDropComponents';
import type { Delivery } from '@/types/delivery';
import type { DayStats, HolidayInfo } from '../hooks';
import type { ReadinessResult, AggregatedReadinessStatus } from '@/lib/api/orders';

/**
 * Komponent do wyświetlania ikony statusu readiness
 *
 * QW-1: Zoptymalizowany - otrzymuje status z batch query zamiast własnego useQuery
 * Eliminuje problem N+1 queries w kalendarzu
 */
function ReadinessIcon({ readiness }: { readiness?: ReadinessResult }) {
  // Ikona 16px (h-4 w-4) dla lepszej widoczności
  const iconClass = 'h-4 w-4 flex-shrink-0';

  if (!readiness) {
    return (
      <span title="Ładowanie statusu..." className="inline-flex">
        <Clock className={`${iconClass} text-slate-400`} />
      </span>
    );
  }

  const status: AggregatedReadinessStatus = readiness.status;

  switch (status) {
    case 'ready':
      return (
        <span title="Gotowe do wysyłki" className="inline-flex">
          <CheckCircle2 className={`${iconClass} text-green-600`} />
        </span>
      );
    case 'conditional':
      return (
        <span title="Warunkowe - sprawdź ostrzeżenia" className="inline-flex">
          <AlertTriangle className={`${iconClass} text-yellow-600`} />
        </span>
      );
    case 'blocked':
      return (
        <span title="Zablokowane - sprawdź blokady" className="inline-flex">
          <XCircle className={`${iconClass} text-red-600`} />
        </span>
      );
    case 'pending':
    default:
      return (
        <span title="Oczekuje na sprawdzenie" className="inline-flex">
          <Clock className={`${iconClass} text-slate-400`} />
        </span>
      );
  }
}

interface DayCellProps {
  date: Date;
  dayDeliveries: Delivery[];
  dayStats: DayStats;
  holidayInfo: HolidayInfo;
  isNonWorkingDay: boolean;
  isHolidayNonWorking: boolean;
  isToday: boolean;
  isWeekend: boolean;
  onDayClick: (date: Date) => void;
  onDayRightClick: (e: React.MouseEvent, date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
  /** QW-1: Mapa statusów readiness z batch query (opcjonalna dla backwards compatibility) */
  readinessMap?: Record<number, ReadinessResult>;
}

export function DayCell({
  date,
  dayDeliveries,
  dayStats,
  holidayInfo,
  isNonWorkingDay,
  isHolidayNonWorking,
  isToday,
  isWeekend,
  onDayClick,
  onDayRightClick,
  onDeliveryClick,
  readinessMap,
}: DayCellProps) {
  const hasPolishHoliday = holidayInfo.polishHolidays.length > 0;
  const hasGermanHoliday = holidayInfo.germanHolidays.length > 0;
  const isNonWorking = isNonWorkingDay || isHolidayNonWorking;

  const cellClassName = cn(
    'h-48 border rounded-lg p-2 cursor-pointer transition-colors relative',
    isNonWorking
      ? 'bg-red-200 border-red-500 hover:bg-red-300'
      : isToday
      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
      : isWeekend
      ? 'bg-slate-100 hover:bg-slate-200'
      : 'bg-slate-50 hover:bg-slate-100'
  );

  const titleText = isNonWorking
    ? `Dzien wolny od pracy${hasPolishHoliday ? ` - ${holidayInfo.polishHolidays[0].name}` : ''}${hasGermanHoliday ? ` (DE: ${holidayInfo.germanHolidays[0].name})` : ''} (PPM aby zmienic)`
    : 'PPM aby oznaczyc jako wolny';

  return (
    <div
      className={cellClassName}
      onClick={() => onDayClick(date)}
      onContextMenu={(e) => onDayRightClick(e, date)}
      title={titleText}
    >
      {/* Day header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-sm font-medium',
              isNonWorking
                ? 'text-red-700 font-bold'
                : isToday
                ? 'text-blue-600'
                : 'text-slate-700'
            )}
          >
            {date.getDate()}
          </span>
          {isNonWorking && <Ban className="h-4 w-4 text-red-700" />}
        </div>
        <div className="flex items-center gap-1">
          {hasPolishHoliday && (
            <span
              className="text-xs font-bold text-white bg-red-600 px-1.5 py-0.5 rounded"
              title={holidayInfo.polishHolidays.map((h) => h.name).join(', ')}
            >
              PL
            </span>
          )}
          {hasGermanHoliday && (
            <span
              className="text-xs font-bold text-white bg-amber-600 px-1.5 py-0.5 rounded"
              title={holidayInfo.germanHolidays.map((h) => h.name).join(', ')}
            >
              DE
            </span>
          )}
          {dayDeliveries.length > 0 && (
            <Badge variant="default" className="text-xs">
              {dayDeliveries.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Holiday names */}
      {(hasPolishHoliday || hasGermanHoliday) && (
        <div className="text-xs font-semibold mb-1 truncate" style={{ color: '#991b1b' }}>
          {hasPolishHoliday && `PL ${holidayInfo.polishHolidays[0].name}`}
          {hasGermanHoliday && !hasPolishHoliday && `DE ${holidayInfo.germanHolidays[0].name}`}
          {hasPolishHoliday && hasGermanHoliday && (
            <span className="block text-amber-700">DE {holidayInfo.germanHolidays[0].name}</span>
          )}
        </div>
      )}

      {/* Day statistics */}
      {dayStats.windows > 0 && (
        <div className="text-xs text-slate-600 mb-1 flex gap-2">
          <span>O:{dayStats.windows}</span>
          <span>S:{dayStats.sashes}</span>
          <span>Sz:{dayStats.glasses}</span>
        </div>
      )}

      {/* Deliveries list */}
      <div className="space-y-2">
        {dayDeliveries.map((delivery: Delivery) => (
          <DroppableDelivery key={delivery.id} delivery={delivery} compact>
            <div
              className="flex items-center gap-2 text-xs font-medium text-blue-900 bg-blue-100 hover:bg-blue-200 cursor-pointer rounded px-2 py-1 transition-colors border border-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                onDeliveryClick(delivery);
              }}
            >
              {/* QW-1: Używamy readiness z batch query zamiast N osobnych zapytań */}
              <ReadinessIcon readiness={readinessMap?.[delivery.id]} />
              <Truck className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {delivery.deliveryNumber || `#${delivery.id}`}
              </span>
            </div>
          </DroppableDelivery>
        ))}
      </div>
    </div>
  );
}

export default DayCell;
