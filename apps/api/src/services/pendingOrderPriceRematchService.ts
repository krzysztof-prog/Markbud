/**
 * PendingOrderPrice Rematch Service
 *
 * Ponowne dopasowanie istniejących pending prices do zleceń.
 * Używa tych samych strategii co CSV import (w tym multi-projekt).
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { PdfParser } from './parsers/pdf-parser.js';
import { plnToGrosze, eurToCenty } from '@markbud/shared';
import path from 'path';

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

interface RematchResult {
  matched: number;
  skipped: number;
  noMatch: number;
  errors: string[];
  details: Array<{
    pendingId: number;
    orderNumber: string;
    reference: string | null;
    result: 'matched' | 'skipped' | 'no_match' | 'error';
    matchedOrderNumber?: string;
    matchedOrderId?: number;
    currency?: string;
    reason?: string;
  }>;
}

export class PendingOrderPriceRematchService {
  constructor(private prisma: PrismaClient) {}

  async rematchAll(): Promise<RematchResult> {
    const result: RematchResult = {
      matched: 0,
      skipped: 0,
      noMatch: 0,
      errors: [],
      details: [],
    };

    const pendingPrices = await this.prisma.pendingOrderPrice.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`[Rematch] Znaleziono ${pendingPrices.length} pending prices do dopasowania`);

    for (const pp of pendingPrices) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const matchResult = await this.tryMatch(tx, pp);

          if (matchResult.status === 'no_match') {
            result.noMatch++;
            result.details.push({
              pendingId: pp.id,
              orderNumber: pp.orderNumber,
              reference: pp.reference,
              result: 'no_match',
              currency: pp.currency,
            });
            return;
          }

          if (matchResult.status === 'skipped') {
            result.skipped++;
            result.details.push({
              pendingId: pp.id,
              orderNumber: pp.orderNumber,
              reference: pp.reference,
              result: 'skipped',
              matchedOrderNumber: matchResult.order!.orderNumber,
              matchedOrderId: matchResult.order!.id,
              currency: pp.currency,
              reason: matchResult.reason,
            });
            return;
          }

          // Apply price
          const order = matchResult.order!;
          const isAkrobud = (order.client ?? '').toUpperCase().includes('AKROBUD');

          await tx.order.update({
            where: { id: order.id },
            data: pp.currency === 'EUR'
              ? {
                  valueEur: pp.valueNetto,
                  ...(isAkrobud ? { windowsNetValue: pp.valueNetto } : {}),
                }
              : { valuePln: pp.valueNetto },
          });

          await tx.pendingOrderPrice.update({
            where: { id: pp.id },
            data: {
              status: 'applied',
              appliedAt: new Date(),
              appliedToOrderId: order.id,
            },
          });

          result.matched++;
          result.details.push({
            pendingId: pp.id,
            orderNumber: pp.orderNumber,
            reference: pp.reference,
            result: 'matched',
            matchedOrderNumber: order.orderNumber,
            matchedOrderId: order.id,
            currency: pp.currency,
          });

          logger.info(
            `[Rematch] Dopasowano: pending #${pp.id} (${pp.orderNumber}/${pp.reference}) -> zlecenie ${order.orderNumber} (${pp.currency} ${pp.valueNetto / 100})`
          );
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
        result.errors.push(`Pending #${pp.id}: ${errMsg}`);
        result.details.push({
          pendingId: pp.id,
          orderNumber: pp.orderNumber,
          reference: pp.reference,
          result: 'error',
          reason: errMsg,
        });
        logger.warn(`[Rematch] Błąd dla pending #${pp.id}: ${errMsg}`);
      }
    }

    logger.info(
      `[Rematch] Zakończono: matched=${result.matched}, skipped=${result.skipped}, noMatch=${result.noMatch}, errors=${result.errors.length}`
    );

    return result;
  }

  private async tryMatch(
    tx: PrismaTransaction,
    pp: { id: number; orderNumber: string; reference: string | null; currency: string; filename: string }
  ): Promise<{
    status: 'matched' | 'skipped' | 'no_match';
    order?: { id: number; orderNumber: string; client: string | null; valueEur: number | null; valuePln: number | null };
    reason?: string;
  }> {
    const orderSelect = { id: true, orderNumber: true, client: true, valueEur: true, valuePln: true } as const;
    const activeFilter = { deletedAt: null, archivedAt: null };

    // Strategia 1: Exact match po orderNumber
    if (pp.orderNumber !== 'UNKNOWN') {
      const order = await tx.order.findFirst({
        where: { orderNumber: pp.orderNumber, ...activeFilter },
        select: orderSelect,
      });
      if (order) return this.checkCurrency(order, pp.currency);

      // Strategia 2: Prefix match - pending "53526" -> zlecenie "53526-a"
      const suffixOrders = await tx.order.findMany({
        where: {
          orderNumber: { startsWith: pp.orderNumber + '-' },
          ...activeFilter,
        },
        select: orderSelect,
      });
      for (const order of suffixOrders) {
        const check = this.checkCurrency(order, pp.currency);
        if (check.status === 'matched') return check;
      }
      if (suffixOrders.length > 0) {
        return { status: 'skipped', order: suffixOrders[0], reason: 'Zlecenie już ma cenę w tej walucie' };
      }
    }

    // Strategia 3: Match po projekcie (reference)
    if (pp.reference) {
      const ref = pp.reference;

      // 3a: Exact match - project === reference
      const byExact = await tx.order.findFirst({
        where: { project: ref, ...activeFilter },
        select: orderSelect,
      });
      if (byExact) return this.checkCurrency(byExact, pp.currency);

      // 3a2: Normalized match (bez spacji)
      const normalizedRef = ref.replace(/\s+/g, '');
      if (normalizedRef !== ref) {
        const byNormalized = await tx.order.findFirst({
          where: { project: normalizedRef, ...activeFilter },
          select: orderSelect,
        });
        if (byNormalized) return this.checkCurrency(byNormalized, pp.currency);
      }

      // 3b: Reference zawiera wiele projektów (np. "D4168,D5914,D6188")
      // Szukaj zleceń których project zawiera jeden z tych kodów
      const refParts = ref.split(/[,\s]+/).filter(p => /^[A-Z]\d+$/i.test(p));

      if (refParts.length > 1) {
        for (const part of refParts) {
          const byPart = await tx.order.findFirst({
            where: { project: { contains: part }, ...activeFilter },
            select: orderSelect,
          });
          if (byPart) return this.checkCurrency(byPart, pp.currency);
        }
      }

      // 3c: Zlecenie ma multi-projekt, reference ma jeden
      // Szukaj zleceń których project zawiera reference
      if (refParts.length === 1) {
        const byContains = await tx.order.findFirst({
          where: { project: { contains: refParts[0] }, ...activeFilter },
          select: orderSelect,
        });
        if (byContains) return this.checkCurrency(byContains, pp.currency);
      }
    }

    // Strategia 4: Match po nazwie pliku
    if (pp.filename) {
      // Wyciągnij 5-cyfrowy numer z nazwy pliku
      const fiveDigitMatch = pp.filename.match(/(?<!\d)(\d{5})(?!\d)/);
      if (fiveDigitMatch) {
        const num = parseInt(fiveDigitMatch[1]);
        if (num >= 40000 && num <= 99999) {
          const byFilename = await tx.order.findFirst({
            where: { orderNumber: fiveDigitMatch[1], ...activeFilter },
            select: orderSelect,
          });
          if (byFilename) return this.checkCurrency(byFilename, pp.currency);
        }
      }
    }

    return { status: 'no_match' };
  }

  private checkCurrency(
    order: { id: number; orderNumber: string; client: string | null; valueEur: number | null; valuePln: number | null },
    currency: string
  ): {
    status: 'matched' | 'skipped';
    order: typeof order;
    reason?: string;
  } {
    const hasPrice = currency === 'EUR' ? order.valueEur != null : order.valuePln != null;
    if (hasPrice) {
      return { status: 'skipped', order, reason: `Zlecenie ${order.orderNumber} już ma cenę ${currency}` };
    }
    return { status: 'matched', order };
  }

  /**
   * Parsuje PDF-y z podanych ścieżek, tworzy pending prices, i od razu odpala rematch.
   * Omija system importu (brak deduplikacji fileImport).
   */
  async reimportPdfs(filepaths: string[]): Promise<{
    parsed: Array<{ filepath: string; orderNumber: string; reference: string; currency: string; valueNetto: number; pendingId: number }>;
    errors: string[];
    rematch: RematchResult;
  }> {
    const parsed: Array<{ filepath: string; orderNumber: string; reference: string; currency: string; valueNetto: number; pendingId: number }> = [];
    const errors: string[] = [];
    const pdfParser = new PdfParser();

    for (const filepath of filepaths) {
      try {
        const preview = await pdfParser.previewCenyPdf(filepath);
        const filename = path.basename(filepath);

        const valueNettoSmallest = preview.currency === 'EUR'
          ? eurToCenty(preview.valueNetto)
          : plnToGrosze(preview.valueNetto);
        const valueBruttoSmallest = preview.valueBrutto
          ? (preview.currency === 'EUR' ? eurToCenty(preview.valueBrutto) : plnToGrosze(preview.valueBrutto))
          : null;

        const pp = await this.prisma.pendingOrderPrice.create({
          data: {
            orderNumber: preview.orderNumber,
            reference: preview.reference || null,
            currency: preview.currency,
            valueNetto: valueNettoSmallest,
            valueBrutto: valueBruttoSmallest,
            filename,
            filepath,
            status: 'pending',
          },
        });

        parsed.push({
          filepath,
          orderNumber: preview.orderNumber,
          reference: preview.reference,
          currency: preview.currency,
          valueNetto: valueNettoSmallest,
          pendingId: pp.id,
        });

        logger.info(`[Reimport] Sparsowano PDF: ${filename} -> orderNumber=${preview.orderNumber}, reference=${preview.reference}, ${preview.currency} ${preview.valueNetto}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
        errors.push(`${filepath}: ${errMsg}`);
        logger.warn(`[Reimport] Błąd parsowania ${filepath}: ${errMsg}`);
      }
    }

    // Run rematch
    const rematch = await this.rematchAll();

    return { parsed, errors, rematch };
  }
}
