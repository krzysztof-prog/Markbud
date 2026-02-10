/**
 * Serwis logistyki - logika biznesowa dla parsowania i zapisywania maili
 */
import {
  parseLogisticsMail,
  calculateItemStatus,
  calculateDeliveryStatus,
  ParsedMail,
  ParsedItem,
  ItemFlag,
} from './LogisticsMailParser';
import {
  logisticsRepository,
  CreateMailItemData,
} from '../../repositories/LogisticsRepository';
import { DeliveryReadinessAggregator } from '../readiness/index.js';
import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { DeliveryOrderService } from '../delivery/DeliveryOrderService.js';
import { DeliveryNumberGenerator } from '../delivery/DeliveryNumberGenerator.js';
import { prisma } from '../../index.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import {
  formatDateWarsaw,
  normalizeDateWarsaw,
  isSameDayWarsaw,
} from '../../utils/date-helpers.js';
import { emitOrderUpdated } from '../event-emitter.js';

// Typy dla wyniku parsowania z dodatkowym kontekstem
export interface ParseResultItem extends ParsedItem {
  itemStatus: 'ok' | 'blocked' | 'waiting' | 'excluded';
  matchedOrder?: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string | null;
    /** Data dostawy zlecenia - null jeśli nie ustawiona */
    deliveryDate: string | null;
  };
  orderNotFound?: boolean;
}

export interface ParseResultDelivery {
  deliveryCode: string;
  deliveryIndex: number;
  clientLabel?: string;
  items: ParseResultItem[];
  deliveryStatus: 'ready' | 'blocked' | 'conditional';
  blockedItems: { projectNumber: string; reason: string }[];
}

export interface ParseResult {
  deliveryDate: ParsedMail['deliveryDate'];
  isUpdate: boolean;
  deliveries: ParseResultDelivery[];
  warnings: string[];
}

// Typy dla zapisywania
export interface SaveMailListInput {
  deliveryDate: string; // ISO date
  deliveryIndex: number;
  deliveryCode: string;
  isUpdate: boolean;
  rawMailText: string;
  items: {
    position: number;
    projectNumber: string;
    quantity: number;
    rawNotes?: string;
    flags: ItemFlag[];
    customColor?: string;
    orderId?: number;
  }[];
}

// Typy dla diff między wersjami (rozszerzone o dane zleceń)
export interface DiffOrderInfo {
  id: number;
  orderNumber: string;
  client: string | null;
}

// Ostrzeżenie o różnicy dat zlecenia vs listy mailowej
export interface DateWarning {
  orderDeliveryDate: string;
  mailListDeliveryDate: string;
}

export interface DiffAddedItem {
  projectNumber: string;
  notes?: string;
  itemId: number;
  order?: DiffOrderInfo;
  dateWarning?: DateWarning;
}

export interface DiffRemovedItem {
  projectNumber: string;
  notes?: string;
  itemId: number;
  order?: DiffOrderInfo;
}

export interface DiffChangedItem {
  projectNumber: string;
  field: string;
  oldValue: string;
  newValue: string;
  itemId: number;
  order?: DiffOrderInfo;
  dateWarning?: DateWarning;
}

export interface VersionDiff {
  added: DiffAddedItem[];
  removed: DiffRemovedItem[];
  changed: DiffChangedItem[];
}

class LogisticsMailService {
  private readinessAggregator: DeliveryReadinessAggregator;

  constructor() {
    this.readinessAggregator = new DeliveryReadinessAggregator(prisma);
  }

  /**
   * Helper: Przelicza readiness dla dostawy powiązanej z mailList
   */
  private async recalculateReadinessForMailList(mailListId: number): Promise<void> {
    try {
      const mailList = await prisma.logisticsMailList.findUnique({
        where: { id: mailListId },
        select: { deliveryId: true },
      });

      if (mailList?.deliveryId) {
        await this.readinessAggregator.recalculateIfNeeded(mailList.deliveryId);
      }
    } catch (error) {
      logger.error('Error recalculating delivery readiness for mailList', { mailListId, error });
    }
  }

  /**
   * Helper: Przelicza readiness dla dostawy powiązanej z pozycją maila
   */
  private async recalculateReadinessForMailItem(itemId: number): Promise<void> {
    try {
      const item = await prisma.logisticsMailItem.findUnique({
        where: { id: itemId },
        select: {
          mailList: {
            select: { deliveryId: true },
          },
        },
      });

      if (item?.mailList?.deliveryId) {
        await this.readinessAggregator.recalculateIfNeeded(item.mailList.deliveryId);
      }
    } catch (error) {
      logger.error('Error recalculating delivery readiness for mailItem', { itemId, error });
    }
  }

