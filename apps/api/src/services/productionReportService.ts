/**
 * Production Report Service - Logika biznesowa raportów produkcyjnych
 *
 * Serwis zarządza miesięcznymi raportami produkcji:
 * - Pobieranie i obliczanie raportów z override'ami
 * - Aktualizacja pozycji (z kontrolą statusu miesiąca)
 * - Zamykanie/otwieranie miesięcy
 * - Obliczanie sum według typów klientów (TYPOWE, AKROBUD, RESZTA)
 *
 * UWAGA: Wartości pieniężne przechowywane są w groszach (Int).
 * Konwersja na PLN następuje przy zwracaniu danych.
 */

import { productionReportRepository, ProductionReportRepository } from '../repositories/ProductionReportRepository.js';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

// ============================================================================
// TYPY
// ============================================================================

/** Pojedyncza pozycja raportu z obliczonymi wartościami */
export interface ReportItem {
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  productionDate: Date;
  completedAt: Date | null;

  // Data dostawy (z relacji DeliveryOrder -> Delivery)
  deliveryDate: Date | null;
  deliveryId: number | null;

  // Wartości wyświetlane (override lub z Order)
  windows: number;
  units: number;
  sashes: number;
  valuePln: number; // w PLN (nie groszach!)
  valueEur: number | null; // w EUR (nie centach!) - może być override
  originalValueEur: number | null; // w EUR - oryginalna wartość z Order (dla porównania)

  // Czy wartość pochodzi z override
  hasOverride: boolean;

  // Checkboxy RW
  rwOkucia: boolean;
  rwProfile: boolean;

  // Dane FV
  invoiceNumber: string | null;
  invoiceDate: Date | null;

  // Obliczona średnia jednostka (valuePln / units)
  avgUnitValue: string; // formatowana wartość lub '—'

  // Nowe kolumny dla zestawienia miesięcznego
  materialValue: number; // wartość materiału w PLN
  coefficient: string; // współczynnik PLN/materiał (formatowany lub '—')
  unitValue: string; // jednostka (PLN - materiał) / szkła (formatowany lub '—')
  totalGlassQuantity: number; // suma ilości szkła z materiałówki
}

/** Podsumowanie raportu */
export interface ReportSummary {
  // Sumy TYPOWE (wszystkie zlecenia)
  typowe: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  };

  // Sumy AKROBUD (gdzie client zawiera 'AKROBUD')
  akrobud: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  };

  // RESZTA = TYPOWE - AKROBUD
  reszta: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  };

  // NIETYPÓWKI (globalna korekta)
  atypical: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
    notes: string | null;
  };

  // RAZEM = TYPOWE + NIETYPÓWKI
  razem: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  };

  // Statystyki
  workingDays: number;
  avgUnitsPerDay: string; // sformatowane lub '—'
}

/** Dane do aktualizacji pozycji */
export interface UpdateReportItemData {
  overrideWindows?: number | null;
  overrideUnits?: number | null;
  overrideSashes?: number | null;
  overrideValuePln?: number | null; // w groszach!
  overrideValueEur?: number | null; // w centach!
  rwOkucia?: boolean;
  rwProfile?: boolean;
}

/** Dane do aktualizacji nietypówek */
export interface UpdateAtypicalData {
  atypicalWindows?: number;
  atypicalUnits?: number;
  atypicalSashes?: number;
  atypicalValuePln?: number; // w groszach!
  atypicalNotes?: string | null;
}

/** Pełny raport z pozycjami i metadanymi */
export interface FullReport {
  year: number;
  month: number;
  status: 'open' | 'closed';
  closedAt: Date | null;
  editedAfterClose: boolean;
  items: ReportItem[];
  summary: ReportSummary;
}

// ============================================================================
// SERWIS
// ============================================================================

export class ProductionReportService {
  constructor(private repository: ProductionReportRepository) {}

