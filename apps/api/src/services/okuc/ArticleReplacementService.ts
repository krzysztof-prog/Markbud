/**
 * ArticleReplacementService - Logika biznesowa dla zastępstw artykułów
 *
 * Odpowiada za:
 * - Pobieranie listy mapowań zastępstw
 * - Ustawianie/usuwanie mapowań z walidacją
 * - Ręczne przenoszenie zapotrzebowania
 * - Automatyczne przenoszenie gdy stan = 0
 */

import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

// Typ dla mapowania zastępstwa
export interface ReplacementMapping {
  oldArticle: {
    id: number;
    articleId: string;
    name: string;
    currentStock: number;
  };
  newArticle: {
    id: number;
    articleId: string;
    name: string;
  } | null;
  demandTransferredAt: Date | null;
  pendingDemandCount: number;
}

export class ArticleReplacementService {
  private repository: OkucArticleRepository;

  constructor(repository?: OkucArticleRepository) {
    this.repository = repository ?? new OkucArticleRepository(prisma);
  }

  /**
   * Pobierz listę wszystkich mapowań zastępstw
   */
  async getReplacements(): Promise<ReplacementMapping[]> {
    const phaseOutArticles = await this.repository.findPhaseOutArticles();

    const mappings = await Promise.all(
      phaseOutArticles.map(async (article) => {
        // Policz oczekujące demands
        const pendingDemandCount = await this.repository.countPendingDemands(article.id);

        // Suma stanów magazynowych
        const currentStock = article.stocks.reduce(
          (sum, s) => sum + s.currentQuantity,
          0
        );

        return {
          oldArticle: {
            id: article.id,
            articleId: article.articleId,
            name: article.name,
            currentStock,
          },
          newArticle: article.replacedByArticle
            ? {
                id: article.replacedByArticle.id,
                articleId: article.replacedByArticle.articleId,
                name: article.replacedByArticle.name,
              }
            : null,
          demandTransferredAt: article.demandTransferredAt,
          pendingDemandCount,
        };
      })
    );

    logger.debug('Retrieved replacement mappings', { count: mappings.length });
    return mappings;
  }

  /**
   * Ustaw/zmień mapowanie zastępstwa
   */
  async setReplacement(
    oldArticleId: number,
    newArticleId: number | null
  ): Promise<ReplacementMapping> {
    // Sprawdź czy stary artykuł istnieje
    const oldArticle = await prisma.okucArticle.findUnique({
      where: { id: oldArticleId, deletedAt: null },
    });

    if (!oldArticle) {
      throw new NotFoundError('Artykuł do wygaszenia nie został znaleziony');
    }

    // Walidacja nowego artykułu (jeśli podano)
    if (newArticleId !== null) {
      const validation = await this.repository.validateReplacementCandidate(
        oldArticleId,
        newArticleId
      );
      if (!validation.valid) {
        throw new ValidationError(validation.error!);
      }
    }

    // Ustaw mapowanie
    await this.repository.setReplacement(oldArticleId, newArticleId);

    logger.info('Article replacement set', {
      oldArticleId,
      oldArticleNumber: oldArticle.articleId,
      newArticleId,
    });

    // Zwróć pełne mapowanie
    const mappings = await this.getReplacements();
    const mapping = mappings.find((m) => m.oldArticle.id === oldArticleId);

    if (!mapping) {
      // Jeśli usunięto mapowanie (newArticleId = null), zwróć pusty obiekt
      const stock = await this.repository.getTotalStock(oldArticleId);
      const pendingCount = await this.repository.countPendingDemands(oldArticleId);

      return {
        oldArticle: {
          id: oldArticle.id,
          articleId: oldArticle.articleId,
          name: oldArticle.name,
          currentStock: stock,
        },
        newArticle: null,
        demandTransferredAt: null,
        pendingDemandCount: pendingCount,
      };
    }

    return mapping;
  }

  /**
   * Usuń mapowanie zastępstwa (cofnij wygaszanie)
   */
  async removeReplacement(oldArticleId: number): Promise<ReplacementMapping> {
    return this.setReplacement(oldArticleId, null);
  }

  /**
   * Przenieś zapotrzebowanie ręcznie
   */
  async transferDemandManually(oldArticleId: number): Promise<{ transferred: number }> {
    // Znajdź artykuł i jego zamiennik
    const article = await prisma.okucArticle.findUnique({
      where: { id: oldArticleId, deletedAt: null },
      include: {
        replacedByArticle: {
          select: {
            id: true,
            articleId: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundError('Artykuł nie został znaleziony');
    }

    if (!article.isPhaseOut || !article.replacedByArticleId) {
      throw new ValidationError('Artykuł nie jest wygaszany lub nie ma przypisanego zamiennika');
    }

    const transferred = await this.repository.transferDemand(
      oldArticleId,
      article.replacedByArticleId
    );

    logger.info('Demand transferred manually', {
      oldArticleId: article.articleId,
      newArticleId: article.replacedByArticle?.articleId,
      transferred,
    });

    return { transferred };
  }

  /**
   * Sprawdź i automatycznie przenieś zapotrzebowanie gdy stan = 0
   * Wywoływane po każdej zmianie stanu magazynowego (RW, korekta)
   *
   * @returns null jeśli nie dotyczy, lub liczbę przeniesionych pozycji
   */
  async checkAndTransferIfStockZero(articleId: number): Promise<{ transferred: number } | null> {
    const article = await prisma.okucArticle.findUnique({
      where: { id: articleId, deletedAt: null },
      include: {
        replacedByArticle: {
          select: {
            id: true,
            articleId: true,
          },
        },
        stocks: true,
      },
    });

    // Nie dotyczy - artykuł nie istnieje, nie jest wygaszany lub nie ma zamiennika
    if (!article || !article.isPhaseOut || !article.replacedByArticleId) {
      return null;
    }

    // Już przeniesiono wcześniej
    if (article.demandTransferredAt) {
      return null;
    }

    // Sprawdź czy łączny stan = 0
    const totalStock = article.stocks.reduce((sum, s) => sum + s.currentQuantity, 0);

    if (totalStock > 0) {
      return null; // Jeszcze jest zapas
    }

    // Stan = 0 -> automatyczne przeniesienie
    const transferred = await this.repository.transferDemand(
      articleId,
      article.replacedByArticleId
    );

    logger.info('Demand auto-transferred (stock zero)', {
      oldArticleId: article.articleId,
      newArticleId: article.replacedByArticle?.articleId,
      transferred,
    });

    return { transferred };
  }
}