  /**
   * Parsuje tekst maila i wzbogaca o dane z bazy (matchowanie Orders)
   */
  async parseAndEnrich(mailText: string): Promise<ParseResult> {
    // 1. Parsuj mail
    const parsed = parseLogisticsMail(mailText);

    // 2. Zbierz wszystkie numery projektów
    const allProjectNumbers = parsed.deliveries.flatMap((d) =>
      d.items.map((i) => i.projectNumber)
    );

    // 3. Znajdź odpowiadające Orders w bazie (szukamy po polu `project`)
    // UWAGA: Pole project może zawierać wiele projektów, np. "D6015, D6286, D6387"
    const orders = await logisticsRepository.findOrdersByProjectNumbers(allProjectNumbers);

    // 4. Wzbogać wynik o matchowane Orders i statusy
    // Funkcja pomocnicza - szuka zlecenia które ZAWIERA dany numer projektu
    const findMatchingOrder = (projectNumber: string) => {
      const upperProject = projectNumber.toUpperCase();
      return orders.find((o) => {
        if (!o.project) return false;
        // Sprawdź czy projekt jest częścią pola project (może być wiele projektów oddzielonych przecinkami)
        const projectUpper = o.project.toUpperCase();
        // Dopasowanie: dokładne słowo lub część listy oddzielonej przecinkami
        return (
          projectUpper === upperProject ||
          projectUpper.includes(upperProject + ',') ||
          projectUpper.includes(', ' + upperProject) ||
          projectUpper.includes(',' + upperProject) ||
          projectUpper.endsWith(', ' + upperProject) ||
          projectUpper.endsWith(',' + upperProject)
        );
      });
    };

    const enrichedDeliveries: ParseResultDelivery[] = parsed.deliveries.map((delivery) => {
      const enrichedItems: ParseResultItem[] = delivery.items.map((item) => {
        const matchedOrder = findMatchingOrder(item.projectNumber);
        const itemStatus = calculateItemStatus(item.flags);

        // Parsuj listę projektów ze zlecenia (mogą być oddzielone przecinkami)
        const orderProjects = matchedOrder?.project
          ? matchedOrder.project.split(/,\s*/).map((p) => p.trim().toUpperCase())
          : [];
        const hasMultipleProjects = orderProjects.length > 1;
        // Filtruj tylko te projekty które NIE są na aktualnej liście mailowej
        const otherProjects = hasMultipleProjects
          ? orderProjects.filter((p) => p !== item.projectNumber.toUpperCase())
          : [];

        return {
          ...item,
          itemStatus,
          matchedOrder: matchedOrder
            ? {
                id: matchedOrder.id,
                orderNumber: matchedOrder.orderNumber,
                client: matchedOrder.client,
                project: matchedOrder.project,
                status: matchedOrder.status,
                deliveryDate: matchedOrder.deliveryDate,
                // Dodatkowe info o wielu projektach w jednym zleceniu
                hasMultipleProjects,
                otherProjects, // Lista innych projektów w tym zleceniu
              }
            : undefined,
          orderNotFound: !matchedOrder,
        };
      });

      // Wylicz status dostawy
      const itemStatuses = enrichedItems.map((i) => i.itemStatus);
      const deliveryStatus = calculateDeliveryStatus(itemStatuses);

      // Zbierz blokujące pozycje
      const blockedItems = enrichedItems
        .filter((i) => i.itemStatus === 'blocked')
        .map((i) => ({
          projectNumber: i.projectNumber,
          reason: this.getBlockReason(i.flags),
        }));

      return {
        deliveryCode: delivery.deliveryCode,
        deliveryIndex: delivery.deliveryIndex,
        clientLabel: delivery.clientLabel,
        items: enrichedItems,
        deliveryStatus,
        blockedItems,
      };
    });

    // 5. Dodaj ostrzeżenia o nieznalezionych projektach
    const warnings = [...parsed.warnings];
    const notFoundProjects = enrichedDeliveries.flatMap((d) =>
      d.items.filter((i) => i.orderNotFound).map((i) => i.projectNumber)
    );

    if (notFoundProjects.length > 0) {
      warnings.push(`Projekty nieznalezione w bazie: ${notFoundProjects.join(', ')}`);
    }

    return {
      deliveryDate: parsed.deliveryDate,
      isUpdate: parsed.isUpdate,
      deliveries: enrichedDeliveries,
      warnings,
    };
  }

  /**
   * Zapisuje sparsowaną listę mailową do bazy
   */
  async saveMailList(input: SaveMailListInput) {
    // 1. Sprawdź czy istnieje już lista dla tego kodu dostawy
    const maxVersion = await logisticsRepository.getMaxVersionByDeliveryCode(
      input.deliveryCode
    );
    const newVersion = maxVersion + 1;

    // 2. Przygotuj dane pozycji
    const itemsData: Omit<CreateMailItemData, 'mailListId'>[] = input.items.map((item) => ({
      position: item.position,
      projectNumber: item.projectNumber,
      quantity: item.quantity,
      rawNotes: item.rawNotes ?? undefined,
      requiresMesh: item.flags.includes('REQUIRES_MESH'),
      missingFile: item.flags.includes('MISSING_FILE'),
      unconfirmed: item.flags.includes('UNCONFIRMED'),
      dimensionsUnconfirmed: item.flags.includes('DIMENSIONS_UNCONFIRMED'),
      drawingUnconfirmed: item.flags.includes('DRAWING_UNCONFIRMED'),
      excludeFromProduction: item.flags.includes('EXCLUDE_FROM_PRODUCTION'),
      specialHandle: item.flags.includes('SPECIAL_HANDLE'),
      customColor: item.customColor ?? undefined,
      orderId: item.orderId ?? undefined,
      itemStatus: calculateItemStatus(item.flags),
    }));

    // 3. Zapisz w transakcji
    const mailList = await logisticsRepository.createMailListWithItems(
      {
        deliveryDate: new Date(input.deliveryDate),
        deliveryIndex: input.deliveryIndex,
        deliveryCode: input.deliveryCode,
        version: newVersion,
        isUpdate: input.isUpdate,
        rawMailText: input.rawMailText,
      },
      itemsData
    );

    // 4. Auto-recalculate readiness dla powiązanej dostawy
    if (mailList) {
      await this.recalculateReadinessForMailList(mailList.id);
    }

    return mailList;
  }

