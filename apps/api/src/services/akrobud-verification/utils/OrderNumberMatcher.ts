/**
 * OrderNumberMatcher - Logika dopasowywania numerów zleceń
 *
 * Odpowiada za:
 * - Wyszukiwanie zleceń w bazie po numerze
 * - Obsługa wariantów (sufiksy A, B, C)
 * - Fuzzy matching - dopasowanie częściowe
 */

import type { PrismaClient } from '@prisma/client';
import { CsvParser } from '../../parsers/csv-parser.js';

// ===================
// Types
// ===================

/**
 * Status dopasowania zlecenia
 */
export type MatchStatus = 'found' | 'variant_match' | 'not_found';

/**
 * Wynik dopasowania pojedynczego zlecenia
 */
export interface OrderMatchResult {
  order: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
  };
  matchStatus: 'found' | 'variant_match';
}

/**
 * Sparsowany numer zlecenia
 */
export interface ParsedOrderNumber {
  base: string;
  suffix: string | null;
  full: string;
}

// ===================
// OrderNumberMatcher
// ===================

export class OrderNumberMatcher {
  private csvParser: CsvParser;

  constructor(private prisma: PrismaClient) {
    this.csvParser = new CsvParser();
  }

  /**
   * Parsuje numer zlecenia na bazowy i sufiks
   * Deleguje do CsvParser dla spójności
   */
  parseOrderNumber(orderNumber: string): ParsedOrderNumber {
    return this.csvParser.parseOrderNumber(orderNumber);
  }

  /**
   * Szuka dopasowanego zlecenia w bazie
   * Strategia wyszukiwania:
   * 1. Dokładne dopasowanie po pełnym numerze
   * 2. Dopasowanie po numerze bazowym (bez sufiksu)
   * 3. Wyszukanie wariantów (prefix match)
   *
   * @param orderNumberInput - Numer zlecenia z listy weryfikacyjnej
   * @param orderNumberBase - Opcjonalny numer bazowy (jeśli już sparsowany)
   * @returns Wynik dopasowania lub null jeśli nie znaleziono
   */
  async findMatchingOrder(
    orderNumberInput: string,
    orderNumberBase?: string
  ): Promise<OrderMatchResult | null> {
    // Jeśli nie podano base, parsuj numer
    const base = orderNumberBase ?? this.parseOrderNumber(orderNumberInput).base;

    // 1. Szukaj dokładnego dopasowania
    const exactMatch = await this.prisma.order.findUnique({
      where: { orderNumber: orderNumberInput },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
    });

    if (exactMatch) {
      return { order: exactMatch, matchStatus: 'found' };
    }

    // 2. Szukaj po bazie (bez sufiksu) - tylko jeśli różne od input
    if (base !== orderNumberInput) {
      const baseMatch = await this.prisma.order.findUnique({
        where: { orderNumber: base },
        select: {
          id: true,
          orderNumber: true,
          client: true,
          project: true,
        },
      });

      if (baseMatch) {
        return { order: baseMatch, matchStatus: 'variant_match' };
      }
    }

    // 3. Szukaj wariantów (np. input="52341" szuka "52341-a", "52341a" itd.)
    const variants = await this.prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { startsWith: `${base}-` } },
          { orderNumber: { startsWith: base, contains: base } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
      take: 1,
    });

    if (variants.length > 0) {
      return { order: variants[0], matchStatus: 'variant_match' };
    }

    return null;
  }

  /**
   * Batch wyszukiwanie - dla wielu numerów zleceń
   * Optymalizuje zapytania do bazy
   *
   * @param orderNumbers - Lista numerów do wyszukania
   * @returns Mapa numer -> wynik dopasowania
   */
  async findMatchingOrdersBatch(
    orderNumbers: Array<{ input: string; base: string }>
  ): Promise<Map<string, OrderMatchResult | null>> {
    const results = new Map<string, OrderMatchResult | null>();

    // Pobierz wszystkie unikalne numery bazowe i pełne
    const allInputs = new Set(orderNumbers.map((o) => o.input));
    const allBases = new Set(orderNumbers.map((o) => o.base));

    // Batch query dla dokładnych dopasowań
    const exactMatches = await this.prisma.order.findMany({
      where: {
        orderNumber: { in: [...allInputs] },
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
    });

    // Mapa dla szybkiego lookup
    const exactMatchMap = new Map(exactMatches.map((o) => [o.orderNumber, o]));

    // Batch query dla dopasowań bazowych
    const baseMatches = await this.prisma.order.findMany({
      where: {
        orderNumber: { in: [...allBases] },
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
    });

    const baseMatchMap = new Map(baseMatches.map((o) => [o.orderNumber, o]));

    // Przetworz każdy numer
    for (const { input, base } of orderNumbers) {
      // 1. Sprawdź dokładne dopasowanie
      const exact = exactMatchMap.get(input);
      if (exact) {
        results.set(input, { order: exact, matchStatus: 'found' });
        continue;
      }

      // 2. Sprawdź dopasowanie bazowe
      const baseOrder = baseMatchMap.get(base);
      if (baseOrder && base !== input) {
        results.set(input, { order: baseOrder, matchStatus: 'variant_match' });
        continue;
      }

      // 3. Dla wariantów - indywidualne zapytanie (rzadki przypadek)
      const variantResult = await this.findVariantMatch(base);
      results.set(input, variantResult);
    }

    return results;
  }

  /**
   * Wyszukuje wariant zlecenia po numerze bazowym
   * Używane gdy dokładne i bazowe dopasowanie nie znalazły wyniku
   */
  private async findVariantMatch(base: string): Promise<OrderMatchResult | null> {
    const variants = await this.prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { startsWith: `${base}-` } },
          { orderNumber: { startsWith: base, contains: base } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
      take: 1,
    });

    if (variants.length > 0) {
      return { order: variants[0], matchStatus: 'variant_match' };
    }

    return null;
  }

  /**
   * Sprawdza czy numer zlecenia istnieje w bazie
   * Szybka weryfikacja bez pobierania pełnych danych
   */
  async orderExists(orderNumber: string): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: { orderNumber },
    });
    return count > 0;
  }

  /**
   * Pobiera pełne dane zlecenia po ID
   */
  async getOrderById(orderId: number): Promise<{
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
  } | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        status: true,
      },
    });
  }
}
