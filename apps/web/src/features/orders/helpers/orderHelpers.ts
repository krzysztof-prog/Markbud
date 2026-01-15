/**
 * Funkcje pomocnicze dla zestawienia zleceń
 */

import { formatDate } from '@/lib/utils';
import type {
  ExtendedOrder,
  ColumnId,
  DeliveryOrderInfo,
} from '../types';
import type { SchucoDeliveryLink } from '@/types';

// ================================
// Schuco helpers
// ================================

/**
 * Agreguje status Schuco (zwraca "najgorszy" status)
 */
export const aggregateSchucoStatus = (links: SchucoDeliveryLink[] | undefined): string => {
  if (!links || links.length === 0) return '';

  const statuses = links.map(l => l.schucoDelivery.shippingStatus.toLowerCase());

  // Priorytet: otwarte (najgorszy) > wysłane > dostarczone (najlepszy)
  if (statuses.some(s => s.includes('otwart'))) return 'Otwarte';
  if (statuses.some(s => s.includes('wysłan') || s.includes('wyslan'))) return 'Wysłane';
  if (statuses.some(s => s.includes('dostarcz'))) return 'Dostarczone';

  // Zwróć pierwszy status jeśli nie pasuje do znanych
  return links[0].schucoDelivery.shippingStatus;
};

/**
 * Pobiera najwcześniejszą datę dostawy Schuco
 */
export const getEarliestSchucoDelivery = (links: SchucoDeliveryLink[] | undefined): string | null => {
  if (!links || links.length === 0) return null;

  const withDelivery = links
    .filter(l => l.schucoDelivery.deliveryWeek)
    .map(l => l.schucoDelivery.deliveryWeek as string);

  if (withDelivery.length === 0) return null;

  return withDelivery.sort()[0];
};

/**
 * Formatuje tydzień dostawy (KW 03/2026 -> Tyg. 3/2026)
 */
export const formatDeliveryWeek = (week: string | null): string => {
  if (!week) return '-';
  const match = week.match(/KW\s*(\d+)\/(\d+)/i);
  if (match) {
    return `Tyg. ${parseInt(match[1])}/${match[2]}`;
  }
  return week;
};

/**
 * Określa kolor statusu Schuco
 */
export const getSchucoStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('dostarcz')) return 'bg-green-100 text-green-700';
  if (lowerStatus.includes('wysłan') || lowerStatus.includes('wyslan')) return 'bg-blue-100 text-blue-700';
  if (lowerStatus.includes('otwart')) return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
};

// ================================
// Date helpers
// ================================

/**
 * Formatuje datę bez roku (DD.MM)
 */
export const formatDateShort = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
};

/**
 * Pobiera najwcześniejszą datę dostawy Akrobud
 */
export const getAkrobudDeliveryDate = (deliveryOrders: DeliveryOrderInfo[] | undefined): string | null => {
  if (!deliveryOrders || deliveryOrders.length === 0) return null;

  const withDelivery = deliveryOrders
    .filter(d => d.delivery?.deliveryDate)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Filtrowane wyżej: delivery?.deliveryDate istnieje
    .map(d => d.delivery!.deliveryDate as string);

  if (withDelivery.length === 0) return null;

  return withDelivery.sort()[0];
};

// ================================
// Client helpers
// ================================

/**
 * Sprawdza czy zlecenie jest od Akrobudu
 */
export const isAkrobudOrder = (client: string | null | undefined): boolean => {
  if (!client) return false;
  return client.toUpperCase().includes('AKROBUD');
};

/**
 * Formatuje nazwę klienta zgodnie z zasadami:
 * - "AKROBUD SOKOŁOWSKI SPÓŁKA KOMANDYTOWA" -> "AKROBUD"
 * - Imię i nazwisko -> tylko nazwisko
 */