  /**
   * Pobiera listę mailową po ID
   */
  async getMailListById(id: number) {
    return logisticsRepository.getMailListById(id);
  }

  /**
   * Pobiera najnowszą wersję listy dla kodu dostawy
   * Zwraca MailListWithStatus (z deliveryStatus, blockedItems i dateMismatchItems)
   */
  async getLatestVersion(deliveryCode: string) {
    const list = await logisticsRepository.getLatestVersionByDeliveryCode(deliveryCode);

    if (!list) {
      return null;
    }

    // Wylicz status dostawy i zblokowane pozycje
    const itemStatuses = list.items.map(
      (i) => i.itemStatus as 'ok' | 'blocked' | 'waiting' | 'excluded'
    );
    const deliveryStatus = calculateDeliveryStatus(itemStatuses);

    const blockedItems = list.items
      .filter((i) => i.itemStatus === 'blocked')
      .map((i) => ({
        projectNumber: i.projectNumber,
        reason: i.rawNotes || 'brak szczegółów',
      }));

    // Sprawdź niezgodność dat dostawy (Order.deliveryDate ≠ LogisticsMailList.deliveryDate)
    const dateMismatchItems = this.findDateMismatchItems(list);

    // Sprawdź brakujące daty dostawy (Order istnieje ale nie ma deliveryDate)
    const missingDeliveryDateItems = this.findMissingDeliveryDateItems(list);

    return {
      ...list,
      deliveryStatus,
      blockedItems,
      dateMismatchItems,
      hasDateMismatch: dateMismatchItems.length > 0,
      missingDeliveryDateItems,
      hasMissingDeliveryDate: missingDeliveryDateItems.length > 0,
    };
  }

  /**
   * Znajduje pozycje z niezgodnością daty dostawy
   * Format: "D1234: data 15.02 ≠ lista 12.02"
   */
  private findDateMismatchItems(list: {
    deliveryDate: Date;
    items: Array<{
      id: number;
      projectNumber: string;
      order?: {
        id: number;
        orderNumber: string;
        deliveryDate: Date | null;
      } | null;
    }>;
  }): Array<{
    itemId: number;
    projectNumber: string;
    orderId: number;
    orderNumber: string;
    orderDeliveryDate: string;
    mailListDeliveryDate: string;
    reason: string;
  }> {
    const mailListDate = this.normalizeDate(list.deliveryDate);
    const mismatches: Array<{
      itemId: number;
      projectNumber: string;
      orderId: number;
      orderNumber: string;
      orderDeliveryDate: string;
      mailListDeliveryDate: string;
      reason: string;
    }> = [];

    for (const item of list.items) {
      if (!item.order || !item.order.deliveryDate) {
        // Brak zlecenia lub brak daty dostawy - pomijamy
        continue;
      }

      const orderDate = this.normalizeDate(item.order.deliveryDate);

      if (orderDate.getTime() !== mailListDate.getTime()) {
        const orderDateStr = this.formatDateShort(item.order.deliveryDate);
        const listDateStr = this.formatDateShort(list.deliveryDate);

        mismatches.push({
          itemId: item.id,
          projectNumber: item.projectNumber,
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          orderDeliveryDate: orderDateStr,
          mailListDeliveryDate: listDateStr,
          reason: `data ${orderDateStr} ≠ lista ${listDateStr}`,
        });
      }
    }

    return mismatches;
  }

  /**
   * Znajduje pozycje gdzie zlecenie istnieje ale nie ma daty dostawy
   * Te pozycje BLOKUJĄ dostawę - użytkownik musi ustawić datę
   */
  private findMissingDeliveryDateItems(list: {
    deliveryDate: Date;
    items: Array<{
      id: number;
      projectNumber: string;
      order?: {
        id: number;
        orderNumber: string;
        deliveryDate: Date | null;
      } | null;
    }>;
  }): Array<{
    itemId: number;
    projectNumber: string;
    orderId: number;
    orderNumber: string;
    suggestedDate: string; // data z listy mailowej - do przycisku "Ustaw datę DD.MM"
    suggestedDateISO: string; // do API call
    reason: string;
  }> {
    const listDateStr = this.formatDateShort(list.deliveryDate);
    // Używamy formatDateWarsaw zamiast toISOString().split('T')[0] dla poprawnej strefy czasowej
    const listDateISO = formatDateWarsaw(list.deliveryDate);
    const missing: Array<{
      itemId: number;
      projectNumber: string;
      orderId: number;
      orderNumber: string;
      suggestedDate: string;
      suggestedDateISO: string;
      reason: string;
    }> = [];

    for (const item of list.items) {
      // Tylko pozycje z matchowanym zleceniem ale BEZ daty dostawy
      if (item.order && !item.order.deliveryDate) {
        missing.push({
          itemId: item.id,
          projectNumber: item.projectNumber,
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          suggestedDate: listDateStr,
          suggestedDateISO: listDateISO,
          reason: `Brak daty dostawy - ustaw ${listDateStr}`,
        });
      }
    }

    return missing;
  }

