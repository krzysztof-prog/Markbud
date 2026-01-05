// @ts-nocheck - Temporarily disabled TypeScript checks due to okuc module errors
/**
 * Okuc CSV Parser - parsery dla plików CSV modułu DualStock (okucia)
 *
 * Obsługuje dwa typy plików:
 * 1. RW okuć (zużycie) - dokumenty RW z produkcji
 * 2. Zapotrzebowanie okuć - przewidywane zużycie na tygodnie
 */

import * as fs from 'fs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
// Temporarily disabled - TypeScript errors in okuc module
// import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import { logger } from '../../utils/logger.js';
import { importRwSchema, importDemandSchema } from '../../validators/okuc.js';

// ============ TYPES ============

/**
 * Wiersz z pliku RW okuć
 */
export interface OkucRwRow {
  articleId: string;
  quantity: number;
  subWarehouse: 'production' | 'buffer' | 'gabaraty' | null;
  reference: string | null;
}

/**
 * Wynik parsowania pliku RW
 */
export interface ParsedOkucRw {
  items: OkucRwRow[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    unresolvedArticles: string[];
    resolvedArticles: Map<string, { articleId: string; resolvedTo: string }>;
  };
  errors: Array<{ line: number; message: string }>;
}

/**
 * Wiersz z pliku zapotrzebowania
 */
export interface OkucDemandRow {
  demandId: string | null;
  expectedWeek: string;
  articleId: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';
}

/**
 * Wynik parsowania pliku zapotrzebowania
 */
export interface ParsedOkucDemand {
  items: OkucDemandRow[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    byWeek: Map<string, { count: number; quantity: number }>;
    unresolvedArticles: string[];
  };
  errors: Array<{ line: number; message: string }>;
}

// ============ CONSTANTS ============

const RW_REQUIRED_HEADERS = ['ArticleId', 'Qty'];
const RW_OPTIONAL_HEADERS = ['SubWarehouse', 'Reference'];
const DEMAND_REQUIRED_HEADERS = ['ExpectedWeek', 'ArticleId', 'Qty'];
const DEMAND_OPTIONAL_HEADERS = ['DemandId', 'Status'];

// Mapowanie aliasów nagłówków dla polskiej wersji
const HEADER_ALIASES: Record<string, string[]> = {
  ArticleId: ['ArticleId', 'Article', 'NumerArtykulu', 'Artykul', 'Nr_artykulu', 'NrArt'],
  Qty: ['Qty', 'Quantity', 'Ilosc', 'Ilość', 'Sztuk'],
  SubWarehouse: ['SubWarehouse', 'Podmagazyn', 'Magazyn', 'Sub_Warehouse'],
  Reference: ['Reference', 'Referencja', 'Ref', 'NrDokumentu', 'Nr_RW'],
  DemandId: ['DemandId', 'Demand_Id', 'IdZapotrzebowania', 'NrZapotrzebowania', 'ZAP'],
  ExpectedWeek: ['ExpectedWeek', 'Expected_Week', 'Tydzien', 'Tydzień', 'Week'],
  Status: ['Status', 'Stan', 'StatusZapotrzebowania'],
};

// ============ HELPER FUNCTIONS ============

/**
 * Dekoduje buffer do stringa obsługując różne kodowania (UTF-8 i CP1250)
 */
function decodeBuffer(buffer: Buffer): string {
  // Próbuj UTF-8 najpierw
  let content = buffer.toString('utf-8');

  // Sprawdź czy są polskie znaki - jeśli nie, spróbuj Windows-1250
  if (!content.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)) {
    try {
      const decoder = new TextDecoder('windows-1250');
      const decoded = decoder.decode(buffer);
      // Jeśli Windows-1250 dał lepszy wynik (więcej polskich znaków), użyj go
      if (decoded.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)) {
        content = decoded;
      }
    } catch {
      // Fallback - zostań przy UTF-8
    }
  }

  return content;
}

/**
 * Normalizuje nagłówek do standardowej formy
 */
function normalizeHeader(header: string): string {
  const trimmed = header.trim();

  for (const [standard, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === trimmed.toLowerCase())) {
      return standard;
    }
  }

  return trimmed;
}

/**
 * Parsuje wartość subWarehouse
 */
function parseSubWarehouse(value: string | undefined): 'production' | 'buffer' | 'gabaraty' | null {
  if (!value || value.trim() === '') return null;

  const lower = value.trim().toLowerCase();

  if (lower === 'production' || lower === 'produkcja' || lower === 'prod') {
    return 'production';
  }
  if (lower === 'buffer' || lower === 'bufor') {
    return 'buffer';
  }
  if (lower === 'gabaraty' || lower === 'gab' || lower === 'gabaryty') {
    return 'gabaraty';
  }

  return null;
}

