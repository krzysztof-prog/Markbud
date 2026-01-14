/**
 * Funkcje pomocnicze dla modułu Schuco
 *
 * Zawiera logikę parsowania, formatowania i walidacji
 * związaną z dostawami Schuco.
 */

import type { SchucoDelivery } from '@/types/schuco';
import type { ChangedFieldInfo, DeliveryChangeCounts } from '../types';

/**
 * Mapowanie nazw pól na etykiety wyświetlane użytkownikowi
 */
export const FIELD_LABELS: Record<string, string> = {
  shippingStatus: 'Status wysyłki',
  deliveryWeek: 'Tydzień dostawy',
  deliveryType: 'Rodzaj dostawy',
  tracking: 'Śledzenie',
  complaint: 'Reklamacja',
  orderType: 'Rodzaj zamówienia',
  totalAmount: 'Suma',
};

/**
 * Zwraca klasy CSS dla badge statusu wysyłki
 */
export function getShippingStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Całkowicie dostarczone':
      return 'bg-green-600 text-white';
    case 'Potwierdzona dostawa':
      return 'bg-blue-600 text-white';
    case 'Częściowo dostarczono':
      return 'bg-amber-500 text-white';
    case 'Zlecenie anulowane':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-200 text-slate-700';
  }
}

/**
 * Zwraca klasy CSS dla wiersza tabeli na podstawie typu zmiany
 * Zwraca null jeśli brak zmian (używany jest domyślny styl)
 */
export function getRowChangeClasses(delivery: SchucoDelivery): string | null {
  if (delivery.changeType === 'new') {
    return 'bg-green-100 hover:bg-green-200 border-l-4 border-l-green-600';
  }
  if (delivery.changeType === 'updated') {
    return 'bg-orange-100 hover:bg-orange-200 border-l-4 border-l-orange-600';
  }
  return null;
}

/**
 * Parsuje informacje o zmienionych polach z dostawy
 * Zwraca tablicę obiektów z nazwą pola i poprzednią wartością
 */
export function parseChangedFieldsInfo(delivery: SchucoDelivery): ChangedFieldInfo[] {
  if (!delivery.changedFields || !delivery.previousValues) {
    return [];
  }

  try {
    const fields = JSON.parse(delivery.changedFields) as string[];
    const prevValues = JSON.parse(delivery.previousValues) as Record<string, string | null>;

    return fields.map((field) => ({
      field: FIELD_LABELS[field] || field,
      oldValue: prevValues[field],
    }));
  } catch {
    return [];
  }
}

/**
 * Sprawdza czy tydzień dostawy się zmienił w ostatniej aktualizacji
 */
export function hasDeliveryWeekChanged(delivery: SchucoDelivery): boolean {
  if (!delivery.changedFields || delivery.changeType !== 'updated') {
    return false;
  }

  try {
    const fields = JSON.parse(delivery.changedFields) as string[];
    return fields.includes('deliveryWeek');
  } catch {
    return false;
  }
}

/**
 * Zlicza ilość nowych i zmienionych dostaw
 */
export function countDeliveryChanges(deliveries: SchucoDelivery[]): DeliveryChangeCounts {
  return deliveries.reduce(
    (counts, delivery) => {
      if (delivery.changeType === 'new') {
        counts.new++;
      } else if (delivery.changeType === 'updated') {
        counts.updated++;
      }
      return counts;
    },
    { new: 0, updated: 0 }
  );
}

/**
 * Filtruje dostawy po nr zamówienia lub nazwie
 */
export function filterDeliveriesByQuery(
  deliveries: SchucoDelivery[],
  query: string
): SchucoDelivery[] {
  if (!query.trim()) {
    return deliveries;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return deliveries.filter(
    (d) =>
      d.orderNumber?.toLowerCase().includes(normalizedQuery) ||
      d.orderName?.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Oblicza zakres wyświetlanych elementów na stronie
 */
export function calculateDisplayRange(
  currentPage: number,
  pageSize: number,
  total: number
): { startItem: number; endItem: number } {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return { startItem, endItem };
}

/**
 * Formatuje datę do polskiego formatu
 */
export function formatDatePL(date: string | Date): string {
  return new Date(date).toLocaleString('pl-PL');
}

/**
 * Formatuje czas trwania w ms do sekund
 */
export function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}