  /**
   * Normalizuje datę do początku dnia (00:00:00) w strefie Warsaw
   */
  private normalizeDate(date: Date): Date {
    // Używamy normalizeDateWarsaw zamiast setUTCHours dla poprawnej strefy czasowej
    return normalizeDateWarsaw(date);
  }

  /**
   * Formatuje datę do krótkiej formy: "15.02"
   */
  private formatDateShort(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }

  /**
   * Pobiera wszystkie wersje dla kodu dostawy
   * Zwraca MailListWithStatus[] (z deliveryStatus i blockedItems)
   */
  async getAllVersions(deliveryCode: string) {
    const lists = await logisticsRepository.getAllVersionsByDeliveryCode(deliveryCode);

    // Wzbogać każdą wersję o status dostawy
    return lists.map((list) => {
      const itemStatuses = list.items.map(
        (i) => i.itemStatus as 'ok' | 'blocked' | 'waiting' | 'excluded'
      );
      const deliveryStatus = calculateDeliveryStatus(itemStatuses);

      const blockedItems = list.items
        .filter((i) => i.itemStatus === 'blocked')
        .map((i) => ({
          projectNumber: i.projectNumber,
          reason: i.rawNotes || 'brak szczegółów',
        }));

      return {
        ...list,
        deliveryStatus,
        blockedItems,
      };
    });
  }

  /**
   * Pobiera kalendarz dostaw
   */
  async getDeliveryCalendar(dateFrom: Date, dateTo: Date) {
    const lists = await logisticsRepository.getDeliveryCalendar(dateFrom, dateTo);

    // Wzbogać o status dostawy
    return lists.map((list) => {
      const itemStatuses = list.items.map(
        (i) => i.itemStatus as 'ok' | 'blocked' | 'waiting' | 'excluded'
      );
      const deliveryStatus = calculateDeliveryStatus(itemStatuses);

      const blockedItems = list.items
        .filter((i) => i.itemStatus === 'blocked')
        .map((i) => ({
          projectNumber: i.projectNumber,
          reason: i.rawNotes || 'brak szczegółów',
        }));

      return {
        ...list,
        deliveryStatus,
        blockedItems,
      };
    });
  }