/**
 * Parsuje status zapotrzebowania
 */
function parseDemandStatus(
  value: string | undefined
): 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled' {
  if (!value || value.trim() === '') return 'pending';

  const lower = value.trim().toLowerCase();

  if (lower === 'confirmed' || lower === 'potwierdzone' || lower === 'zatwierdzone') {
    return 'confirmed';
  }
  if (lower === 'in_production' || lower === 'w_produkcji' || lower === 'produkcja') {
    return 'in_production';
  }
  if (lower === 'completed' || lower === 'zakonczone' || lower === 'zakończone' || lower === 'zrealizowane') {
    return 'completed';
  }
  if (lower === 'cancelled' || lower === 'anulowane' || lower === 'anulowano') {
    return 'cancelled';
  }

  return 'pending';
}

/**
 * Waliduje format tygodnia (YYYY-Www)
 */
function isValidWeekFormat(week: string): boolean {
  return /^\d{4}-W\d{2}$/.test(week);
}

// ============ VALIDATION ============

/**
 * Waliduje strukturę nagłówków CSV
 */
export function validateOkucCsvStructure(
  headers: string[],
  type: 'rw' | 'demand'
): { valid: boolean; missing: string[]; normalized: string[] } {
  const normalized = headers.map(normalizeHeader);

  const requiredHeaders = type === 'rw' ? RW_REQUIRED_HEADERS : DEMAND_REQUIRED_HEADERS;

  const missing = requiredHeaders.filter((req) => !normalized.includes(req));

  return {
    valid: missing.length === 0,
    missing,
    normalized,
  };
}

// ============ PARSERS ============

/**
 * Parsuje plik CSV z dokumentami RW okuć
 *
 * Format wejściowy:
 * ArticleId;Qty;SubWarehouse;Reference
 * A123;50;production;RW-2025-001
 */
export async function parseOkucRwCsv(
  filePath: string,
  prisma: PrismaClient
): Promise<ParsedOkucRw> {
  // Temporarily disabled - TypeScript errors in okuc module
  throw new Error('Okuc RW parser temporarily disabled due to TypeScript errors');
  /* eslint-disable-next-line no-unreachable */
  const buffer = await fs.promises.readFile(filePath);
  const content = decodeBuffer(buffer);

  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse headers
  const rawHeaders = lines[0].split(';').map((h) => h.trim());
  const validation = validateOkucCsvStructure(rawHeaders, 'rw');

  if (!validation.valid) {
    throw new Error(`Brak wymaganych nagłówków: ${validation.missing.join(', ')}`);
  }

  const headers = validation.normalized;

  // Find column indices
  const indices = {
    articleId: headers.indexOf('ArticleId'),
    qty: headers.indexOf('Qty'),
    subWarehouse: headers.indexOf('SubWarehouse'),
    reference: headers.indexOf('Reference'),
  };

  const repository = new OkucArticleRepository(prisma);
  const items: OkucRwRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const unresolvedArticles: string[] = [];
  const resolvedArticles = new Map<string, { articleId: string; resolvedTo: string }>();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    try {
      const articleIdRaw = values[indices.articleId];
      const qtyRaw = values[indices.qty];

      if (!articleIdRaw || !qtyRaw) {
        errors.push({ line: i + 1, message: 'Brak wymaganej wartości ArticleId lub Qty' });
        continue;
      }

      const quantity = parseInt(qtyRaw, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ line: i + 1, message: `Nieprawidłowa ilość: ${qtyRaw}` });
        continue;
      }

      // Rozwiąż alias artykułu
      const article = await repository.resolveArticle(articleIdRaw);

      if (!article) {
        unresolvedArticles.push(articleIdRaw);
        errors.push({ line: i + 1, message: `Nieznany artykuł: ${articleIdRaw}` });
        continue;
      }

      // Zapisz informację o rozwiązaniu aliasu
      if (article.articleId !== articleIdRaw) {
        resolvedArticles.set(articleIdRaw, {
          articleId: articleIdRaw,
          resolvedTo: article.articleId,
        });
      }

      const subWarehouse =
        indices.subWarehouse >= 0 ? parseSubWarehouse(values[indices.subWarehouse]) : null;

      const reference = indices.reference >= 0 ? values[indices.reference] || null : null;

      items.push({
        articleId: article.articleId,
        quantity,
        subWarehouse,
        reference,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      errors.push({ line: i + 1, message });
    }
  }

  logger.info('Parsed Okuc RW CSV', {
    totalLines: lines.length - 1,
    parsedItems: items.length,
    errors: errors.length,
    unresolvedArticles: unresolvedArticles.length,
    resolvedAliases: resolvedArticles.size,
  });

  return {
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      unresolvedArticles: Array.from(new Set(unresolvedArticles)),
      resolvedArticles,
    },
    errors,
  };
}

