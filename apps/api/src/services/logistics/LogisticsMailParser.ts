/**
 * Parser maili logistycznych od Akrobud
 *
 * Parsuje tekst maila z listą projektów na dostawę i zwraca ustrukturyzowane dane.
 * Parser jest deterministyczny - nie używa AI, tylko regex i reguły.
 */

// Typy flag pozycji
export type ItemFlag =
  | 'REQUIRES_MESH'
  | 'MISSING_FILE'
  | 'UNCONFIRMED'
  | 'DIMENSIONS_UNCONFIRMED'
  | 'DRAWING_UNCONFIRMED'
  | 'EXCLUDE_FROM_PRODUCTION'
  | 'SPECIAL_HANDLE'
  | 'CUSTOM_COLOR';

// Sparsowana pozycja z maila
export interface ParsedItem {
  position: number;
  projectNumber: string;
  quantity: number;
  rawNotes: string;
  flags: ItemFlag[];
  customColor?: string; // RAL XXXX jeśli wykryto
}

// Sparsowana dostawa (Klient nr X)
export interface ParsedDelivery {
  deliveryCode: string; // np. "16.02.2026_I"
  deliveryIndex: number; // 1, 2, 3...
  clientLabel?: string; // "Klient nr 1"
  items: ParsedItem[];
}

// Wynik parsowania daty
export interface ParsedDate {
  suggested: string; // "2026-02-16"
  source: 'parsed' | 'not_found';
  confidence: 'high' | 'low';
}

// Główny wynik parsowania
export interface ParsedMail {
  deliveryDate: ParsedDate;
  isUpdate: boolean;
  deliveries: ParsedDelivery[];
  warnings: string[];
}

// Mapowanie fraz na flagi
const FLAG_PATTERNS: { pattern: RegExp; flag: ItemFlag }[] = [
  { pattern: /poproszę?\s*o?\s*siatkę/i, flag: 'REQUIRES_MESH' },
  { pattern: /brak\s*pliku/i, flag: 'MISSING_FILE' },
  { pattern: /wymiary?\s*niepotwierdzone?/i, flag: 'DIMENSIONS_UNCONFIRMED' },
  { pattern: /rysunek\s*niepotwierdzony/i, flag: 'DRAWING_UNCONFIRMED' },
  { pattern: /szprosy?\s*\/?\s*rysunek\s*niepotwierdzony/i, flag: 'DRAWING_UNCONFIRMED' },
  { pattern: /niepotwierdzone?/i, flag: 'UNCONFIRMED' },
  { pattern: /plik\s*przesłany\s*\/?\s*wymiary?\s*niepotwierdzone?/i, flag: 'DIMENSIONS_UNCONFIRMED' },
  { pattern: /bez\s*okna/i, flag: 'EXCLUDE_FROM_PRODUCTION' },
  { pattern: /brak\s*okna/i, flag: 'EXCLUDE_FROM_PRODUCTION' },
  { pattern: /klamka\s*alu\s*z\s*kluczem/i, flag: 'SPECIAL_HANDLE' },
];

// Wzorzec RAL
const RAL_PATTERN = /RAL\s*(\d{4})/i;

// Wzorzec numeru projektu: litera + 3-5 cyfr
const PROJECT_NUMBER_PATTERN = /\b([A-Z]\d{3,5})\b/g;

