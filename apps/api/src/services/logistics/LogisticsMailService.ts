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

// Typy dla wyniku parsowania z dodatkowym kontekstem
export interface ParseResultItem extends ParsedItem {
  itemStatus: 'ok' | 'blocked' | 'waiting' | 'excluded';
  matchedOrder?: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
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

// Typy dla diff między wersjami
export interface VersionDiff {
  added: { projectNumber: string; notes?: string }[];
  removed: { projectNumber: string; notes?: string }[];
  changed: {
    projectNumber: string;
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

class LogisticsMailService {
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

    // 3. Znajdź odpowiadające Orders w bazie
    const orders = await logisticsRepository.findOrdersByProjectNumbers(allProjectNumbers);
    const orderMap = new Map(orders.map((o) => [o.orderNumber.toUpperCase(), o]));

    // 4. Wzbogać wynik o matchowane Orders i statusy
    const enrichedDeliveries: ParseResultDelivery[] = parsed.deliveries.map((delivery) => {
      const enrichedItems: ParseResultItem[] = delivery.items.map((item) => {
        const matchedOrder = orderMap.get(item.projectNumber.toUpperCase());
        const itemStatus = calculateItemStatus(item.flags);

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
      warnings.push(`projects_not_found: ${notFoundProjects.join(', ')}`);
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
   */
  async getLatestVersion(deliveryCode: string) {
    return logisticsRepository.getLatestVersionByDeliveryCode(deliveryCode);
  }

  /**
   * Pobiera wszystkie wersje dla kodu dostawy
   */
  async getAllVersions(deliveryCode: string) {
    return logisticsRepository.getAllVersionsByDeliveryCode(deliveryCode);
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
   */
  async getVersionDiff(deliveryCode: string, versionFrom: number, versionTo: number): Promise<VersionDiff> {
    const versions = await logisticsRepository.getAllVersionsByDeliveryCode(deliveryCode);

    const listFrom = versions.find((v) => v.version === versionFrom);
    const listTo = versions.find((v) => v.version === versionTo);

    if (!listFrom || !listTo) {
      throw new Error(`Nie znaleziono wersji ${versionFrom} lub ${versionTo} dla ${deliveryCode}`);
    }

    const itemsFrom = new Map(listFrom.items.map((i) => [i.projectNumber, i]));
    const itemsTo = new Map(listTo.items.map((i) => [i.projectNumber, i]));

    const added: VersionDiff['added'] = [];
    const removed: VersionDiff['removed'] = [];
    const changed: VersionDiff['changed'] = [];

    // Sprawdź dodane i zmienione
    for (const [projectNumber, itemTo] of itemsTo) {
      const itemFrom = itemsFrom.get(projectNumber);

      if (!itemFrom) {
        // Dodane
        added.push({
          projectNumber,
          notes: itemTo.rawNotes || undefined,
        });
      } else {
        // Sprawdź zmiany
        if (itemFrom.itemStatus !== itemTo.itemStatus) {
          changed.push({
            projectNumber,
            field: 'status',
            oldValue: this.statusToPolish(itemFrom.itemStatus),
            newValue: this.statusToPolish(itemTo.itemStatus),
          });
        }

        if (itemFrom.quantity !== itemTo.quantity) {
          changed.push({
            projectNumber,
            field: 'quantity',
            oldValue: itemFrom.quantity.toString(),
            newValue: itemTo.quantity.toString(),
          });
        }
      }
    }

    // Sprawdź usunięte
    for (const [projectNumber, itemFrom] of itemsFrom) {
      if (!itemsTo.has(projectNumber)) {
        removed.push({
          projectNumber,
          notes: itemFrom.rawNotes || undefined,
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
}

export const logisticsMailService = new LogisticsMailService();
