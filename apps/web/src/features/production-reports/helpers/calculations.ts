/**
 * Funkcje pomocnicze do obliczeń w module Production Reports
 */

import type { ProductionReportItem, CategorySummary, ProductionReportSummary } from '../types';

interface OrderData {
  id: number;
  orderNumber: string;
  client: string;
  totalWindows: number;
  totalSashes: number;
  totalGlasses?: number | null; // Liczba szkleń
  valuePln: number | null;
  deliveryId: number | null;
}

/**
 * Oblicza efektywne wartości dla zlecenia (z override lub oryginalne)
 */
export function getEffectiveValues(
  order: OrderData,
  item: ProductionReportItem | null
): {
  windows: number;
  units: number;
  sashes: number;
  valuePln: number;
} {
  return {
    windows: item?.overrideWindows ?? order.totalWindows,
    units: item?.overrideUnits ?? order.totalGlasses ?? 0, // Domyślnie szkleń z totalGlasses
    sashes: item?.overrideSashes ?? order.totalSashes,
    valuePln: item?.overrideValuePln ?? order.valuePln ?? 0,
  };
}

/**
 * Sprawdza czy zlecenie jest dla AKROBUD
 */
export function isAkrobudOrder(client: string): boolean {
  return client.toUpperCase().includes('AKROBUD');
}

/**
 * Grupuje zlecenia według kategorii (AKROBUD vs RESZTA)
 */
export function categorizeOrders(
  orders: OrderData[],
  items: Map<number, ProductionReportItem>
): {
  akrobud: Array<{ order: OrderData; item: ProductionReportItem | null }>;
  reszta: Array<{ order: OrderData; item: ProductionReportItem | null }>;
} {
  const akrobud: Array<{ order: OrderData; item: ProductionReportItem | null }> = [];
  const reszta: Array<{ order: OrderData; item: ProductionReportItem | null }> = [];

  for (const order of orders) {
    const item = items.get(order.id) || null;
    if (isAkrobudOrder(order.client)) {
      akrobud.push({ order, item });
    } else {
      reszta.push({ order, item });
    }
  }

  return { akrobud, reszta };
}

/**
 * Oblicza podsumowanie dla kategorii
 */
export function calculateCategorySummary(
  entries: Array<{ order: OrderData; item: ProductionReportItem | null }>
): CategorySummary {
  let windows = 0;
  let units = 0;
  let sashes = 0;
  let valuePln = 0;

  for (const { order, item } of entries) {
    const effective = getEffectiveValues(order, item);
    windows += effective.windows;
    units += effective.units;
    sashes += effective.sashes;
    valuePln += effective.valuePln;
  }

  const averagePerUnit = units > 0 ? (valuePln / 100) / units : null;
  return { windows, units, sashes, valuePln, averagePerUnit };
}

/**
 * Oblicza pełne podsumowanie raportu
 */
export function calculateFullSummary(
  orders: OrderData[],
  items: Map<number, ProductionReportItem>,
  atypical: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  },
  workingDays: number
): ProductionReportSummary {
  const { akrobud, reszta } = categorizeOrders(orders, items);

  const akrobudSummary = calculateCategorySummary(akrobud);
  const restaSummary = calculateCategorySummary(reszta);

  // TYPOWE = wszystkie zlecenia (AKROBUD + RESZTA)
  const typoweUnits = akrobudSummary.units + restaSummary.units;
  const typoweValuePln = akrobudSummary.valuePln + restaSummary.valuePln;
  const typoweSummary: CategorySummary = {
    windows: akrobudSummary.windows + restaSummary.windows,
    units: typoweUnits,
    sashes: akrobudSummary.sashes + restaSummary.sashes,
    valuePln: typoweValuePln,
    averagePerUnit: typoweUnits > 0 ? (typoweValuePln / 100) / typoweUnits : null,
  };

  // NIETYPÓWKI
  const nietypowkiSummary: CategorySummary = {
    windows: atypical.windows,
    units: atypical.units,
    sashes: atypical.sashes,
    valuePln: atypical.valuePln,
    averagePerUnit: atypical.units > 0 ? (atypical.valuePln / 100) / atypical.units : null,
  };

  // RAZEM
  const razemUnits = typoweSummary.units + nietypowkiSummary.units;
  const razemValuePln = typoweSummary.valuePln + nietypowkiSummary.valuePln;
  const razem: CategorySummary = {
    windows: typoweSummary.windows + nietypowkiSummary.windows,
    units: razemUnits,
    sashes: typoweSummary.sashes + nietypowkiSummary.sashes,
    valuePln: razemValuePln,
    averagePerUnit: razemUnits > 0 ? (razemValuePln / 100) / razemUnits : null,
  };

  // Średnia na jednostkę (PLN, nie grosze)
  const avgPerUnit = razem.units > 0 ? (razem.valuePln / 100) / razem.units : 0;

  // Średnia na dzień roboczy (PLN, nie grosze)
  const avgPerDay = workingDays > 0 ? (razem.valuePln / 100) / workingDays : 0;

  return {
    typowe: typoweSummary,
    akrobud: akrobudSummary,
    reszta: restaSummary,
    nietypowki: nietypowkiSummary,
    razem,
    workingDays,
    avgPerUnit,
    avgPerDay,
  };
}

/**
 * Formatuje wartość w groszach jako PLN
 */
export function formatPln(grosze: number): string {
  const pln = grosze / 100;
  return pln.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' PLN';
}

/**
 * Formatuje liczbę z polskim formatowaniem
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('pl-PL');
}
