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
 * Skraca długie nazwy statusów dla lepszej czytelności
 */
export const aggregateSchucoStatus = (links: SchucoDeliveryLink[] | undefined): string => {
  if (!links || links.length === 0) return '';

  const statuses = links.map(l => l.schucoDelivery.shippingStatus.toLowerCase());

  // Priorytet: otwarte/new (najgorszy) > częściowo > wysłane > potwierdzone > dostarczone (najlepszy)
  if (statuses.some(s => s === 'new' || s === 'nowe')) return 'new';
  if (statuses.some(s => s.includes('otwart') || s.includes('w realizacji'))) return 'Otwarte';
  if (statuses.some(s => s.includes('częściowo'))) return 'Częściowo';
  if (statuses.some(s => s.includes('wysłan') || s.includes('wyslan') || s.includes('w drodze'))) return 'Wysłane';
  if (statuses.some(s => s.includes('potwierdzon'))) return 'Potwierdzone';
  if (statuses.some(s => s.includes('całkowicie dostarczon'))) return 'Dostarczone';
  if (statuses.some(s => s.includes('dostarcz'))) return 'Dostarczone';
  if (statuses.some(s => s.includes('anulowa'))) return 'Anulowane';

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
 * Statusy z systemu Schuco:
 * - Całkowicie dostarczone / Dostarczone - zielony
 * - Potwierdzone - niebieski
 * - Wysłane / W drodze - fioletowy
 * - Częściowo dostarczono - pomarańczowy
 * - Otwarte / W realizacji / Nowe - żółty
 * - Anulowane - czerwony
 * - new (niezweryfikowane) - szary
 */
export const getSchucoStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase();

  // Dostarczone - zielony
  if (lowerStatus.includes('całkowicie dostarczon') || lowerStatus === 'dostarczone') {
    return 'bg-green-100 text-green-700';
  }

  // Potwierdzone - niebieski (zmiana z "Potwierdzona dostawa" na "Potwierdzone")
  if (lowerStatus.includes('potwierdzon')) {
    return 'bg-blue-100 text-blue-700';
  }

  // Wysłane / W drodze - fioletowy
  if (lowerStatus.includes('wysłan') || lowerStatus.includes('wyslan') || lowerStatus.includes('w drodze')) {
    return 'bg-purple-100 text-purple-700';
  }

  // Częściowo dostarczono - pomarańczowy
  if (lowerStatus.includes('częściowo')) {
    return 'bg-orange-100 text-orange-700';
  }

  // Otwarte / W realizacji - żółty
  if (lowerStatus.includes('otwart') || lowerStatus.includes('w realizacji')) {
    return 'bg-yellow-100 text-yellow-700';
  }

  // Anulowane - czerwony
  if (lowerStatus.includes('anulowa')) {
    return 'bg-red-100 text-red-700';
  }

  // new (nowe zamówienie, niezweryfikowane) - szary
  if (lowerStatus === 'new' || lowerStatus === 'nowe' || lowerStatus === 'nowy') {
    return 'bg-slate-200 text-slate-600';
  }

  // Default - szary
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
 * - Maksymalna długość: 15 znaków (z "..." jeśli obcięte)
 */
export const formatClientName = (client: string | null | undefined, maxLength = 15): string => {
  if (!client) return '';

  let result: string;

  // Skróć AKROBUD do samej nazwy firmy
  if (client.toUpperCase().includes('AKROBUD')) {
    result = 'AKROBUD';
  } else {
    // Sprawdź czy to firma (zawiera sufiks firmowy w dowolnym miejscu)
    // e.K. = eingetragener Kaufmann (niemiecki skrót dla jednoosobowej działalności)
    const hasCompanySuffix = /(SP\.?|SPÓŁKA|S\.A\.|LTD|LLC|GMBH|FIRMA|COMPANY|CO\.|INC|CORP|O\.O\.|Z\s+O\.O\.|e\.?\s?K\.)/i.test(
      client
    );

    // Jeśli to firma, użyj pełnej nazwy
    if (hasCompanySuffix) {
      result = client;
    } else {
      // Dla klientów z imieniem i nazwiskiem - zwróć tylko ostatnie słowo (nazwisko)
      const words = client.trim().split(/\s+/);
      if (words.length >= 2) {
        result = words[words.length - 1]; // Zwróć samo nazwisko
      } else {
        // Pojedyncze słowo - zwróć je
        result = client;
      }
    }
  }

  // Skróć do maksymalnej długości
  if (result.length > maxLength) {
    return result.substring(0, maxLength - 3) + '...';
  }

  return result;
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
      // Używamy orderedGlassCount (zamówione szyby u dostawcy) zamiast totalGlasses (stara wartość z importu)
      return String(order.orderedGlassCount || 0);
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
        case 'no_okuc': return 'Bez okuć';
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
// Missing order numbers helpers
// ================================

/**
 * Parsuje numer zlecenia na liczbę
 * Obsługuje formaty: "53255", "2024/0001", itp.
 */
export const parseOrderNumber = (orderNumber: string | null | undefined): number | null => {
  if (!orderNumber) return null;

  // Wyciągnij tylko cyfry z numeru
  const numericPart = orderNumber.replace(/\D/g, '');
  if (!numericPart) return null;

  return parseInt(numericPart, 10);
};

/**
 * Znajduje brakujące numery zleceń w sekwencji
 * @param orders - lista zleceń
 * @returns lista brakujących numerów jako stringi
 */
export const findMissingOrderNumbers = (orders: { orderNumber?: string | null }[]): string[] => {
  // Zbierz wszystkie numery i parsuj do liczb
  const numbers = orders
    .map(o => parseOrderNumber(o.orderNumber))
    .filter((n): n is number => n !== null);

  if (numbers.length < 2) return [];

  // Posortuj rosnąco
  const sorted = [...numbers].sort((a, b) => a - b);

  const missing: string[] = [];

  // Znajdź luki między kolejnymi numerami
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Jeśli różnica > 1, mamy lukę
    for (let num = current + 1; num < next; num++) {
      missing.push(String(num));
    }
  }

  return missing;
};

// ================================
// CSV Export helpers
// ================================

/**
 * Pobiera wartość komórki dla eksportu CSV
 */
export { formatClientName as getFormattedClientName };
