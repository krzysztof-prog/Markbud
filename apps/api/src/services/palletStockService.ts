/**
 * Pallet Stock Service - Business logic for production pallets management
 * Moduł paletówek - zarządzanie stanem palet produkcyjnych
 *
 * Typy palet: MALA, P2400, P3000, P3500, P4000
 *
 * LOGIKA:
 * - Stan poranny = domyślnie: poprzedni poranny - poprzednie użyte (kierownik może zmienić strzałkami)
 * - Użyte = wpisywane przez kierownika
 * - Zrobione = morningStock (dziś) - morningStock (poprzedni dzień) + used
 */

import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { formatDateWarsaw } from '../utils/date-helpers.js';
import type {
  PalletStockDay,
  PalletStockEntry,
  PalletAlertConfig,
} from '@prisma/client';

// Typy palet (jako stałe dla walidacji)
export const PALLET_TYPES = ['MALA', 'P2400', 'P3000', 'P3500', 'P4000'] as const;
export type PalletType = (typeof PALLET_TYPES)[number];

// Status dnia
export const DAY_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type DayStatus = (typeof DAY_STATUS)[keyof typeof DAY_STATUS];

// Typy dla odpowiedzi - rozszerzone o previousMorningStock
export interface PalletStockEntryWithPrevious extends PalletStockEntry {
  previousMorningStock: number;
}

export interface PalletStockDayWithEntries extends PalletStockDay {
  entries: PalletStockEntryWithPrevious[];
  canEdit: boolean; // Czy dzień można edytować (poprzedni zamknięty lub pierwszy po stanie początkowym)
  editBlockReason?: string; // Powód blokady edycji
}

export interface MonthSummary {
  year: number;
  month: number;
  startStocks: Record<PalletType, number>;
  endStocks: Record<PalletType, number>;
  totalUsed: Record<PalletType, number>;
  totalProduced: Record<PalletType, number>;
  daysWithAlerts: number;
  totalDays: number;
}

// Typ statusu dnia dla kalendarza
export type CalendarDayStatus = 'empty' | 'open' | 'closed';

export interface CalendarDay {
  date: string;
  status: CalendarDayStatus;
  hasAlerts: boolean;
}