export const formatClientName = (client: string | null | undefined): string => {
  if (!client) return '';

  // Skróć AKROBUD do samej nazwy firmy
  if (client.toUpperCase().includes('AKROBUD')) {
    return 'AKROBUD';
  }

  // Sprawdź czy to firma (zawiera sufiks firmowy w dowolnym miejscu)
  const hasCompanySuffix = /(SP\.?|SPÓŁKA|S\.A\.|LTD|LLC|GMBH|FIRMA|COMPANY|CO\.|INC|CORP|O\.O\.|Z\s+O\.O\.)/i.test(
    client
  );

  // Jeśli to firma, zwróć pełną nazwę
  if (hasCompanySuffix) {
    return client;
  }

  // Dla klientów z imieniem i nazwiskiem - zwróć tylko ostatnie słowo (nazwisko)
  const words = client.trim().split(/\s+/);
  if (words.length >= 2) {
    return words[words.length - 1]; // Zwróć samo nazwisko
  }

  // Pojedyncze słowo - zwróć je
  return client;
};

// ================================
// Column value helpers
// ================================

/**
 * Pobiera wartość kolumny dla filtrowania/sortowania
 */
export const getColumnValue = (order: ExtendedOrder, columnId: ColumnId): string => {
  switch (columnId) {
    case 'orderNumber':
      return order.orderNumber || '';
    case 'client':
      return order.client || '';
    case 'project':
      return order.project || '';
    case 'system':
      return order.system || '';
    case 'totalWindows':
      return String(order.totalWindows || order._count?.windows || 0);
    case 'totalSashes':
      return String(order.totalSashes || 0);
    case 'glasses':
      return String(order.totalGlasses || 0);
    case 'glassDeliveryDate': {
      const ordered = order.orderedGlassCount || 0;
      const delivered = order.deliveredGlassCount || 0;
      if (ordered === 0) return '';
      if (delivered >= ordered) return 'Dostarczono';
      if (delivered > 0) return `Częściowo: ${delivered}/${ordered}`;
      if (order.glassDeliveryDate) return formatDateShort(order.glassDeliveryDate);
      return 'Brak daty';
    }
    case 'okucDemandStatus': {
      const status = order.okucDemandStatus || 'none';
      switch (status) {
        case 'none': return '';
        case 'imported': return 'OK';
        case 'has_atypical': return 'Nietypowe!';
        case 'pending': return 'Oczekuje';
        default: return status;
      }
    }
    case 'valuePln':
      return order.valuePln != null ? String(order.valuePln) : '';
    case 'valueEur':
      return order.valueEur != null ? String(order.valueEur) : '';
    case 'orderStatus': {
      const schucoStatusVal = aggregateSchucoStatus(order.schucoLinks);
      return schucoStatusVal || order.status || '';
    }
    case 'pvcDelivery': {
      const schucoWeekVal = getEarliestSchucoDelivery(order.schucoLinks);
      if (schucoWeekVal) return formatDeliveryWeek(schucoWeekVal);
      if (order.deliveryDate) {
        return formatDate(order.deliveryDate);
      }
      return order.pvcDeliveryDate ? formatDate(order.pvcDeliveryDate) : '';
    }
    case 'deadline':
      // Termin realizacji - tylko data z CSV (deadline)
      return order.deadline ? formatDate(order.deadline) : '';
    case 'akrobudDeliveryDate': {
      // Dostawa AKR - data z dostawy Akrobud (deliveryOrders)
      const akrobudDeliveryDateVal = getAkrobudDeliveryDate(order.deliveryOrders);
      return akrobudDeliveryDateVal ? formatDate(akrobudDeliveryDateVal) : '';
    }
    case 'archived':
      return order.archivedAt ? 'Archiwum' : 'Aktywne';
    default:
      return '';
  }
};

// ================================
// CSV Export helpers
// ================================

/**
 * Pobiera wartość komórki dla eksportu CSV
 */
export { formatClientName as getFormattedClientName };