// Wzorzec daty: na DD.MM lub na DD.MM.YYYY
const DATE_PATTERN = /na\s+(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/gi;

// Wzorzec "Klient nr X"
const CLIENT_PATTERN = /Klient\s*nr\s*(\d+)/gi;

// Wzorzec "ZALEGŁE (klient nr X)" - pozycje zaległe należą do tego samego klienta
const BACKLOG_PATTERN = /ZALEG[ŁL]E\s*\(?\s*klient\s*nr\s*(\d+)\s*\)?/gi;

// Wzorzec ilości: x2, x 2, x3 itp.
const QUANTITY_PATTERN = /x\s*(\d+)/i;

// Konwersja indeksu na numerację rzymską
function indexToRoman(index: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[index - 1] || index.toString();
}

// Formatowanie daty do kodu dostawy (DD.MM.YYYY)
function formatDeliveryCode(date: Date, index: number): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}_${indexToRoman(index)}`;
}

// Parsowanie daty z tekstu
function parseDate(text: string): ParsedDate {
  const matches: { day: number; month: number; year?: number }[] = [];
  let match;

  // Reset regex
  DATE_PATTERN.lastIndex = 0;

  while ((match = DATE_PATTERN.exec(text)) !== null) {
    matches.push({
      day: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      year: match[3] ? parseInt(match[3], 10) : undefined,
    });
  }

  if (matches.length === 0) {
    return {
      suggested: '',
      source: 'not_found',
      confidence: 'low',
    };
  }

  // Bierzemy pierwszą znalezioną datę
  const { day, month, year: parsedYear } = matches[0];

  // Ustalanie roku
  let year = parsedYear;
  if (!year) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const _currentMonth = now.getMonth() + 1;
    const _currentDay = now.getDate();

    // Jeśli data jest >60 dni wstecz, użyj następnego roku
    const testDate = new Date(currentYear, month - 1, day);
    const diffDays = (now.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 60) {
      year = currentYear + 1;
    } else {
      year = currentYear;
    }
  }

  // Formatowanie do ISO
  const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  return {
    suggested: isoDate,
    source: 'parsed',
    confidence: matches.length === 1 ? 'high' : 'low',
  };
}

// Wykrywanie flag z tekstu adnotacji
function detectFlags(text: string): { flags: ItemFlag[]; customColor?: string } {
  const flags: ItemFlag[] = [];
  let customColor: string | undefined;

  // Sprawdź wzorce flag
  for (const { pattern, flag } of FLAG_PATTERNS) {
    if (pattern.test(text)) {
      // Unikaj duplikatów
      if (!flags.includes(flag)) {
        // Specjalna logika: UNCONFIRMED nie dodawaj jeśli już jest DIMENSIONS_UNCONFIRMED lub DRAWING_UNCONFIRMED
        if (
          flag === 'UNCONFIRMED' &&
          (flags.includes('DIMENSIONS_UNCONFIRMED') || flags.includes('DRAWING_UNCONFIRMED'))
        ) {
          continue;
        }
        flags.push(flag);
      }
    }
  }

  // Sprawdź RAL
  const ralMatch = text.match(RAL_PATTERN);
  if (ralMatch) {
    flags.push('CUSTOM_COLOR');
    customColor = `RAL ${ralMatch[1]}`;
  }

  return { flags, customColor };
}

// Parsowanie ilości z adnotacji
function parseQuantity(text: string): number {
  const match = text.match(QUANTITY_PATTERN);
  return match ? parseInt(match[1], 10) : 1;
}

// Wykrywanie sekcji "Klient nr X" oraz "ZALEGŁE (klient nr X)"
// Sekcja ZALEGŁE należy do tego samego klienta co odpowiadający "Klient nr X"
function findClientSections(text: string): { clientNumber: number; startIndex: number; isBacklog: boolean }[] {
  const allSections: { clientNumber: number; startIndex: number; isBacklog: boolean }[] = [];

  // Znajdź wszystkie sekcje "Klient nr X"
  CLIENT_PATTERN.lastIndex = 0;
  let match;
  while ((match = CLIENT_PATTERN.exec(text)) !== null) {
    allSections.push({
      clientNumber: parseInt(match[1], 10),
      startIndex: match.index,
      isBacklog: false,
    });
  }

  // Znajdź wszystkie sekcje "ZALEGŁE (klient nr X)"
  BACKLOG_PATTERN.lastIndex = 0;
  while ((match = BACKLOG_PATTERN.exec(text)) !== null) {
    allSections.push({
      clientNumber: parseInt(match[1], 10),
      startIndex: match.index,
      isBacklog: true,
    });
  }

  // Sortuj po pozycji w tekście
  allSections.sort((a, b) => a.startIndex - b.startIndex);

  return allSections;
}

// Parsowanie pozycji z tekstu
function parseItems(text: string): ParsedItem[] {
  const lines = text.split('\n');

  // Mapa do deduplikacji: projectNumber -> item
  const itemsMap = new Map<string, ParsedItem>();
  let tempPosition = 0;

  for (const line of lines) {
    // Szukaj numerów projektów w linii
    const projectMatches = line.match(PROJECT_NUMBER_PATTERN);

    if (projectMatches) {
      // Deduplikacja w ramach linii - każdy numer projektu tylko raz
      const uniqueProjects = [...new Set(projectMatches)];

      for (const projectNumber of uniqueProjects) {
        // Cała linia jako adnotacje (do analizy flag)
        const rawNotes = line.trim();

        // Wykryj flagi
        const { flags, customColor } = detectFlags(rawNotes);

        // Sprawdź czy w kolumnie "Siatka" jest "poproszę o siatkę"
        // (często jest osobna kolumna, więc sprawdzamy całą linię)
        if (/siatk[ęa]/i.test(rawNotes) && !flags.includes('REQUIRES_MESH')) {
          flags.push('REQUIRES_MESH');
        }

        // Parsuj ilość
        const quantity = parseQuantity(rawNotes);

        // Sprawdź czy już mamy ten numer projektu
        const existing = itemsMap.get(projectNumber);

        if (existing) {
          // Scalamy flagi (unikalne) i zachowujemy większą ilość
          const mergedFlags = [...new Set([...existing.flags, ...flags])] as ItemFlag[];
          existing.flags = mergedFlags;
          existing.quantity = Math.max(existing.quantity, quantity);
          // Zachowujemy customColor jeśli istnieje
          if (customColor && !existing.customColor) {
            existing.customColor = customColor;
          }
        } else {
          tempPosition++;
          itemsMap.set(projectNumber, {
            position: tempPosition,
            projectNumber,
            quantity,
            rawNotes,
            flags,
            customColor,
          });
        }
      }
    }
  }

  // Konwersja mapy na tablicę i przenumerowanie pozycji
  const items = Array.from(itemsMap.values());
  items.forEach((item, index) => {
    item.position = index + 1;
  });

  return items;
}

/**
 * Główna funkcja parsująca mail
 */
export function parseLogisticsMail(mailText: string): ParsedMail {
  const warnings: string[] = [];

  // 1. Parsuj datę
  const deliveryDate = parseDate(mailText);

  if (deliveryDate.source === 'not_found') {
    warnings.push('Nie znaleziono daty dostawy');
  } else if (deliveryDate.confidence === 'low') {
    warnings.push('Wykryto wiele dat - sprawdź poprawność');
  }

  // 2. Sprawdź czy to aktualizacja
  const isUpdate = /aktualizacj[ęa]/i.test(mailText);

  if (isUpdate) {
    warnings.push('To jest aktualizacja listy');
  }

  // 3. Znajdź sekcje "Klient nr X"
  const clientSections = findClientSections(mailText);

  // 4. Parsuj dostawy
  const deliveries: ParsedDelivery[] = [];

  if (clientSections.length === 0) {
    // Brak sekcji "Klient nr X" - jedna dostawa
    const items = parseItems(mailText);

    if (items.length === 0) {
      warnings.push('Nie znaleziono żadnych pozycji');
    }

    const deliveryCode =
      deliveryDate.source === 'parsed'
        ? formatDeliveryCode(new Date(deliveryDate.suggested), 1)
        : 'UNKNOWN_I';

    deliveries.push({
      deliveryCode,
      deliveryIndex: 1,
      items,
    });
  } else {
    // Wiele sekcji - grupuj ZALEGŁE z odpowiadającym "Klient nr X"
    // Mapa: clientNumber -> wszystkie pozycje (z ZALEGŁE + z głównej sekcji)
    const clientItems = new Map<number, ParsedItem[]>();
    const clientOrder: number[] = []; // Kolejność klientów (dla zachowania porządku)

    for (let i = 0; i < clientSections.length; i++) {
      const section = clientSections[i];
      const nextSection = clientSections[i + 1];

      // Wytnij tekst dla tej sekcji
      const startIndex = section.startIndex;
      const endIndex = nextSection ? nextSection.startIndex : mailText.length;
      const sectionText = mailText.substring(startIndex, endIndex);

      const items = parseItems(sectionText);

      // Dodaj do mapy pozycji dla tego klienta
      const existing = clientItems.get(section.clientNumber) || [];
      clientItems.set(section.clientNumber, [...existing, ...items]);

      // Zapamiętaj kolejność klientów (tylko dla nie-ZALEGŁE sekcji)
      if (!section.isBacklog && !clientOrder.includes(section.clientNumber)) {
        clientOrder.push(section.clientNumber);
      }
    }

    // Dla klientów z ZALEGŁE ale bez głównej sekcji - dodaj do kolejności
    for (const section of clientSections) {
      if (section.isBacklog && !clientOrder.includes(section.clientNumber)) {
        clientOrder.push(section.clientNumber);
      }
    }

    // Utwórz dostawy w kolejności klientów
    let deliveryIndex = 0;
    for (const clientNumber of clientOrder) {
      deliveryIndex++;
      const items = clientItems.get(clientNumber) || [];

      // Przenumeruj pozycje (position) bo mogły być z różnych sekcji
      items.forEach((item, idx) => {
        item.position = idx + 1;
      });

      const deliveryCode =
        deliveryDate.source === 'parsed'
          ? formatDeliveryCode(new Date(deliveryDate.suggested), deliveryIndex)
          : `UNKNOWN_${indexToRoman(deliveryIndex)}`;

      deliveries.push({
        deliveryCode,
        deliveryIndex,
        clientLabel: `Klient nr ${clientNumber}`,
        items,
      });
    }
  }

  // 5. Sprawdź czy są pozycje bez rozpoznanych flag (ale z adnotacjami)
  for (const delivery of deliveries) {
    for (const item of delivery.items) {
      // Jeśli są adnotacje (poza samym numerem projektu) ale brak flag
      const notesWithoutProjectNumber = item.rawNotes
        .replace(PROJECT_NUMBER_PATTERN, '')
        .replace(/\d+\./g, '') // Usuń "1.", "2." itp.
        .replace(/Lp\.?/gi, '')
        .replace(/Nr\.?/gi, '')
        .replace(/Adnotacje?/gi, '')
        .replace(/Siatka?/gi, '')
        .replace(/-/g, '')
        .trim();

      if (notesWithoutProjectNumber.length > 5 && item.flags.length === 0) {
        warnings.push(`Nierozpoznane adnotacje w pozycji ${item.projectNumber}`);
      }
    }
  }

  return {
    deliveryDate,
    isUpdate,
    deliveries,
    warnings,
  };
}

/**
 * Wylicza status pozycji na podstawie flag
 */
export function calculateItemStatus(
  flags: ItemFlag[]
): 'ok' | 'blocked' | 'waiting' | 'excluded' {
  // 1. Sprawdź czy wyłączone z produkcji
  if (flags.includes('EXCLUDE_FROM_PRODUCTION')) {
    return 'excluded';
  }

  // 2. Sprawdź flagi blokujące
  const blockingFlags: ItemFlag[] = [
    'MISSING_FILE',
    'UNCONFIRMED',
    'DIMENSIONS_UNCONFIRMED',
    'DRAWING_UNCONFIRMED',
  ];

  for (const flag of blockingFlags) {
    if (flags.includes(flag)) {
      return 'blocked';
    }
  }

  // 3. Sprawdź czy czeka na siatkę
  if (flags.includes('REQUIRES_MESH')) {
    return 'waiting';
  }

  // 4. Brak flag - OK
  return 'ok';
}

/**
 * Wylicza status dostawy na podstawie statusów pozycji
 */
export function calculateDeliveryStatus(
  itemStatuses: ('ok' | 'blocked' | 'waiting' | 'excluded')[]
): 'ready' | 'blocked' | 'conditional' {
  const hasBlocked = itemStatuses.includes('blocked');
  const hasWaiting = itemStatuses.includes('waiting');

  if (hasBlocked) {
    return 'blocked';
  }

  if (hasWaiting) {
    return 'conditional';
  }

  return 'ready';
}
