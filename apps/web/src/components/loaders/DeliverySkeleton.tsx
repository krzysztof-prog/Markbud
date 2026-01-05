import { Skeleton } from '@/components/ui/skeleton';

/**
 * Calendar Skeleton - dla DeliveryCalendar
 */
export function CalendarSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4">
      {/* Header z kontrolkami */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-32" /> {/* Przycisk poprzedni */}
        <Skeleton className="h-10 w-48" /> {/* Nazwa miesiąca */}
        <Skeleton className="h-8 w-32" /> {/* Przycisk następny */}
      </div>

      {/* Kontrolki kalendarza */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Kalendarz grid 7x5 */}
      <div className="grid grid-cols-7 gap-2">
        {/* Nagłówki dni tygodnia */}
        {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map((day, i) => (
          <div key={i} className="text-center text-sm font-medium text-gray-600 p-2">
            {day}
          </div>
        ))}

        {/* Dni miesiąca */}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>

      {/* Panel nieprzypisanych zleceń */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Dialog Skeleton - dla modali (DeliveryDialogs, OrderDetailModal, etc.)
 */
export function DialogSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Title */}
      <Skeleton className="h-7 w-64 mb-6" />

      {/* Content - form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full" /> {/* Textarea */}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Panel Skeleton - dla UnassignedOrdersPanel
 */
export function PanelSkeleton() {
  return (
    <div className="h-full border-l bg-gray-50 p-4 space-y-3 overflow-auto">
      <Skeleton className="h-6 w-48 mb-4" /> {/* Header */}

      {/* Lista zleceń */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-3 space-y-2 border">
          <Skeleton className="h-5 w-32" /> {/* Numer zlecenia */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * List View Skeleton - dla DeliveriesListView
 */
export function ListViewSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Search/Filter bar */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b">
          <div className="grid grid-cols-6 gap-4 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b last:border-b-0">
            <div className="grid grid-cols-6 gap-4 p-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bulk Update Dialog Skeleton
 */
export function BulkUpdateDialogSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-56 mb-4" /> {/* Title */}

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Offset input */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 mt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