  /**
   * Oblicza diff między dwiema wersjami listy
   * Zwraca rozszerzone dane z informacjami o zleceniach (orderId, orderNumber, client)
   * oraz ostrzeżenia o różnicy dat (dateWarning)
   */
  async getVersionDiff(deliveryCode: string, versionFrom: number, versionTo: number): Promise<VersionDiff> {
    const versions = await logisticsRepository.getAllVersionsByDeliveryCode(deliveryCode);

    const listFrom = versions.find((v) => v.version === versionFrom);
    const listTo = versions.find((v) => v.version === versionTo);

    if (!listFrom || !listTo) {
      throw new Error(`Nie znaleziono wersji ${versionFrom} lub ${versionTo} dla ${deliveryCode}`);
    }

    // Data dostawy z listy mailowej (używamy nowszej wersji)
    const mailListDeliveryDate = listTo.deliveryDate;

    // Typ dla pozycji z załadowanym zleceniem (z deliveryDate)
    type ItemWithOrder = (typeof listFrom.items)[0];

    const itemsFrom = new Map<string, ItemWithOrder>(listFrom.items.map((i) => [i.projectNumber, i]));
    const itemsTo = new Map<string, ItemWithOrder>(listTo.items.map((i) => [i.projectNumber, i]));

    const added: DiffAddedItem[] = [];
    const removed: DiffRemovedItem[] = [];
    const changed: DiffChangedItem[] = [];

    // Helper: wyciąga dane zlecenia z pozycji
    const getOrderInfo = (item: ItemWithOrder): DiffOrderInfo | undefined => {
      if (!item.order) return undefined;
      return {
        id: item.order.id,
        orderNumber: item.order.orderNumber,
        client: item.order.client,
      };
    };

    // Helper: sprawdza czy data zlecenia różni się od daty listy mailowej
    const getDateWarning = (item: ItemWithOrder): DateWarning | undefined => {
      if (!item.order?.deliveryDate) return undefined;

      // Używamy formatDateWarsaw dla poprawnej strefy czasowej
      const orderDateStr = formatDateWarsaw(item.order.deliveryDate);
      const mailDateStr = formatDateWarsaw(mailListDeliveryDate);

      // Porównujemy daty w strefie Warsaw
      if (!isSameDayWarsaw(item.order.deliveryDate, mailListDeliveryDate)) {
        return {
          orderDeliveryDate: orderDateStr,
          mailListDeliveryDate: mailDateStr,
        };
      }

      return undefined;
    };

    // Sprawdź dodane i zmienione
    for (const [projectNumber, itemTo] of itemsTo) {
      const itemFrom = itemsFrom.get(projectNumber);

      if (!itemFrom) {
        // Dodane - pozycja jest w nowej wersji, ale nie w starej
        added.push({
          projectNumber,
          notes: itemTo.rawNotes || undefined,
          itemId: itemTo.id,
          order: getOrderInfo(itemTo),
          dateWarning: getDateWarning(itemTo),
        });
      } else {
        // Sprawdź zmiany
        if (itemFrom.itemStatus !== itemTo.itemStatus) {
          changed.push({
            projectNumber,
            field: 'status',
            oldValue: this.statusToPolish(itemFrom.itemStatus),
            newValue: this.statusToPolish(itemTo.itemStatus),
            itemId: itemTo.id,
            order: getOrderInfo(itemTo),
            dateWarning: getDateWarning(itemTo),
          });
        }

        if (itemFrom.quantity !== itemTo.quantity) {
          changed.push({
            projectNumber,
            field: 'quantity',
            oldValue: itemFrom.quantity.toString(),
            newValue: itemTo.quantity.toString(),
            itemId: itemTo.id,
            order: getOrderInfo(itemTo),
            dateWarning: getDateWarning(itemTo),
          });
        }
      }
    }

    // Sprawdź usunięte - pozycje są w starej wersji, ale nie w nowej
    for (const [projectNumber, itemFrom] of itemsFrom) {
      if (!itemsTo.has(projectNumber)) {
        removed.push({
          projectNumber,
          notes: itemFrom.rawNotes || undefined,
          itemId: itemFrom.id,
          order: getOrderInfo(itemFrom),
        });
      }
    }

    return { added, removed, changed };
  }

  /**
   * Soft delete listy mailowej
   */
  async deleteMailList(id: number) {
    return logisticsRepository.softDeleteMailList(id);
  }

  /**
   * Aktualizuje pozycję (np. ręczne przypisanie Order)
   */
  async updateItem(
    id: number,
    data: {
      orderId?: number | null;
      flags?: ItemFlag[];
    }
  ) {
    const updateData: Parameters<typeof logisticsRepository.updateMailItem>[1] = {};

    if (data.orderId !== undefined) {
      updateData.orderId = data.orderId;
    }

    if (data.flags) {
      updateData.requiresMesh = data.flags.includes('REQUIRES_MESH');
      updateData.missingFile = data.flags.includes('MISSING_FILE');
      updateData.unconfirmed = data.flags.includes('UNCONFIRMED');
      updateData.dimensionsUnconfirmed = data.flags.includes('DIMENSIONS_UNCONFIRMED');
      updateData.drawingUnconfirmed = data.flags.includes('DRAWING_UNCONFIRMED');
      updateData.excludeFromProduction = data.flags.includes('EXCLUDE_FROM_PRODUCTION');
      updateData.specialHandle = data.flags.includes('SPECIAL_HANDLE');
      updateData.itemStatus = calculateItemStatus(data.flags);
    }

    return logisticsRepository.updateMailItem(id, updateData);
  }

  // ========== AKCJE NA POZYCJACH (dla systemu decyzji diff) ==========

  /**
   * Usuwa pozycję z dostawy (soft delete)
   * Używane gdy pozycja została usunięta z maila i użytkownik potwierdza usunięcie
   */
  async removeItemFromDelivery(itemId: number, userId: number) {
    // Pobierz dane pozycji przed usunięciem (dla logowania)
    const item = await logisticsRepository.getMailItemById(itemId);

    const result = await logisticsRepository.softDeleteMailItem(itemId);

    // Loguj decyzję
    await logisticsRepository.createDecisionLog({
      entityType: 'item',
      entityId: itemId,
      action: 'remove',
      userId,
      mailItemId: itemId,
      metadata: item ? { projectNumber: item.projectNumber } : undefined,
    });

    return result;
  }

  /**
   * Odrzuca dodaną pozycję (soft delete)
   * Używane gdy nowa pozycja została dodana w mailu, ale użytkownik ją odrzuca
   */
  async rejectAddedItem(itemId: number, userId: number) {
    // Pobierz dane pozycji przed odrzuceniem (dla logowania)
    const item = await logisticsRepository.getMailItemById(itemId);

    const result = await logisticsRepository.softDeleteMailItem(itemId);

    // Loguj decyzję
    await logisticsRepository.createDecisionLog({
      entityType: 'item',
      entityId: itemId,
      action: 'reject',
      userId,
      mailItemId: itemId,
      metadata: item ? { projectNumber: item.projectNumber } : undefined,
    });

    return result;
  }