export interface CalendarSummary {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface Alert {
  type: PalletType;
  currentStock: number; // Stan poranny (morningStock)
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

/**
 * Pomocnicza funkcja do normalizacji daty (tylko dzień, bez czasu).
 * Ustawia czas na midnight w LOKALNEJ strefie czasowej.
 * UWAGA: Prisma/SQLite zapisuje to jako UTC z przesunięciem (np. 23:00 UTC dla CET).
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Porównuje daty ignorując czas - sprawdza czy to ten sam dzień.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Sprawdza czy date1 jest dniem przed date2.
 * @internal - Currently unused but kept for future use
 */
function _isDayBefore(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  // Różnica w dniach
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Pobiera stan początkowy dla danego typu palety.
 * Zwraca null jeśli nie ustawiono stanu początkowego.
 */
export async function getInitialStock(type: string): Promise<{
  initialStock: number;
  startDate: Date;
} | null> {
  const initialConfig = await prisma.palletInitialStock.findUnique({
    where: { type },
  });

  if (!initialConfig) {
    return null;
  }

  return {
    initialStock: initialConfig.initialStock,
    startDate: initialConfig.startDate,
  };
}

/**
 * Pobiera wszystkie stany początkowe.
 */
export async function getAllInitialStocks(): Promise<Array<{
  type: string;
  initialStock: number;
  startDate: Date;
  updatedAt: Date;
}>> {
  const configs = await prisma.palletInitialStock.findMany({
    orderBy: { type: 'asc' },
  });

  return configs.map((c) => ({
    type: c.type,
    initialStock: c.initialStock,
    startDate: c.startDate,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Ustawia lub aktualizuje stan początkowy dla wszystkich typów palet.
 * Data początkowa jest wspólna dla wszystkich typów.
 */
export async function setInitialStocks(
  startDate: Date,
  stocks: Array<{ type: string; initialStock: number }>,
  updatedById?: number
): Promise<void> {
  const normalizedStartDate = normalizeDate(startDate);

  // Waliduj typy palet
  for (const stock of stocks) {
    if (!PALLET_TYPES.includes(stock.type as PalletType)) {
      throw new ValidationError(`Nieprawidłowy typ palety: ${stock.type}`);
    }
    if (stock.initialStock < 0) {
      throw new ValidationError('Stan początkowy nie może być ujemny');
    }
  }

  // Upsert dla każdego typu
  await prisma.$transaction(
    stocks.map((stock) =>
      prisma.palletInitialStock.upsert({
        where: { type: stock.type },
        update: {
          startDate: normalizedStartDate,
          initialStock: stock.initialStock,
          updatedById,
        },
        create: {
          type: stock.type,
          startDate: normalizedStartDate,
          initialStock: stock.initialStock,
          updatedById,
        },
      })
    )
  );

  logger.info('Ustawiono stany początkowe palet', {
    startDate: normalizedStartDate.toISOString(),
    stocks,
    updatedById,
  });
}

/**
 * Pobiera dane poprzedniego dnia dla danego typu palety.
 * Zwraca obiekt z morningStock i used poprzedniego dnia.
 * Domyślny stan poranny dla nowego dnia = previousMorningStock - previousUsed
 *
 * NOWA LOGIKA: Jeśli nie ma poprzedniego dnia, ale jest ustawiony stan początkowy
 * i data jest >= startDate, użyj stanu początkowego jako morningStock.
 */
export async function getPreviousDayData(
  date: Date,
  type: string
): Promise<{ morningStock: number; used: number }> {
  const normalizedDate = normalizeDate(date);

  // Znajdź najbliższy poprzedni dzień z wpisami
  const previousDay = await prisma.palletStockDay.findFirst({
    where: {
      date: { lt: normalizedDate },
    },
    orderBy: { date: 'desc' },
    include: {
      entries: {
        where: { type },
      },
    },
  });

  if (!previousDay || previousDay.entries.length === 0) {
    // Sprawdź czy jest ustawiony stan początkowy
    const initialStock = await getInitialStock(type);

    if (initialStock && normalizedDate >= normalizeDate(initialStock.startDate)) {
      // Jeśli nie ma poprzedniego dnia, ale jest stan początkowy i data >= startDate,
      // użyj stanu początkowego jako "poprzedni poranny" z used = 0
      logger.debug('Brak poprzedniego dnia - używam stanu początkowego', {
        type,
        date: normalizedDate.toISOString(),
        initialStock: initialStock.initialStock,
        startDate: initialStock.startDate.toISOString(),
      });
      return { morningStock: initialStock.initialStock, used: 0 };
    }

    logger.debug('Brak poprzedniego dnia i brak stanu początkowego - stan = 0', { type, date: normalizedDate.toISOString() });
    return { morningStock: 0, used: 0 };
  }

  const entry = previousDay.entries[0];

  logger.debug('Dane poprzedniego dnia', {
    type,
    previousDate: previousDay.date.toISOString(),
    morningStock: entry.morningStock,
    used: entry.used,
  });

  return { morningStock: entry.morningStock, used: entry.used };
}

/**
 * Sprawdza czy dzień można edytować.
 * Warunki:
 * - Dzień musi mieć status OPEN
 * - Poprzedni dzień musi być zamknięty (CLOSED) LUB
 * - To jest pierwszy dzień po dacie stanu początkowego (brak poprzedniego dnia)
 *
 * Zwraca: { canEdit: boolean, reason?: string }
 */
export async function checkCanEditDay(date: Date): Promise<{
  canEdit: boolean;
  reason?: string;
}> {
  const normalizedDate = normalizeDate(date);

  logger.debug('checkCanEditDay - start', {
    inputDate: date.toISOString(),
    normalizedDate: normalizedDate.toISOString(),
  });

  // Sprawdź czy istnieje dzień w bazie
  const existingDay = await prisma.palletStockDay.findUnique({
    where: { date: normalizedDate },
  });

  // Jeśli dzień jest zamknięty - nie można edytować
  if (existingDay && existingDay.status === DAY_STATUS.CLOSED) {
    logger.debug('checkCanEditDay - dzień zamknięty');
    return {
      canEdit: false,
      reason: 'Ten dzień jest zamknięty',
    };
  }

  // Pobierz stan początkowy
  const initialStock = await prisma.palletInitialStock.findFirst();

  if (!initialStock) {
    logger.debug('checkCanEditDay - brak stanu początkowego');
    return {
      canEdit: false,
      reason: 'Najpierw ustaw stan początkowy palet',
    };
  }

  const startDate = normalizeDate(initialStock.startDate);

  logger.debug('checkCanEditDay - daty', {
    normalizedDate: normalizedDate.toISOString(),
    startDate: startDate.toISOString(),
    isSameOrAfterStart: normalizedDate >= startDate,
    isSameDay: isSameDay(normalizedDate, startDate),
  });

  // Jeśli data jest przed datą stanu początkowego - nie można edytować
  if (normalizedDate < startDate) {
    return {
      canEdit: false,
      reason: `Data jest przed datą stanu początkowego (${startDate.toLocaleDateString('pl-PL')})`,
    };
  }

  // Jeśli to jest dzień stanu początkowego - można edytować bez sprawdzania poprzedniego
  if (isSameDay(normalizedDate, startDate)) {
    logger.debug('checkCanEditDay - to jest dzień stanu początkowego, można edytować');
    return { canEdit: true };
  }

  // Znajdź poprzedni dzień (tylko dni >= startDate)
  const previousDay = await prisma.palletStockDay.findFirst({
    where: {
      date: {
        lt: normalizedDate,
        gte: startDate, // Nie szukaj przed datą stanu początkowego
      },
    },
    orderBy: { date: 'desc' },
  });

  logger.debug('checkCanEditDay - poprzedni dzień', {
    previousDay: previousDay
      ? { date: previousDay.date.toISOString(), status: previousDay.status }
      : null,
  });

  // Jeśli nie ma poprzedniego dnia w bazie (ale data > startDate)
  // To znaczy że poprzedni dzień to startDate lub nie został utworzony
  if (!previousDay) {
    // Sprawdź czy dzień tuż przed jest datą startową
    const dayBefore = new Date(normalizedDate);
    dayBefore.setDate(dayBefore.getDate() - 1);

    if (isSameDay(dayBefore, startDate)) {
      // Poprzedni dzień to startDate - OK, można edytować
      logger.debug('checkCanEditDay - poprzedni dzień to startDate, można edytować');
      return { canEdit: true };
    }

    // Poprzedni dzień powinien istnieć ale nie istnieje - trzeba najpierw wypełnić poprzedni
    logger.debug('checkCanEditDay - brak poprzedniego dnia w bazie');
    return {
      canEdit: false,
      reason: `Najpierw wypełnij poprzedni dzień (${dayBefore.toLocaleDateString('pl-PL')})`,
    };
  }

  // Sprawdź czy poprzedni dzień to rzeczywiście dzień przed (nie ma przerwy)
  const expectedPrevDay = new Date(normalizedDate);
  expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);

  if (!isSameDay(previousDay.date, expectedPrevDay)) {
    // Jest przerwa w dniach - poprzedni dzień w bazie nie jest dniem tuż przed
    logger.debug('checkCanEditDay - przerwa w dniach');
    return {
      canEdit: false,
      reason: `Najpierw wypełnij dzień ${expectedPrevDay.toLocaleDateString('pl-PL')}`,
    };
  }

  // Jeśli poprzedni dzień jest zamknięty - można edytować
  if (previousDay.status === DAY_STATUS.CLOSED) {
    logger.debug('checkCanEditDay - poprzedni dzień zamknięty, można edytować');
    return { canEdit: true };
  }

  // Poprzedni dzień nie jest zamknięty - blokuj
  const previousDateStr = previousDay.date.toLocaleDateString('pl-PL');
  logger.debug('checkCanEditDay - poprzedni dzień otwarty, blokada');
  return {
    canEdit: false,
    reason: `Najpierw zamknij dzień ${previousDateStr}`,
  };
}

/**
 * Oblicza domyślny stan poranny dla nowego dnia.
 * Wzór: poprzedni poranny - poprzednie użyte
 */
export async function getDefaultMorningStock(
  date: Date,
  type: string
): Promise<number> {
  const prevData = await getPreviousDayData(date, type);
  const defaultStock = Math.max(0, prevData.morningStock - prevData.used);

  logger.debug('Domyślny stan poranny', {
    type,
    previousMorning: prevData.morningStock,
    previousUsed: prevData.used,
    defaultStock,
  });

  return defaultStock;
}

/**
 * Pobiera lub tworzy dzień paletowy.
 * Automatycznie tworzy wpisy dla wszystkich typów palet.
 * Stan poranny = poprzedni poranny - poprzednie użyte (kierownik może zmienić strzałkami).
 */
export async function getOrCreateDay(date: Date): Promise<PalletStockDayWithEntries> {
  const normalizedDate = normalizeDate(date);

  logger.debug('Pobieranie/tworzenie dnia paletowego', {
    date: normalizedDate.toISOString(),
  });

  // Sprawdź czy dzień istnieje
  const existingDay = await prisma.palletStockDay.findUnique({
    where: { date: normalizedDate },
    include: { entries: true },
  });

  if (existingDay) {
    logger.debug('Znaleziono istniejący dzień paletowy', { dayId: existingDay.id });
    // Dodaj previousMorningStock do każdego wpisu
    const entriesWithPrevious = await Promise.all(
      existingDay.entries.map(async (entry) => {
        const prevData = await getPreviousDayData(normalizedDate, entry.type);
        return { ...entry, previousMorningStock: prevData.morningStock };
      })
    );

    // Sprawdź czy można edytować
    const editCheck = await checkCanEditDay(normalizedDate);

    return {
      ...existingDay,
      entries: entriesWithPrevious,
      canEdit: editCheck.canEdit,
      editBlockReason: editCheck.reason,
    };
  }

  // Tworzymy nowy dzień z wpisami dla wszystkich typów
  logger.info('Tworzenie nowego dnia paletowego', {
    date: normalizedDate.toISOString(),
  });

  // Pobierz domyślne stany poranne dla każdego typu (poprzedni poranny - poprzednie użyte)
  const entriesData = await Promise.all(
    PALLET_TYPES.map(async (type) => {
      const defaultMorning = await getDefaultMorningStock(normalizedDate, type);
      return {
        type,
        morningStock: defaultMorning, // Stan poranny = poprzedni poranny - poprzednie użyte
        morningCorrected: false,
        used: 0,
        produced: 0, // Będzie wyliczone przy zapisie
      };
    })
  );

  const newDay = await prisma.palletStockDay.create({
    data: {
      date: normalizedDate,
      status: DAY_STATUS.OPEN,
      entries: {
        create: entriesData,
      },
    },
    include: { entries: true },
  });

  logger.info('Utworzono nowy dzień paletowy', {
    dayId: newDay.id,
    entriesCount: newDay.entries.length,
  });

  // Dodaj previousMorningStock do każdego wpisu
  const entriesWithPrevious = await Promise.all(
    newDay.entries.map(async (entry) => {
      const prevData = await getPreviousDayData(normalizedDate, entry.type);
      return { ...entry, previousMorningStock: prevData.morningStock };
    })
  );

  // Sprawdź czy można edytować nowo utworzony dzień
  const editCheck = await checkCanEditDay(normalizedDate);

  return {
    ...newDay,
    entries: entriesWithPrevious,
    canEdit: editCheck.canEdit,
    editBlockReason: editCheck.reason,
  };
}

/**
 * Aktualizuje wpisy dnia (status OPEN).
 * Kierownik wpisuje: used (użyte) i morningStock (stan poranny - może zmienić strzałkami).
 * produced (zrobione) jest WYLICZANE: morningStock (dziś) - morningStock (poprzedni dzień) + used
 */
export async function updateDayEntries(
  date: Date,
  entries: Array<{ type: string; used: number; morningStock: number }>
): Promise<PalletStockDayWithEntries> {
  const normalizedDate = normalizeDate(date);

  // Pobierz lub utwórz dzień
  const day = await getOrCreateDay(normalizedDate);

  // Sprawdź czy dzień jest otwarty
  if (day.status === DAY_STATUS.CLOSED) {
    throw new ValidationError('Ten dzień jest zamknięty i nie można go edytować');
  }

  // Sprawdź czy dzień można edytować (poprzedni dzień musi być zamknięty)
  if (!day.canEdit) {
    throw new ValidationError(day.editBlockReason || 'Nie można edytować tego dnia');
  }

  // Waliduj typy palet i wartości
  for (const entry of entries) {
    if (!PALLET_TYPES.includes(entry.type as PalletType)) {
      throw new ValidationError(`Nieprawidłowy typ palety: ${entry.type}`);
    }
    if (entry.used < 0) {
      throw new ValidationError('Wartość "użyte" nie może być ujemna');
    }
    if (entry.morningStock < 0) {
      throw new ValidationError('Stan poranny nie może być ujemny');
    }
  }

  // Aktualizuj wpisy w transakcji
  const updatedDay = await prisma.$transaction(async (tx) => {
    for (const entryUpdate of entries) {
      // Znajdź istniejący wpis
      const existingEntry = day.entries.find((e) => e.type === entryUpdate.type);
      if (!existingEntry) {
        throw new ValidationError(`Nie znaleziono wpisu dla typu: ${entryUpdate.type}`);
      }

      // Pobierz previousMorningStock
      const previousMorningStock = existingEntry.previousMorningStock;

      // Oblicz produced (zrobione) = morningStock (dziś) - morningStock (poprzedni dzień) + used
      const produced = entryUpdate.morningStock - previousMorningStock + entryUpdate.used;

      await tx.palletStockEntry.update({
        where: { id: existingEntry.id },
        data: {
          morningStock: entryUpdate.morningStock,
          used: entryUpdate.used,
          produced: produced,
        },
      });
    }

    // Zwróć zaktualizowany dzień
    return tx.palletStockDay.findUnique({
      where: { id: day.id },
      include: { entries: true },
    });
  });

  if (!updatedDay) {
    throw new NotFoundError('Dzień paletowy');
  }

  logger.info('Zaktualizowano wpisy dnia paletowego', {
    dayId: day.id,
    updatedEntries: entries.length,
  });

  // Dodaj previousMorningStock do każdego wpisu
  const entriesWithPrevious = await Promise.all(
    updatedDay.entries.map(async (entry) => {
      const prevData = await getPreviousDayData(normalizedDate, entry.type);
      return { ...entry, previousMorningStock: prevData.morningStock };
    })
  );

  // Sprawdź czy można edytować (dla odpowiedzi)
  const editCheck = await checkCanEditDay(normalizedDate);

  return {
    ...updatedDay,
    entries: entriesWithPrevious,
    canEdit: editCheck.canEdit,
    editBlockReason: editCheck.reason,
  };
}

/**
 * Korekta stanu porannego.
 * Wymaga komentarza (min 3 znaki).
 * Kierownik może korygować poprzednie dni.
 */
export async function correctMorningStock(
  date: Date,
  type: string,
  morningStock: number,
  note: string
): Promise<PalletStockEntryWithPrevious> {
  const normalizedDate = normalizeDate(date);

  // Waliduj typ palety
  if (!PALLET_TYPES.includes(type as PalletType)) {
    throw new ValidationError(`Nieprawidłowy typ palety: ${type}`);
  }

  // Waliduj komentarz
  if (!note || note.trim().length < 3) {
    throw new ValidationError('Komentarz do korekty musi mieć minimum 3 znaki');
  }

  if (morningStock < 0) {
    throw new ValidationError('Stan poranny nie może być ujemny');
  }

  // Pobierz lub utwórz dzień
  const day = await getOrCreateDay(normalizedDate);

  // Sprawdź czy dzień jest otwarty
  if (day.status === DAY_STATUS.CLOSED) {
    throw new ValidationError('Ten dzień jest zamknięty i nie można go korygować');
  }

  // Sprawdź czy dzień można edytować (poprzedni dzień musi być zamknięty)
  if (!day.canEdit) {
    throw new ValidationError(day.editBlockReason || 'Nie można edytować tego dnia');
  }

  // Znajdź wpis
  const entry = day.entries.find((e) => e.type === type);
  if (!entry) {
    throw new ValidationError(`Nie znaleziono wpisu dla typu: ${type}`);
  }

  // Pobierz previousMorningStock
  const prevData = await getPreviousDayData(normalizedDate, type);
  const previousMorningStock = prevData.morningStock;

  // Oblicz nowe produced po korekcie
  const newProduced = morningStock - previousMorningStock + entry.used;

  // Aktualizuj wpis
  const updatedEntry = await prisma.palletStockEntry.update({
    where: { id: entry.id },
    data: {
      morningStock,
      morningCorrected: true,
      morningNote: note.trim(),
      produced: newProduced, // Przelicz produced po korekcie
    },
  });

  logger.info('Skorygowano stan poranny', {
    entryId: entry.id,
    type,
    oldMorningStock: entry.morningStock,
    newMorningStock: morningStock,
    note: note.trim(),
  });

  return { ...updatedEntry, previousMorningStock };
}

/**
 * Zamyka dzień (ustawia status na CLOSED).
 */
export async function closeDay(date: Date): Promise<PalletStockDayWithEntries> {
  const normalizedDate = normalizeDate(date);

  // Pobierz dzień
  const day = await prisma.palletStockDay.findUnique({
    where: { date: normalizedDate },
    include: { entries: true },
  });

  if (!day) {
    throw new NotFoundError('Dzień paletowy');
  }

  if (day.status === DAY_STATUS.CLOSED) {
    throw new ValidationError('Ten dzień jest już zamknięty');
  }

  // Zamknij dzień
  const closedDay = await prisma.palletStockDay.update({
    where: { id: day.id },
    data: {
      status: DAY_STATUS.CLOSED,
      closedAt: new Date(),
    },
    include: { entries: true },
  });

  logger.info('Zamknięto dzień paletowy', {
    dayId: day.id,
    date: normalizedDate.toISOString(),
  });

  // Dodaj previousMorningStock do każdego wpisu
  const entriesWithPrevious = await Promise.all(
    closedDay.entries.map(async (entry) => {
      const prevData = await getPreviousDayData(normalizedDate, entry.type);
      return { ...entry, previousMorningStock: prevData.morningStock };
    })
  );

  // Zamknięty dzień - canEdit = false
  return {
    ...closedDay,
    entries: entriesWithPrevious,
    canEdit: false,
    editBlockReason: undefined,
  };
}

/**
 * Pobiera kalendarz miesiąca ze statusami dni.
 * Używane przez widok kalendarza w UI.
 */
export async function getCalendar(
  year: number,
  month: number
): Promise<CalendarSummary> {
  // Walidacja
  if (month < 1 || month > 12) {
    throw new ValidationError('Miesiąc musi być w zakresie 1-12');
  }
  if (year < 2020 || year > 2100) {
    throw new ValidationError('Rok musi być w zakresie 2020-2100');
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Ostatni dzień miesiąca
  const daysInMonth = endDate.getDate();

  logger.debug('Pobieranie kalendarza miesiąca', {
    year,
    month,
    daysInMonth,
  });

  // Pobierz wszystkie dni w miesiącu z bazy
  const existingDays = await prisma.palletStockDay.findMany({
    where: {
      date: {
        gte: startDate,
        lte: new Date(year, month, 0, 23, 59, 59, 999),
      },
    },
    include: { entries: true },
    orderBy: { date: 'asc' },
  });

  // Stwórz mapę dni z bazy
  const dayMap = new Map<string, PalletStockDay & { entries: PalletStockEntry[] }>();
  for (const day of existingDays) {
    const dateStr = formatDateWarsaw(day.date);
    dayMap.set(dateStr, day);
  }

  // Pobierz progi alertów
  const alertConfigs = await getAlertConfig();
  const thresholds: Record<string, number> = {};
  for (const config of alertConfigs) {
    thresholds[config.type] = config.criticalThreshold;
  }

  // Generuj kalendarz dla każdego dnia miesiąca
  const days: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = formatDateWarsaw(date);
    const existingDay = dayMap.get(dateStr);

    let status: CalendarDayStatus = 'empty';
    let hasAlerts = false;

    if (existingDay) {
      status = existingDay.status === 'CLOSED' ? 'closed' : 'open';

      // Sprawdź czy dzień ma alerty (morningStock < threshold)
      for (const entry of existingDay.entries) {
        const threshold = thresholds[entry.type] ?? 10;
        if (entry.morningStock < threshold) {
          hasAlerts = true;
          break;
        }
      }
    }

    days.push({
      date: dateStr,
      status,
      hasAlerts,
    });
  }

  logger.debug('Kalendarz miesiąca gotowy', {
    year,
    month,
    totalDays: days.length,
    existingDays: existingDays.length,
    closedDays: days.filter((d) => d.status === 'closed').length,
  });

  return {
    year,
    month,
    days,
  };
}

/**
 * Pobiera podsumowanie miesiąca.
 */
export async function getMonthSummary(
  year: number,
  month: number
): Promise<MonthSummary> {
  // Walidacja
  if (month < 1 || month > 12) {
    throw new ValidationError('Miesiąc musi być w zakresie 1-12');
  }
  if (year < 2020 || year > 2100) {
    throw new ValidationError('Rok musi być w zakresie 2020-2100');
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  logger.debug('Pobieranie podsumowania miesiąca', {
    year,
    month,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Pobierz wszystkie dni w miesiącu
  const days = await prisma.palletStockDay.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { entries: true },
    orderBy: { date: 'asc' },
  });

  // Inicjalizuj agregaty
  const startStocks: Record<PalletType, number> = {} as Record<PalletType, number>;
  const endStocks: Record<PalletType, number> = {} as Record<PalletType, number>;
  const totalUsed: Record<PalletType, number> = {} as Record<PalletType, number>;
  const totalProduced: Record<PalletType, number> = {} as Record<PalletType, number>;

  // Inicjalizuj zera dla każdego typu
  for (const type of PALLET_TYPES) {
    startStocks[type] = 0;
    endStocks[type] = 0;
    totalUsed[type] = 0;
    totalProduced[type] = 0;
  }

  // Licz dni z alertami (dzień ma alert jeśli którykolwiek morningStock < threshold)
  let daysWithAlerts = 0;
  const alertConfigs = await getAlertConfig();
  const thresholds: Record<string, number> = {};
  for (const config of alertConfigs) {
    thresholds[config.type] = config.criticalThreshold;
  }

  // Dla każdego dnia
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const isFirstDay = i === 0;
    const isLastDay = i === days.length - 1;
    let dayHasAlert = false;

    for (const entry of day.entries) {
      const palletType = entry.type as PalletType;

      // Stan początkowy miesiąca = morningStock pierwszego dnia
      if (isFirstDay) {
        startStocks[palletType] = entry.morningStock;
      }

      // Stan końcowy miesiąca = morningStock ostatniego dnia
      if (isLastDay) {
        endStocks[palletType] = entry.morningStock;
      }

      // Agreguj użyte i wyprodukowane
      totalUsed[palletType] += entry.used;
      totalProduced[palletType] += entry.produced;

      // Sprawdź alert (morningStock < threshold)
      const threshold = thresholds[palletType] ?? 10;
      if (entry.morningStock < threshold) {
        dayHasAlert = true;
      }
    }

    if (dayHasAlert) {
      daysWithAlerts++;
    }
  }

  logger.debug('Podsumowanie miesiąca gotowe', {
    year,
    month,
    totalDays: days.length,
    daysWithAlerts,
  });

  return {
    year,
    month,
    startStocks,
    endStocks,
    totalUsed,
    totalProduced,
    daysWithAlerts,
    totalDays: days.length,
  };
}

/**
 * Pobiera konfigurację alertów.
 * Automatycznie tworzy wpisy dla brakujących typów.
 */
export async function getAlertConfig(): Promise<PalletAlertConfig[]> {
  // Pobierz istniejące konfiguracje
  const configs = await prisma.palletAlertConfig.findMany({
    orderBy: { type: 'asc' },
  });

  // Sprawdź czy są wszystkie typy
  const existingTypes = new Set(configs.map((c) => c.type));
  const missingTypes = PALLET_TYPES.filter((t) => !existingTypes.has(t));

  // Utwórz brakujące konfiguracje
  if (missingTypes.length > 0) {
    logger.info('Tworzenie brakujących konfiguracji alertów', {
      missingTypes,
    });

    await prisma.palletAlertConfig.createMany({
      data: missingTypes.map((type) => ({
        type,
        criticalThreshold: 10, // Domyślny próg
      })),
    });

    // Pobierz ponownie wszystkie konfiguracje
    return prisma.palletAlertConfig.findMany({
      orderBy: { type: 'asc' },
    });
  }

  return configs;
}

/**
 * Aktualizuje progi alertów.
 */
export async function updateAlertConfig(
  configs: Array<{ type: string; criticalThreshold: number }>
): Promise<void> {
  // Waliduj typy i wartości
  for (const config of configs) {
    if (!PALLET_TYPES.includes(config.type as PalletType)) {
      throw new ValidationError(`Nieprawidłowy typ palety: ${config.type}`);
    }
    if (config.criticalThreshold < 0) {
      throw new ValidationError('Próg alertu nie może być ujemny');
    }
  }

  // Aktualizuj w transakcji
  await prisma.$transaction(
    configs.map((config) =>
      prisma.palletAlertConfig.upsert({
        where: { type: config.type },
        update: { criticalThreshold: config.criticalThreshold },
        create: {
          type: config.type,
          criticalThreshold: config.criticalThreshold,
        },
      })
    )
  );

  logger.info('Zaktualizowano konfigurację alertów', {
    updatedConfigs: configs.length,
  });
}

/**
 * Sprawdza alerty dla wpisów.
 * Zwraca listę alertów jeśli morningStock < próg (NOWA LOGIKA - bazuje na stanie porannym).
 */
export async function checkAlerts(
  entries: PalletStockEntryWithPrevious[],
  config: PalletAlertConfig[]
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Stwórz mapę progów
  const thresholdMap = new Map<string, number>();
  for (const c of config) {
    thresholdMap.set(c.type, c.criticalThreshold);
  }

  for (const entry of entries) {
    const threshold = thresholdMap.get(entry.type);
    if (threshold === undefined) {
      continue;
    }

    // NOWA LOGIKA: alert bazuje na morningStock (stanie porannym)
    if (entry.morningStock < threshold) {
      // Severity: critical jeśli stan <= 0, warning jeśli poniżej progu
      const severity = entry.morningStock <= 0 ? 'critical' : 'warning';

      alerts.push({
        type: entry.type as PalletType,
        currentStock: entry.morningStock, // Stan poranny
        threshold,
        severity,
        message:
          severity === 'critical'
            ? `KRYTYCZNE: Brak palet ${entry.type}! Stan poranny: ${entry.morningStock}`
            : `Niski stan palet ${entry.type}: ${entry.morningStock} (próg: ${threshold})`,
      });
    }
  }

  if (alerts.length > 0) {
    logger.warn('Wykryto alerty paletowe', {
      alertsCount: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    });
  }

  return alerts;
}

/**
 * Pobiera dzień po ID.
 */
export async function getDayById(id: number): Promise<PalletStockDayWithEntries> {
  const day = await prisma.palletStockDay.findUnique({
    where: { id },
    include: { entries: true },
  });

  if (!day) {
    throw new NotFoundError('Dzień paletowy');
  }

  // Dodaj previousMorningStock do każdego wpisu
  const entriesWithPrevious = await Promise.all(
    day.entries.map(async (entry) => {
      const prevData = await getPreviousDayData(day.date, entry.type);
      return { ...entry, previousMorningStock: prevData.morningStock };
    })
  );

  // Sprawdź czy można edytować
  const editCheck = await checkCanEditDay(day.date);

  return {
    ...day,
    entries: entriesWithPrevious,
    canEdit: editCheck.canEdit,
    editBlockReason: editCheck.reason,
  };
}

/**
 * Pobiera dzień po dacie.
 */
export async function getDayByDate(date: Date): Promise<PalletStockDayWithEntries | null> {
  const normalizedDate = normalizeDate(date);

  const day = await prisma.palletStockDay.findUnique({
    where: { date: normalizedDate },
    include: { entries: true },
  });

  if (!day) return null;

  // Dodaj previousMorningStock do każdego wpisu
  const entriesWithPrevious = await Promise.all(
    day.entries.map(async (entry) => {
      const prevData = await getPreviousDayData(normalizedDate, entry.type);
      return { ...entry, previousMorningStock: prevData.morningStock };
    })
  );

  // Sprawdź czy można edytować
  const editCheck = await checkCanEditDay(normalizedDate);

  return {
    ...day,
    entries: entriesWithPrevious,
    canEdit: editCheck.canEdit,
    editBlockReason: editCheck.reason,
  };
}

/**
 * Pobiera listę dni w zakresie dat.
 */
export async function getDaysInRange(
  startDate: Date,
  endDate: Date
): Promise<PalletStockDayWithEntries[]> {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);

  const days = await prisma.palletStockDay.findMany({
    where: {
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    },
    include: { entries: true },
    orderBy: { date: 'asc' },
  });

  // Dodaj previousMorningStock i canEdit do każdego dnia
  return Promise.all(
    days.map(async (day) => {
      const entriesWithPrevious = await Promise.all(
        day.entries.map(async (entry) => {
          const prevData = await getPreviousDayData(day.date, entry.type);
          return { ...entry, previousMorningStock: prevData.morningStock };
        })
      );
      const editCheck = await checkCanEditDay(day.date);
      return {
        ...day,
        entries: entriesWithPrevious,
        canEdit: editCheck.canEdit,
        editBlockReason: editCheck.reason,
      };
    })
  );
}

/**
 * Pobiera dzisiejszy dzień z alertami.
 * Główna metoda dla dashboardu.
 */
export async function getTodayWithAlerts(): Promise<{
  day: PalletStockDayWithEntries;
  alerts: Alert[];
}> {
  const today = normalizeDate(new Date());

  // Pobierz lub utwórz dzisiejszy dzień
  const day = await getOrCreateDay(today);

  // Pobierz konfigurację alertów
  const config = await getAlertConfig();

  // Sprawdź alerty
  const alerts = await checkAlerts(day.entries, config);

  return { day, alerts };
}

// ============================================
// PALLET STOCK SERVICE CLASS (Wrapper)
// ============================================

/**
 * Klasa PalletStockService - wrapper dla funkcji serwisowych
 * Używana przez Handler i Routes (DI pattern)
 */
export class PalletStockService {
  constructor(_prisma: unknown) {
    // Prisma jest używana przez funkcje serwisowe bezpośrednio
  }

  /**
   * Pobiera dzień paletowy (lub tworzy nowy)
   */
  async getDay(date: string): Promise<PalletStockDayWithEntries & { alerts: Alert[] }> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Nieprawidłowy format daty');
    }

    const day = await getOrCreateDay(parsedDate);
    const config = await getAlertConfig();
    const alerts = await checkAlerts(day.entries, config);

    return { ...day, alerts };
  }

  /**
   * Aktualizuje wpisy dnia paletowego
   * Przyjmuje: used (użyte) i morningStock (stan poranny)
   * Wylicza automatycznie: produced = morningStock (dziś) - morningStock (poprzedni dzień) + used
   */
  async updateDay(
    date: string,
    entries: Array<{ type: string; used: number; morningStock: number }>
  ): Promise<PalletStockDayWithEntries & { alerts: Alert[] }> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Nieprawidłowy format daty');
    }

    const day = await updateDayEntries(parsedDate, entries);
    const config = await getAlertConfig();
    const alerts = await checkAlerts(day.entries, config);

    return { ...day, alerts };
  }