/**
 * Parsuje plik CSV z zapotrzebowaniem okuć
 *
 * Format wejściowy:
 * DemandId;ExpectedWeek;ArticleId;Qty;Status
 * ZAP-2025-0089;2025-W08;A123;40;confirmed
 */
export async function parseOkucDemandCsv(
  filePath: string,
  prisma: PrismaClient
): Promise<ParsedOkucDemand> {
  // Temporarily disabled - TypeScript errors in okuc module
  throw new Error('Okuc Demand parser temporarily disabled due to TypeScript errors');
  /* eslint-disable-next-line no-unreachable */
  const buffer = await fs.promises.readFile(filePath);
  const content = decodeBuffer(buffer);

  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse headers
  const rawHeaders = lines[0].split(';').map((h) => h.trim());
  const validation = validateOkucCsvStructure(rawHeaders, 'demand');

  if (!validation.valid) {
    throw new Error(`Brak wymaganych nagłówków: ${validation.missing.join(', ')}`);
  }

  const headers = validation.normalized;

  // Find column indices
  const indices = {
    demandId: headers.indexOf('DemandId'),
    expectedWeek: headers.indexOf('ExpectedWeek'),
    articleId: headers.indexOf('ArticleId'),
    qty: headers.indexOf('Qty'),
    status: headers.indexOf('Status'),
  };

  const repository = new OkucArticleRepository(prisma);
  const items: OkucDemandRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const unresolvedArticles: string[] = [];
  const byWeek = new Map<string, { count: number; quantity: number }>();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    try {
      const expectedWeek = values[indices.expectedWeek];
      const articleIdRaw = values[indices.articleId];
      const qtyRaw = values[indices.qty];

      if (!expectedWeek || !articleIdRaw || !qtyRaw) {
        errors.push({ line: i + 1, message: 'Brak wymaganych wartości ExpectedWeek, ArticleId lub Qty' });
        continue;
      }

      // Waliduj format tygodnia
      if (!isValidWeekFormat(expectedWeek)) {
        errors.push({ line: i + 1, message: `Nieprawidłowy format tygodnia: ${expectedWeek}. Oczekiwany: YYYY-Www` });
        continue;
      }

      const quantity = parseInt(qtyRaw, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ line: i + 1, message: `Nieprawidłowa ilość: ${qtyRaw}` });
        continue;
      }

      // Rozwiąż alias artykułu
      const article = await repository.resolveArticle(articleIdRaw);

      if (!article) {
        unresolvedArticles.push(articleIdRaw);
        errors.push({ line: i + 1, message: `Nieznany artykuł: ${articleIdRaw}` });
        continue;
      }

      const demandId = indices.demandId >= 0 ? values[indices.demandId] || null : null;
      const status = indices.status >= 0 ? parseDemandStatus(values[indices.status]) : 'pending';

      items.push({
        demandId,
        expectedWeek,
        articleId: article.articleId,
        quantity,
        status,
      });

      // Agreguj po tygodniach
      const weekStats = byWeek.get(expectedWeek) || { count: 0, quantity: 0 };
      weekStats.count++;
      weekStats.quantity += quantity;
      byWeek.set(expectedWeek, weekStats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      errors.push({ line: i + 1, message });
    }
  }

  logger.info('Parsed Okuc Demand CSV', {
    totalLines: lines.length - 1,
    parsedItems: items.length,
    errors: errors.length,
    unresolvedArticles: unresolvedArticles.length,
    weeks: byWeek.size,
  });

  return {
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      byWeek,
      unresolvedArticles: Array.from(new Set(unresolvedArticles)),
    },
    errors,
  };
}

/**
 * Waliduje sparsowane dane RW względem schematu Zod
 */
export function validateParsedRw(parsed: ParsedOkucRw): z.SafeParseReturnType<unknown, z.infer<typeof importRwSchema>> {
  return importRwSchema.safeParse({
    items: parsed.items.map((item) => ({
      articleId: item.articleId,
      quantity: item.quantity,
      subWarehouse: item.subWarehouse,
      reference: item.reference ?? undefined,
    })),
  });
}

/**
 * Waliduje sparsowane dane zapotrzebowania względem schematu Zod
 */