  /**
   * Potwierdza dodaną pozycję (oznacza jako zatwierdzoną)
   * Używane gdy nowa pozycja została dodana w mailu i użytkownik ją akceptuje
   */
  async confirmAddedItem(itemId: number, userId: number) {
    // Pobierz dane pozycji (dla logowania)
    const item = await logisticsRepository.getMailItemById(itemId);

    const result = await logisticsRepository.markItemAsConfirmed(itemId);

    // Loguj decyzję
    await logisticsRepository.createDecisionLog({
      entityType: 'item',
      entityId: itemId,
      action: 'confirm',
      userId,
      mailItemId: itemId,
      metadata: item ? { projectNumber: item.projectNumber } : undefined,
    });

    // Auto-recalculate readiness dla powiązanej dostawy
    await this.recalculateReadinessForMailItem(itemId);

    return result;
  }

  /**
   * Przywraca poprzednią wartość pozycji
   * Używane gdy pozycja została zmieniona, ale użytkownik chce przywrócić starą wartość
   */
  async restoreItemValue(
    itemId: number,
    field: string,
    previousValue: string,
    userId: number
  ) {
    // Pobierz dane pozycji (dla logowania)
    const item = await logisticsRepository.getMailItemById(itemId);
    const updateData: Parameters<typeof logisticsRepository.updateMailItem>[1] = {};

    let result;

    switch (field) {
      case 'quantity':
        updateData.itemStatus = undefined; // Nie zmieniamy statusu przy zmianie ilości
        // Musimy zaktualizować quantity - ale to wymaga dodatkowej metody w repo
        result = await logisticsRepository.updateMailItemQuantity(itemId, parseInt(previousValue, 10));
        break;

      case 'status':
        // Przywracamy poprzedni status
        const statusMap: Record<string, string> = {
          'OK': 'ok',
          'BLOKUJE': 'blocked',
          'OCZEKUJE': 'waiting',
          'WYŁĄCZONE': 'excluded',
        };
        updateData.itemStatus = statusMap[previousValue] || previousValue;
        result = await logisticsRepository.updateMailItem(itemId, updateData);
        break;

      default:
        throw new Error(`Nieznane pole do przywrócenia: ${field}`);
    }

    // Loguj decyzję z metadata o przywróconej wartości
    await logisticsRepository.createDecisionLog({
      entityType: 'item',
      entityId: itemId,
      action: 'restore',
      userId,
      mailItemId: itemId,
      metadata: {
        projectNumber: item?.projectNumber,
        field,
        previousValue,
      },
    });

    return result;
  }

  /**
   * Akceptuje zmianę pozycji (oznacza jako zatwierdzoną)
   * Używane gdy pozycja została zmieniona i użytkownik akceptuje nową wartość
   */
  async acceptItemChange(itemId: number, userId: number) {
    // Pobierz dane pozycji (dla logowania)
    const item = await logisticsRepository.getMailItemById(itemId);

    const result = await logisticsRepository.markItemAsConfirmed(itemId);

    // Loguj decyzję
    await logisticsRepository.createDecisionLog({
      entityType: 'item',
      entityId: itemId,
      action: 'accept_change',
      userId,
      mailItemId: itemId,
      metadata: item ? { projectNumber: item.projectNumber } : undefined,
    });

    // Auto-recalculate readiness dla powiązanej dostawy
    await this.recalculateReadinessForMailItem(itemId);

    return result;
  }

  // Helper: tłumaczenie powodu blokady
  private getBlockReason(flags: ItemFlag[]): string {
    const reasons: string[] = [];

    if (flags.includes('MISSING_FILE')) reasons.push('brak pliku');
    if (flags.includes('UNCONFIRMED')) reasons.push('niepotwierdzone');
    if (flags.includes('DIMENSIONS_UNCONFIRMED')) reasons.push('wymiary niepotwierdzone');
    if (flags.includes('DRAWING_UNCONFIRMED')) reasons.push('rysunek niepotwierdzony');

    return reasons.join(' / ') || 'nieznany powód';
  }

  // Helper: tłumaczenie statusu na polski
  private statusToPolish(status: string): string {
    const map: Record<string, string> = {
      ok: 'OK',
      blocked: 'BLOKUJE',
      waiting: 'OCZEKUJE',
      excluded: 'WYŁĄCZONE',
    };
    return map[status] || status;
  }

  // ========== USTAWIANIE DATY DOSTAWY ==========