  /**
   * Zamyka dzień paletowy
   */
  async closeDay(date: string): Promise<PalletStockDayWithEntries> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Nieprawidłowy format daty');
    }

    return closeDay(parsedDate);
  }

  /**
   * Koryguje stan poranny
   */
  async correctMorningStock(
    date: string,
    input: { type: string; morningStock: number; note: string }
  ): Promise<PalletStockEntryWithPrevious> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Nieprawidłowy format daty');
    }

    return correctMorningStock(parsedDate, input.type, input.morningStock, input.note);
  }

  /**
   * Pobiera podsumowanie miesiąca
   */
  async getMonthSummary(year: number, month: number): Promise<MonthSummary> {
    return getMonthSummary(year, month);
  }

  /**
   * Pobiera kalendarz miesiąca ze statusami dni
   */
  async getCalendar(year: number, month: number): Promise<CalendarSummary> {
    return getCalendar(year, month);
  }

  /**
   * Pobiera konfigurację alertów
   */
  async getAlertConfig(): Promise<PalletAlertConfig[]> {
    return getAlertConfig();
  }

  /**
   * Aktualizuje konfigurację alertów
   */
  async updateAlertConfig(
    configs: Array<{ type: string; criticalThreshold: number }>
  ): Promise<PalletAlertConfig[]> {
    await updateAlertConfig(configs);
    return getAlertConfig();
  }

  /**
   * Pobiera stany początkowe palet
   */
  async getInitialStocks(): Promise<Array<{
    type: string;
    initialStock: number;
    startDate: Date;
    updatedAt: Date;
  }>> {
    return getAllInitialStocks();
  }

  /**
   * Ustawia stany początkowe palet
   */
  async setInitialStocks(
    startDate: string,
    stocks: Array<{ type: string; initialStock: number }>,
    updatedById?: number
  ): Promise<Array<{
    type: string;
    initialStock: number;
    startDate: Date;
    updatedAt: Date;
  }>> {
    const parsedDate = new Date(startDate);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Nieprawidłowy format daty');
    }

    await setInitialStocks(parsedDate, stocks, updatedById);
    return getAllInitialStocks();
  }
}