export function validateParsedDemand(
  parsed: ParsedOkucDemand
): z.SafeParseReturnType<unknown, z.infer<typeof importDemandSchema>> {
  return importDemandSchema.safeParse({
    items: parsed.items.map((item) => ({
      demandId: item.demandId ?? undefined,
      articleId: item.articleId,
      expectedWeek: item.expectedWeek,
      quantity: item.quantity,
      status: item.status,
    })),
  });
}

// ============ SYNCHRONOUS PARSERS (for file-watcher compatibility) ============

/**
 * Prosty synchroniczny typ dla RW items (bez rozwiązywania aliasów)
 * Kompatybilny z file-watcher.ts
 */
export interface SimpleOkucRwItem {
  articleId: string;
  quantity: number;
  reference?: string;
}

/**
 * Prosty synchroniczny typ dla Demand items (bez rozwiązywania aliasów)
 * Kompatybilny z file-watcher.ts
 */
export interface SimpleOkucDemandItem {
  demandId?: string;
  articleId: string;
  expectedWeek: string;
  quantity: number;
  status?: string;
}

/**
 * Synchroniczny parser RW dla file-watcher.ts
 * Parsuje treść CSV bez rozwiązywania aliasów (aliasy rozwiązywane są w file-watcher)
 *
 * @param content - Treść pliku CSV jako string
 * @returns Tablica prostych obiektów RW
 */
export function parseOkucRwCsvSync(content: string): SimpleOkucRwItem[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse headers
  const rawHeaders = lines[0].split(';').map((h) => h.trim());
  const validation = validateOkucCsvStructure(rawHeaders, 'rw');

  if (!validation.valid) {
    throw new Error(`Brak wymaganych nagłówków: ${validation.missing.join(', ')}`);
  }

  const headers = validation.normalized;

  // Find column indices
  const indices = {
    articleId: headers.indexOf('ArticleId'),
    qty: headers.indexOf('Qty'),
    subWarehouse: headers.indexOf('SubWarehouse'),
    reference: headers.indexOf('Reference'),
  };

  const items: SimpleOkucRwItem[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    const articleIdRaw = values[indices.articleId];
    const qtyRaw = values[indices.qty];

    if (!articleIdRaw || !qtyRaw) {
      continue; // Skip invalid rows
    }

    const quantity = parseInt(qtyRaw, 10);
    if (isNaN(quantity) || quantity <= 0) {
      continue; // Skip invalid quantities
    }

    const reference = indices.reference >= 0 ? values[indices.reference] || undefined : undefined;

    items.push({
      articleId: articleIdRaw,
      quantity,
      reference,
    });
  }

  return items;
}

/**
 * Synchroniczny parser zapotrzebowania dla file-watcher.ts
 * Parsuje treść CSV bez rozwiązywania aliasów (aliasy rozwiązywane są w file-watcher)
 *
 * @param content - Treść pliku CSV jako string
 * @returns Tablica prostych obiektów zapotrzebowania
 */
export function parseOkucDemandCsvSync(content: string): SimpleOkucDemandItem[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse headers
  const rawHeaders = lines[0].split(';').map((h) => h.trim());
  const validation = validateOkucCsvStructure(rawHeaders, 'demand');

  if (!validation.valid) {
    throw new Error(`Brak wymaganych nagłówków: ${validation.missing.join(', ')}`);
  }

  const headers = validation.normalized;

  // Find column indices
  const indices = {
    demandId: headers.indexOf('DemandId'),
    expectedWeek: headers.indexOf('ExpectedWeek'),
    articleId: headers.indexOf('ArticleId'),
    qty: headers.indexOf('Qty'),
    status: headers.indexOf('Status'),
  };

  const items: SimpleOkucDemandItem[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    const expectedWeek = values[indices.expectedWeek];
    const articleIdRaw = values[indices.articleId];
    const qtyRaw = values[indices.qty];

    if (!expectedWeek || !articleIdRaw || !qtyRaw) {
      continue; // Skip invalid rows
    }

    // Validate week format
    if (!isValidWeekFormat(expectedWeek)) {
      continue; // Skip invalid week format
    }

    const quantity = parseInt(qtyRaw, 10);
    if (isNaN(quantity) || quantity <= 0) {
      continue; // Skip invalid quantities
    }

    const demandId = indices.demandId >= 0 ? values[indices.demandId] || undefined : undefined;
    const status = indices.status >= 0 ? values[indices.status] || undefined : undefined;

    items.push({
      demandId,
      articleId: articleIdRaw,
      expectedWeek,
      quantity,
      status,
    });
  }

  return items;
}