  /**
   * Pobierz raport dla miesiąca z obliczonymi wartościami
   *
   * Dla każdego zlecenia:
   * - Użyj override jeśli istnieje, inaczej wartość z Order
   * - Oblicz średnią jednostkę (valuePln / units)
   */
  async getReport(year: number, month: number): Promise<FullReport> {
    // Walidacja parametrów
    this.validateYearMonth(year, month);

    // Pobierz lub utwórz raport (z pozycjami)
    const report = await this.repository.findOrCreate(year, month);

    // Pobierz zlecenia zakończone w tym miesiącu
    const orders = await this.repository.getCompletedOrdersForMonth(year, month);

    // Mapuj istniejące pozycje raportu (z override'ami) po orderId
    const itemsByOrderId = new Map(
      (report.items || []).map((item) => [item.orderId, item])
    );

    // Połącz dane z Order i override'ami
    const items: ReportItem[] = orders.map((order) => {
      const override = itemsByOrderId.get(order.id);

      // Użyj override jeśli istnieje, inaczej wartość z Order
      const windows = override?.overrideWindows ?? order.totalWindows ?? 0;
      const units = this.calculateUnits(order);
      const sashes = override?.overrideSashes ?? order.totalSashes ?? 0;

      // Wartość w groszach - konwersja na PLN
      // Dla AKROBUD: valuePln (z PDF, przeliczone przez użytkownika)
      // Dla innych: windowsNetValue (z CSV materiałówki) jako fallback
      const isAkrobud = (order.client ?? '').toUpperCase().includes('AKROBUD');
      const valueGrosze = override?.overrideValuePln
        ?? order.valuePln
        ?? (isAkrobud ? 0 : (order.windowsNetValue ?? 0));
      const valuePln = groszeToPln(valueGrosze as Grosze);

      // Wartość EUR w centach - konwersja na EUR (używaj override jeśli istnieje)
      const valueEurCenty = override?.overrideValueEur ?? order.valueEur ?? null;
      const valueEur = valueEurCenty !== null ? centyToEur(valueEurCenty as Centy) : null;

      // Czy ma override
      const hasOverride = !!(
        override?.overrideWindows !== null ||
        override?.overrideUnits !== null ||
        override?.overrideSashes !== null ||
        override?.overrideValuePln !== null ||
        override?.overrideValueEur !== null
      );

      // Średnia jednostka
      const avgUnitValue = units > 0 ? (valuePln / units).toFixed(2) : '—';

      // Oryginalna wartość EUR z Order (w centach -> EUR)
      const originalValueEur = order.valueEur !== null ? centyToEur(order.valueEur as Centy) : null;

      // Wyciągnij dane dostawy z relacji (jeśli istnieje)
      const deliveryData = order.deliveryOrders?.[0]?.delivery ?? null;
      const deliveryDate = deliveryData?.deliveryDate ?? null;
      const deliveryId = deliveryData?.id ?? null;

      // === NOWE KOLUMNY ===
      // Wartość materiału w PLN (z groszy)
      const materialValueGrosze = order.windowsMaterial ?? 0;
      const materialValue = groszeToPln(materialValueGrosze as Grosze);

      // Suma ilości szkła z materiałówki
      const totalGlassQuantity = (order.materials ?? []).reduce(
        (sum, m) => sum + (m.glassQuantity ?? 0),
        0
      );

      // Współczynnik = PLN / materiał (2 miejsca po przecinku)
      const coefficient = materialValue > 0
        ? (valuePln / materialValue).toFixed(2)
        : '—';

      // Jednostka = (PLN - materiał) / szkła (liczby całkowite)
      const unitValue = totalGlassQuantity > 0
        ? Math.round((valuePln - materialValue) / totalGlassQuantity).toString()
        : '—';

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        client: order.client,
        project: order.project,
        productionDate: order.productionDate!,
        completedAt: order.completedAt,
        deliveryDate,
        deliveryId,
        windows,
        units: override?.overrideUnits ?? units,
        sashes,
        valuePln,
        valueEur,
        originalValueEur, // Dla porównania czy jest override
        hasOverride,
        rwOkucia: override?.rwOkucia ?? false,
        rwProfile: override?.rwProfile ?? false,
        invoiceNumber: override?.invoiceNumber ?? order.invoiceNumber,
        invoiceDate: override?.invoiceDate ?? null,
        avgUnitValue,
        // Nowe kolumny
        materialValue,
        coefficient,
        unitValue,
        totalGlassQuantity,
      };
    });

    // Oblicz podsumowanie
    const summary = await this.calculateSummary(items, report, year, month);

