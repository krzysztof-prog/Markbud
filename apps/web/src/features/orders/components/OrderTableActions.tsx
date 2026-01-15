'use client';

/**
 * Funkcje pomocnicze dla eksportu CSV i operacji na danych tabeli zleceń
 */

import { formatDate } from '@/lib/utils';
import { formatGrosze, formatCenty, type Grosze, type Centy } from '@/lib/money';
import type { ExtendedOrder, ColumnId } from '../types';
import {
  aggregateSchucoStatus,
  getEarliestSchucoDelivery,
  formatDeliveryWeek,
  formatDateShort,
  getAkrobudDeliveryDate,
  formatClientName,
} from '../helpers/orderHelpers';

// ================================
// Eksport CSV
// ================================

/**
 * Pobiera wartość komórki dla eksportu CSV
 */
export const getCellValueForExport = (order: ExtendedOrder, columnId: ColumnId): string => {
  switch (columnId) {
    case 'orderNumber':
      return order.orderNumber || '';
    case 'client':
      return formatClientName(order.client);
    case 'project':
      return order.project || '';
    case 'system':
      return order.system || '';
    case 'documentAuthor':
      return order.documentAuthor || '';
    case 'totalWindows':
      return String(order.totalWindows || order._count?.windows || 0);
    case 'totalSashes':
      return String(order.totalSashes || 0);
    case 'glasses':
      return String(order.totalGlasses || 0);
    case 'valuePln':
      return typeof order.valuePln === 'number' ? formatGrosze(order.valuePln as Grosze) : '';
    case 'valueEur':
      return typeof order.valueEur === 'number' ? formatCenty(order.valueEur as Centy) : '';
    case 'orderStatus': {
      const schucoStatusCsv = aggregateSchucoStatus(order.schucoLinks);
      return schucoStatusCsv || order.status || '';
    }
    case 'pvcDelivery': {
      const schucoWeekCsv = getEarliestSchucoDelivery(order.schucoLinks);
      if (schucoWeekCsv) return formatDeliveryWeek(schucoWeekCsv);
      if (order.deliveryDate) {
        return formatDate(order.deliveryDate);
      }
      return order.pvcDeliveryDate ? formatDate(order.pvcDeliveryDate) : '';
    }
    case 'glassDeliveryDate': {
      const orderedCsv = order.orderedGlassCount ?? 0;
      const deliveredCsv = order.deliveredGlassCount ?? 0;
      if (orderedCsv === 0) return '';
      if (deliveredCsv >= orderedCsv) return 'Dostarczono';
      if (deliveredCsv > 0) return `Częściowo: ${deliveredCsv}/${orderedCsv}`;
      if (order.glassDeliveryDate) return formatDateShort(order.glassDeliveryDate);
      return 'Brak daty';
    }
    case 'okucDemandStatus': {
      const statusCsv = order.okucDemandStatus || 'none';
      switch (statusCsv) {
        case 'none': return '';
        case 'imported': return 'OK';
        case 'has_atypical': return 'Nietypowe';
        case 'pending': return 'Oczekuje';
        default: return statusCsv;
      }
    }
    case 'deadline': {
      const akrobudDeliveryDateCsv = getAkrobudDeliveryDate(order.deliveryOrders);
      if (akrobudDeliveryDateCsv) return formatDateShort(akrobudDeliveryDateCsv);
      return order.deadline ? formatDate(order.deadline) : '';
    }
    case 'archived':
      return order.archivedAt ? 'Archiwum' : 'Aktywne';
    default:
      return '';
  }
};