  /**
   * Ustawia datę dostawy dla zlecenia i dodaje je do odpowiedniej dostawy
   *
   * Używane gdy:
   * - Zlecenie jest dopasowane do pozycji na liście mailowej
   * - Ale nie ma ustawionej daty dostawy (Order.deliveryDate = null)
   *
   * Co robi:
   * 1. Parsuje deliveryCode aby wyciągnąć datę i index dostawy
   * 2. Aktualizuje Order.deliveryDate
   * 3. Znajduje właściwą Delivery (po indeksie _I, _II) lub tworzy nową
   * 4. Dodaje zlecenie do tej dostawy
   *
   * @param orderId ID zlecenia
   * @param deliveryCode Kod dostawy np. "08.01.2026_II" - zawiera datę i index
   * @returns Informacje o zaktualizowanym zleceniu i dostawie
   */
  async setOrderDeliveryDate(
    orderId: number,
    deliveryCode: string
  ): Promise<{
    orderId: number;
    orderNumber: string;
    deliveryDate: string;
    delivery: {
      id: number;
      deliveryNumber: string;
      isNew: boolean;
    };
  }> {
    // 1. Pobierz zlecenie i sprawdź czy istnieje
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        deliveryDate: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Zlecenie o ID ${orderId}`);
    }

    // 2. Parsuj deliveryCode na datę i index
    const { date: deliveryDate, index: deliveryIndex } = this.parseDeliveryCode(deliveryCode);

    logger.info(`[LogisticsMailService] Setting delivery date for order ${order.orderNumber}`, {
      orderId,
      deliveryCode,
      deliveryDate: deliveryDate.toISOString(),
      deliveryIndex,
    });

    // 3. Znajdź LogisticsMailList po deliveryCode (aby znaleźć powiązaną Delivery)
    const mailList = await prisma.logisticsMailList.findFirst({
      where: {
        deliveryCode,
        deletedAt: null,
      },
      orderBy: {
        version: 'desc', // Najnowsza wersja
      },
      select: {
        id: true,
        deliveryId: true,
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            deletedAt: true,
          },
        },
      },
    });

    // 4. Znajdź lub utwórz dostawę
    const deliveryRepo = new DeliveryRepository(prisma);
    const deliveryOrderService = new DeliveryOrderService(deliveryRepo, prisma);
    const numberGenerator = new DeliveryNumberGenerator(prisma);

    let delivery: { id: number; deliveryNumber: string | null };
    let isNewDelivery = false;

    if (mailList?.delivery && !mailList.delivery.deletedAt) {
      // Użyj dostawy powiązanej z listą mailową
      delivery = mailList.delivery;
      logger.info(`[LogisticsMailService] Found delivery linked to mail list`, {
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        mailListId: mailList.id,
      });
    } else {
      // Szukaj dostawy na ten dzień z odpowiednim indeksem
      const startOfDay = new Date(deliveryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Pobierz wszystkie dostawy na ten dzień i wybierz odpowiednią po indeksie
      const existingDeliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc', // Najstarsza najpierw = index 1
        },
      });

      // Index 1 = pierwsza dostawa (_I), index 2 = druga (_II), itd.
      if (existingDeliveries.length >= deliveryIndex) {
        delivery = existingDeliveries[deliveryIndex - 1];
        logger.info(`[LogisticsMailService] Found existing delivery by index`, {
          deliveryId: delivery.id,
          deliveryNumber: delivery.deliveryNumber,
          deliveryIndex,
        });
      } else {
        // Utwórz nową dostawę
        const deliveryNumber = await numberGenerator.generateDeliveryNumber(deliveryDate);
        const newDelivery = await deliveryRepo.create({
          deliveryDate,
          deliveryNumber,
        });
        delivery = newDelivery;
        isNewDelivery = true;
        logger.info(`[LogisticsMailService] Created new delivery for index`, {
          deliveryId: delivery.id,
          deliveryNumber: delivery.deliveryNumber,
          deliveryIndex,
        });
      }

      // Połącz mailList z delivery jeśli istnieje i nie jest powiązana
      if (mailList && !mailList.deliveryId) {
        await prisma.logisticsMailList.update({
          where: { id: mailList.id },
          data: { deliveryId: delivery.id },
        });
        logger.info(`[LogisticsMailService] Linked mail list to delivery`, {
          mailListId: mailList.id,
          deliveryId: delivery.id,
        });
      }
    }

    // 5. Aktualizuj datę dostawy w zleceniu
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryDate },
    });

    // Emit realtime update
    emitOrderUpdated({ id: orderId });

    // 6. Dodaj zlecenie do dostawy (jeśli jeszcze nie jest przypisane)
    const existingAssignment = await prisma.deliveryOrder.findFirst({
      where: {
        orderId,
        deliveryId: delivery.id,
      },
    });

    if (!existingAssignment) {
      await deliveryOrderService.addOrderToDelivery(
        delivery.id,
        orderId,
        delivery.deliveryNumber ?? undefined
      );
      logger.info(`[LogisticsMailService] Added order to delivery`, {
        orderId,
        deliveryId: delivery.id,
      });
    }

    // 7. Przelicz readiness dla dostawy
    const readinessAggregator = new DeliveryReadinessAggregator(prisma);
    await readinessAggregator.calculateAndPersist(delivery.id);

    logger.info(`[LogisticsMailService] Successfully set delivery date for order`, {
      orderId,
      orderNumber: order.orderNumber,
      deliveryCode,
      deliveryDate: deliveryDate.toISOString(),
      deliveryId: delivery.id,
      isNewDelivery,
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
      deliveryDate: formatDateWarsaw(deliveryDate),
      delivery: {
        id: delivery.id,
        deliveryNumber: delivery.deliveryNumber ?? '',
        isNew: isNewDelivery,
      },
    };
  }

  // ========== ORPHAN ORDERS ==========

  /**
   * Pobiera zlecenia przypisane do dostawy ale nieobecne na liście mailowej
   *
   * "Orphan orders" to zlecenia które:
   * 1. Mają ustawioną datę dostawy (Order.deliveryDate) pasującą do daty z deliveryCode
   * 2. NIE są powiązane z żadną pozycją na liście mailowej dla tego deliveryCode
   *
   * Używane do wykrywania zleceń które zostały ręcznie dodane do dostawy
   * lub których pozycje zostały usunięte z maila.
   *
   * @param deliveryCode Kod dostawy np. "08.01.2026_II"
   * @returns Lista "orphan orders" z podstawowymi danymi
   */
  async getOrphanOrders(deliveryCode: string): Promise<{
    orders: {
      id: number;
      orderNumber: string;
      client: string | null;
      project: string | null;
      status: string | null;
      deliveryDate: string;
    }[];
    totalCount: number;
  }> {
    // 1. Parsuj deliveryCode aby wyciągnąć datę
    const { date: deliveryDate } = this.parseDeliveryCode(deliveryCode);

    // Normalizuj datę do początku dnia
    const startOfDay = new Date(deliveryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(deliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Pobierz najnowszą wersję listy mailowej dla tego deliveryCode
    const mailList = await logisticsRepository.getLatestVersionByDeliveryCode(deliveryCode);

    // 3. Pobierz wszystkie orderId które SĄ na liście mailowej
    const linkedOrderIds: number[] = [];
    if (mailList?.items) {
      for (const item of mailList.items) {
        if (item.orderId !== null) {
          linkedOrderIds.push(item.orderId);
        }
      }
    }

    // 4. Pobierz zlecenia z pasującą datą dostawy ale NIE na liście
    const orphanOrders = await prisma.order.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        id: {
          notIn: linkedOrderIds.length > 0 ? linkedOrderIds : [-1], // SQLite nie lubi pustych IN
        },
        archivedAt: null, // Nie pokazuj zarchiwizowanych
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        status: true,
        deliveryDate: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    logger.debug(`[LogisticsMailService] Found orphan orders for ${deliveryCode}`, {
      deliveryCode,
      deliveryDate: deliveryDate.toISOString(),
      linkedOrderIds: linkedOrderIds.length,
      orphanCount: orphanOrders.length,
    });

    return {
      orders: orphanOrders.map(order => ({
        ...order,
        deliveryDate: formatDateWarsaw(order.deliveryDate!),
      })),
      totalCount: orphanOrders.length,
    };
  }

  /**
   * Usuwa zlecenie z dostawy (czyści datę dostawy)
   *
   * Używane gdy zlecenie jest na dostawie ale użytkownik chce je usunąć
   * (np. zostało błędnie przypisane lub usunięte z maila).
   *
   * @param orderId ID zlecenia do usunięcia z dostawy
   * @returns Zaktualizowane zlecenie
   */
  async removeOrderFromDelivery(orderId: number): Promise<{
    orderId: number;
    orderNumber: string;
  }> {
    // 1. Pobierz zlecenie
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, deliveryDate: true },
    });

    if (!order) {
      throw new NotFoundError(`Zlecenie o ID ${orderId}`);
    }

    if (!order.deliveryDate) {
      throw new ValidationError(`Zlecenie ${order.orderNumber} nie ma ustawionej daty dostawy`);
    }

    // 2. Wyczyść datę dostawy
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryDate: null },
    });

    // Emit realtime update
    emitOrderUpdated({ id: orderId });

    // 3. Usuń z DeliveryOrder (jeśli jest przypisane)
    await prisma.deliveryOrder.deleteMany({
      where: { orderId },
    });

    logger.info(`[LogisticsMailService] Removed order from delivery`, {
      orderId,
      orderNumber: order.orderNumber,
      previousDeliveryDate: order.deliveryDate,
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Parsuje deliveryCode na datę i index
   * np. "08.01.2026_II" → { date: Date(2026-01-08), index: 2 }
   */
  private parseDeliveryCode(deliveryCode: string): { date: Date; index: number } {
    // Format: "DD.MM.YYYY_I" lub "DD.MM.YYYY_II" itd.
    const match = deliveryCode.match(/^(\d{2})\.(\d{2})\.(\d{4})_([IVX]+)$/);
    if (!match) {
      throw new ValidationError(`Nieprawidłowy format kodu dostawy: ${deliveryCode}`);
    }

    const [, day, month, year, romanIndex] = match;
    const date = new Date(`${year}-${month}-${day}T12:00:00`);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Nieprawidłowa data w kodzie dostawy: ${deliveryCode}`);
    }

    // Konwersja cyfr rzymskich na arabskie (obsługujemy I-X)
    const romanToArabic: Record<string, number> = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
      'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    };
    const index = romanToArabic[romanIndex];
    if (!index) {
      throw new ValidationError(`Nieprawidłowy index dostawy: ${romanIndex}`);
    }

    return { date, index };
  }
}

export const logisticsMailService = new LogisticsMailService();