    return {
      year,
      month,
      status: report.status as 'open' | 'closed',
      closedAt: report.closedAt,
      editedAfterClose: report.editedAfterClose,
      items,
      summary,
    };
  }

  /**
   * Aktualizuj pozycję raportu (override wartości zlecenia)
   *
   * Sprawdza czy miesiąc jest otwarty.
   * Wyjątek: checkboxy RW można zmieniać nawet gdy zamknięty.
   */
  async updateReportItem(
    year: number,
    month: number,
    orderId: number,
    data: UpdateReportItemData
  ): Promise<void> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findByYearMonth(year, month);
    if (!report) {
      throw new NotFoundError('ProductionReport');
    }

    // Sprawdź czy miesiąc jest otwarty
    // Wyjątek: checkboxy RW można zmieniać nawet gdy zamknięty
    const isOnlyRwChange = this.isOnlyRwChange(data);

    if (report.status === 'closed' && !isOnlyRwChange) {
      throw new ConflictError(
        'Miesiąc jest zamknięty. Aby edytować wartości, najpierw odblokuj miesiąc.',
        { code: 'MONTH_CLOSED' }
      );
    }

    // Upsert pozycji raportu
    await this.repository.upsertReportItem(report.id, orderId, data);
  }

  /**
   * Aktualizuj dane FV (faktura) dla pozycji
   *
   * Dostępne nawet gdy miesiąc jest zamknięty!
   * (Księgowa musi móc dodać nr faktury po zamknięciu)
   */
  async updateInvoice(
    year: number,
    month: number,
    orderId: number,
    invoiceNumber: string | null,
    invoiceDate: Date | null
  ): Promise<void> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findByYearMonth(year, month);
    if (!report) {
      throw new NotFoundError('ProductionReport');
    }

    // Użyj dedykowanej metody updateInvoice (nie sprawdzamy statusu miesiąca!)
    await this.repository.updateInvoice(report.id, orderId, invoiceNumber, invoiceDate);
  }

  /**
   * Aktualizuj nietypówki (globalna korekta dla miesiąca)
   *
   * Sprawdza czy miesiąc jest otwarty.
   */
  async updateAtypical(
    year: number,
    month: number,
    data: UpdateAtypicalData
  ): Promise<void> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findByYearMonth(year, month);
    if (!report) {
      throw new NotFoundError('ProductionReport');
    }

    // Sprawdź czy miesiąc jest otwarty
    if (report.status === 'closed') {
      throw new ConflictError(
        'Miesiąc jest zamknięty. Aby edytować nietypówki, najpierw odblokuj miesiąc.',
        { code: 'MONTH_CLOSED' }
      );
    }

    // Użyj metody update z repozytorium do aktualizacji nietypówek
    await this.repository.update(report.id, data);
  }

  /**
   * Zamknij miesiąc (zablokuj edycję)
   *
   * Sprawdza czy nie jest już zamknięty.
   */
  async closeMonth(year: number, month: number, userId: number): Promise<void> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findOrCreate(year, month);

    if (report.status === 'closed') {
      throw new ConflictError(
        'Miesiąc jest już zamknięty.',
        { code: 'ALREADY_CLOSED' }
      );
    }

    await this.repository.closeMonth(report.id, userId);
  }

  /**
   * Odblokuj miesiąc (pozwól na edycję)
   *
   * Sprawdza czy jest zamknięty.
   * Ustawia editedAfterClose=true.
   */
  async reopenMonth(year: number, month: number, userId: number): Promise<void> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findByYearMonth(year, month);
    if (!report) {
      throw new NotFoundError('ProductionReport');
    }

    if (report.status !== 'closed') {
      throw new ConflictError(
        'Miesiąc nie jest zamknięty.',
        { code: 'NOT_CLOSED' }
      );
    }

    await this.repository.reopenMonth(report.id, userId);
  }

  /**
   * Pobierz podsumowanie raportu
   *
   * Zwraca sumy dla TYPOWE, AKROBUD, RESZTA, NIETYPÓWKI, RAZEM.
   */
  async getSummary(year: number, month: number): Promise<ReportSummary> {
    this.validateYearMonth(year, month);

    // Pobierz pełny raport (używamy getReport aby nie duplikować logiki)
    const fullReport = await this.getReport(year, month);
    return fullReport.summary;
  }

  /**
   * Pobierz preview auto-fill dla numeru FV
   * Zwraca listę zleceń z tą samą datą dostawy, które zostaną zaktualizowane
   *
   * @param year Rok raportu
   * @param month Miesiąc raportu
   * @param sourceOrderId ID zlecenia źródłowego (z którego pobieramy deliveryDate)
   */
  async getInvoiceAutoFillPreview(
    year: number,
    month: number,
    sourceOrderId: number
  ): Promise<{
    deliveryDate: Date;
    ordersToUpdate: Array<{
      orderId: number;
      orderNumber: string;
      client: string | null;
      currentInvoiceNumber: string | null;
      hasConflict: boolean;
    }>;
    totalOrders: number;
    conflictCount: number;
  }> {
    this.validateYearMonth(year, month);

    // Pobierz pełny raport
    const fullReport = await this.getReport(year, month);

    // Znajdź zlecenie źródłowe
    const sourceItem = fullReport.items.find(item => item.orderId === sourceOrderId);
    if (!sourceItem) {
      throw new NotFoundError('Zlecenie nie znalezione w raporcie');
    }

    if (!sourceItem.deliveryDate) {
      throw new ValidationError('Zlecenie nie ma przypisanej daty dostawy');
    }

    const deliveryDate = sourceItem.deliveryDate;
    const deliveryDateStr = new Date(deliveryDate).toISOString().split('T')[0];

    // Znajdź wszystkie zlecenia z tą samą datą dostawy (oprócz źródłowego)
    const ordersToUpdate = fullReport.items
      .filter(item => {
        if (item.orderId === sourceOrderId) return false;
        if (!item.deliveryDate) return false;
        const itemDateStr = new Date(item.deliveryDate).toISOString().split('T')[0];
        return itemDateStr === deliveryDateStr;
      })
      .map(item => ({
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        client: item.client,
        currentInvoiceNumber: item.invoiceNumber,
        hasConflict: item.invoiceNumber !== null && item.invoiceNumber !== '',
      }));

    const conflictCount = ordersToUpdate.filter(o => o.hasConflict).length;

    return {
      deliveryDate,
      ordersToUpdate,
      totalOrders: ordersToUpdate.length,
      conflictCount,
    };
  }

  /**
   * Wykonaj auto-fill numeru FV dla zleceń z tą samą datą dostawy
   *
   * @param year Rok raportu
   * @param month Miesiąc raportu
   * @param sourceOrderId ID zlecenia źródłowego
   * @param invoiceNumber Numer faktury do ustawienia
   * @param skipConflicts Czy pominąć zlecenia z istniejącym numerem FV
   */
  async executeInvoiceAutoFill(
    year: number,
    month: number,
    sourceOrderId: number,
    invoiceNumber: string,
    skipConflicts: boolean
  ): Promise<{
    updatedCount: number;
    skippedCount: number;
    updatedOrders: string[];
    skippedOrders: string[];
  }> {
    this.validateYearMonth(year, month);

    const report = await this.repository.findByYearMonth(year, month);
    if (!report) {
      throw new NotFoundError('ProductionReport');
    }

    // Pobierz preview aby mieć listę zleceń do aktualizacji
    const preview = await this.getInvoiceAutoFillPreview(year, month, sourceOrderId);

    const updatedOrders: string[] = [];
    const skippedOrders: string[] = [];

    for (const order of preview.ordersToUpdate) {
      if (order.hasConflict && skipConflicts) {
        skippedOrders.push(order.orderNumber);
        continue;
      }

      // Aktualizuj fakturę
      await this.repository.updateInvoice(report.id, order.orderId, invoiceNumber, null);
      updatedOrders.push(order.orderNumber);
    }

    return {
      updatedCount: updatedOrders.length,
      skippedCount: skippedOrders.length,
      updatedOrders,
      skippedOrders,
    };
  }

  /**
   * Sprawdź czy data produkcji nie trafia do zamkniętego miesiąca
   *
   * Zwraca błąd walidacji jeśli miesiąc jest zamknięty.
   */
  async validateProductionDate(orderId: number, newDate: Date): Promise<void> {
    const year = newDate.getFullYear();
    const month = newDate.getMonth() + 1;

    const report = await this.repository.findByYearMonth(year, month);

    // Jeśli raport nie istnieje, miesiąc nie jest zamknięty
    if (!report) {
      return;
    }

    if (report.status === 'closed') {
      throw new ValidationError(
        `Nie można ustawić daty produkcji na ${year}-${month.toString().padStart(2, '0')} - miesiąc jest zamknięty.`,
        { code: 'MONTH_CLOSED', orderId, year, month }
      );
    }
  }

  // ============================================================================
  // METODY POMOCNICZE
  // ============================================================================

  /**
   * Walidacja roku i miesiąca
   */
  private validateYearMonth(year: number, month: number): void {
    if (year < 2000 || year > 2100) {
      throw new ValidationError('Rok musi być między 2000 a 2100');
    }
    if (month < 1 || month > 12) {
      throw new ValidationError('Miesiąc musi być między 1 a 12');
    }
  }

  /**
   * Oblicz liczbę jednostek dla zlecenia
   * (suma quantity ze wszystkich okien)
   */
  private calculateUnits(order: { windows?: Array<{ quantity: number }> }): number {
    if (!order.windows || order.windows.length === 0) {
      return 0;
    }
    return order.windows.reduce((sum, w) => sum + w.quantity, 0);
  }

  /**
   * Sprawdź czy zmiana dotyczy tylko checkboxów RW
   * (można zmieniać nawet przy zamkniętym miesiącu)
   */
  private isOnlyRwChange(data: UpdateReportItemData): boolean {
    const keys = Object.keys(data) as Array<keyof UpdateReportItemData>;
    const rwKeys: Array<keyof UpdateReportItemData> = ['rwOkucia', 'rwProfile'];

    // Sprawdź czy wszystkie klucze to rwOkucia lub rwProfile
    return keys.every((key) => rwKeys.includes(key));
  }

  /**
   * Oblicz podsumowanie raportu
   */
  private async calculateSummary(
    items: ReportItem[],
    report: { atypicalWindows: number; atypicalUnits: number; atypicalSashes: number; atypicalValuePln: number; atypicalNotes: string | null },
    year: number,
    month: number
  ): Promise<ReportSummary> {
    // Sumy TYPOWE (wszystkie zlecenia)
    const typowe = {
      windows: 0,
      units: 0,
      sashes: 0,
      valuePln: 0,
    };

    // Sumy AKROBUD (gdzie client zawiera 'AKROBUD')
    const akrobud = {
      windows: 0,
      units: 0,
      sashes: 0,
      valuePln: 0,
    };

    for (const item of items) {
      // Sumuj do TYPOWE
      typowe.windows += item.windows;
      typowe.units += item.units;
      typowe.sashes += item.sashes;
      typowe.valuePln += item.valuePln;

      // Sprawdź czy to AKROBUD
      const isAkrobud = item.client?.toUpperCase().includes('AKROBUD') ?? false;
      if (isAkrobud) {
        akrobud.windows += item.windows;
        akrobud.units += item.units;
        akrobud.sashes += item.sashes;
        akrobud.valuePln += item.valuePln;
      }
    }

    // RESZTA = TYPOWE - AKROBUD
    const reszta = {
      windows: typowe.windows - akrobud.windows,
      units: typowe.units - akrobud.units,
      sashes: typowe.sashes - akrobud.sashes,
      valuePln: typowe.valuePln - akrobud.valuePln,
    };

    // NIETYPÓWKI - konwersja z groszy na PLN
    const atypical = {
      windows: report.atypicalWindows,
      units: report.atypicalUnits,
      sashes: report.atypicalSashes,
      valuePln: groszeToPln(report.atypicalValuePln as Grosze),
      notes: report.atypicalNotes,
    };

    // RAZEM = TYPOWE + NIETYPÓWKI
    const razem = {
      windows: typowe.windows + atypical.windows,
      units: typowe.units + atypical.units,
      sashes: typowe.sashes + atypical.sashes,
      valuePln: typowe.valuePln + atypical.valuePln,
    };

    // Pobierz dni robocze
    const workingDays = await this.repository.getWorkingDaysCount(year, month);

    // Średnia jednostek na dzień
    const avgUnitsPerDay =
      workingDays > 0 ? (razem.units / workingDays).toFixed(2) : '—';

    return {
      typowe,
      akrobud,
      reszta,
      atypical,
      razem,
      workingDays,
      avgUnitsPerDay,
    };
  }
}

// ============================================================================
// EKSPORT SINGLETONA
// ============================================================================

export const productionReportService = new ProductionReportService(productionReportRepository);
