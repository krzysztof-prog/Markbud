/**
 * OkucArticleRepository - Data access layer for article management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class OkucArticleRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all articles with optional filters
   */
  async findAll(filters?: {
    usedInPvc?: boolean;
    usedInAlu?: boolean;
    orderClass?: string;
    sizeClass?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.OkucArticleWhereInput = {};

    if (filters?.usedInPvc !== undefined) {
      where.usedInPvc = filters.usedInPvc;
    }

    if (filters?.usedInAlu !== undefined) {
      where.usedInAlu = filters.usedInAlu;
    }

    if (filters?.orderClass) {
      where.orderClass = filters.orderClass;
    }

    if (filters?.sizeClass) {
      where.sizeClass = filters.sizeClass;
    }

    // Note: isActive is not a field on OkucArticle, it's on OkucArticleAlias
    // If you need to filter by active status, implement custom logic

    const articles = await this.prisma.okucArticle.findMany({
      where,
      include: {
        aliases: {
          where: {
            isActive: true,
          },
        },
        location: true,
        proportionsSource: {
          include: {
            targetArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
        proportionsTarget: {
          include: {
            sourceArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { articleId: 'asc' },
      ],
    });

    logger.debug('Found articles', { count: articles.length, filters });
    return articles;
  }

  /**
   * Find article by ID
   */
  async findById(id: number) {
    const article = await this.prisma.okucArticle.findUnique({
      where: { id },
      include: {
        aliases: {
          where: {
            isActive: true,
          },
        },
        stocks: true,
        proportionsSource: {
          include: {
            targetArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
        proportionsTarget: {
          include: {
            sourceArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (article) {
      logger.debug('Found article by ID', { id });
    } else {
      logger.debug('Article not found', { id });
    }

    return article;
  }

  /**
   * Find article by articleId (e.g., "A123")
   */
  async findByArticleId(articleId: string) {
    const article = await this.prisma.okucArticle.findUnique({
      where: { articleId },
      include: {
        aliases: {
          where: {
            isActive: true,
          },
        },
        stocks: true,
        proportionsSource: {
          include: {
            targetArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
        proportionsTarget: {
          include: {
            sourceArticle: {
              select: {
                id: true,
                articleId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (article) {
      logger.debug('Found article by articleId', { articleId });
    } else {
      logger.debug('Article not found', { articleId });
    }

    return article;
  }

  /**
   * Create a new article
   */
  async create(data: Prisma.OkucArticleCreateInput) {
    const article = await this.prisma.okucArticle.create({
      data,
      include: {
        aliases: true,
      },
    });

    logger.info('Created article', { id: article.id, articleId: article.articleId });
    return article;
  }

  /**
   * Update an article
   */
  async update(id: number, data: Prisma.OkucArticleUpdateInput) {
    try {
      const article = await this.prisma.okucArticle.update({
        where: { id },
        data,
        include: {
          aliases: {
            where: {
              isActive: true,
            },
          },
        },
      });

      logger.info('Updated article', { id, articleId: article.articleId });
      return article;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.debug('Article not found for update', { id });
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete an article (SOFT DELETE)
   */
  async delete(id: number) {
    try {
      // Soft delete: ustawiamy deletedAt zamiast usuwać
      const article = await this.prisma.okucArticle.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      logger.info('Soft deleted article', { id, articleId: article.articleId });
      return article;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.debug('Article not found for deletion', { id });
        return null;
      }
      throw error;
    }
  }

  /**
   * Add an alias to an article
   */
  async addAlias(articleId: number, aliasNumber: string) {
    const alias = await this.prisma.okucArticleAlias.create({
      data: {
        articleId,
        aliasNumber,
        isActive: true,
      },
    });

    logger.info('Added alias to article', { articleId, aliasNumber });
    return alias;
  }

  /**
   * Get all aliases for an article
   */
  async getAliases(articleId: number) {
    const aliases = await this.prisma.okucArticleAlias.findMany({
      where: { articleId },
      orderBy: [
        { isActive: 'desc' },
        { aliasNumber: 'asc' },
      ],
    });

    logger.debug('Found aliases for article', { articleId, count: aliases.length });
    return aliases;
  }

  /**
   * Deactivate an alias
   */
  async deactivateAlias(id: number) {
    try {
      const alias = await this.prisma.okucArticleAlias.update({
        where: { id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      logger.info('Deactivated alias', { id, aliasNumber: alias.aliasNumber });
      return alias;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.debug('Alias not found for deactivation', { id });
        return null;
      }
      throw error;
    }
  }

  /**
   * Find article by alias number
   */
  async findByAlias(aliasNumber: string) {
    const alias = await this.prisma.okucArticleAlias.findUnique({
      where: { aliasNumber },
      include: {
        article: {
          include: {
            aliases: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (alias) {
      logger.debug('Found article by alias', { aliasNumber, articleId: alias.article.articleId });
      return alias.article;
    }

    logger.debug('Article not found by alias', { aliasNumber });
    return null;
  }

  // ============================================================================
  // REPLACEMENT (Zastępstwa artykułów) - metody do zarządzania wygaszaniem
  // ============================================================================

  /**
   * Pobierz artykuły wygaszane z ich zamiennikami
   */
  async findPhaseOutArticles() {
    const articles = await this.prisma.okucArticle.findMany({
      where: {
        isPhaseOut: true,
        deletedAt: null,
      },
      include: {
        replacedByArticle: {
          select: {
            id: true,
            articleId: true,
            name: true,
            isPhaseOut: true,
          },
        },
        stocks: true,
      },
      orderBy: { articleId: 'asc' },
    });

    logger.debug('Found phase-out articles', { count: articles.length });
    return articles;
  }

  /**
   * Ustaw mapowanie zastępstwa artykułu
   */
  async setReplacement(oldArticleId: number, newArticleId: number | null) {
    const article = await this.prisma.okucArticle.update({
      where: { id: oldArticleId },
      data: {
        isPhaseOut: newArticleId !== null,
        replacedByArticleId: newArticleId,
        // Reset daty transferu gdy zmieniamy mapowanie
        demandTransferredAt: null,
      },
      include: {
        replacedByArticle: {
          select: {
            id: true,
            articleId: true,
            name: true,
          },
        },
      },
    });

    logger.info('Set article replacement', {
      oldArticleId,
      newArticleId,
      articleNumber: article.articleId,
    });

    return article;
  }

  /**
   * Sprawdź czy artykuł może być zamiennikiem (walidacja cykli i statusu)
   */
  async validateReplacementCandidate(
    oldArticleId: number,
    newArticleId: number
  ): Promise<{ valid: boolean; error?: string }> {
    // 1. Nie można ustawić siebie jako zamiennika
    if (oldArticleId === newArticleId) {
      return { valid: false, error: 'Artykuł nie może być swoim własnym zamiennikiem' };
    }

    // 2. Sprawdź czy nowy artykuł istnieje i nie jest usunięty
    const newArticle = await this.prisma.okucArticle.findUnique({
      where: { id: newArticleId, deletedAt: null },
      include: {
        replacedByArticle: true,
      },
    });

    if (!newArticle) {
      return { valid: false, error: 'Artykuł zastępujący nie istnieje' };
    }

    // 3. Sprawdź czy nowy artykuł nie jest już wygaszany
    if (newArticle.isPhaseOut) {
      return {
        valid: false,
        error: `Artykuł ${newArticle.articleId} jest już wygaszany - nie może być zamiennikiem`,
      };
    }

    // 4. Sprawdź cykle (A → B → A) - iteracyjnie
    const visited = new Set<number>([oldArticleId, newArticleId]);
    let currentId = newArticle.replacedByArticleId;

    while (currentId !== null) {
      if (visited.has(currentId)) {
        return {
          valid: false,
          error: 'Wykryto cykliczną zależność zastępstw',
        };
      }
      visited.add(currentId);

      const next = await this.prisma.okucArticle.findUnique({
        where: { id: currentId },
        select: { replacedByArticleId: true },
      });

      currentId = next?.replacedByArticleId ?? null;
    }

    return { valid: true };
  }

  /**
   * Przenieś zapotrzebowanie ze starego artykułu na nowy
   * Przenosi tylko statusy pending/confirmed (nie in_production/completed)
   */
  async transferDemand(oldArticleId: number, newArticleId: number): Promise<number> {
    // Przenieś demands
    const result = await this.prisma.okucDemand.updateMany({
      where: {
        articleId: oldArticleId,
        status: { in: ['pending', 'confirmed'] },
        deletedAt: null,
      },
      data: {
        articleId: newArticleId,
        isManualEdit: true,
        editedAt: new Date(),
        editReason: 'Przeniesiono z artykułu wygaszanego (auto-transfer)',
      },
    });

    // Oznacz datę transferu na starym artykule
    await this.prisma.okucArticle.update({
      where: { id: oldArticleId },
      data: { demandTransferredAt: new Date() },
    });

    logger.info('Transferred demand from phase-out article', {
      oldArticleId,
      newArticleId,
      transferred: result.count,
    });

    return result.count;
  }

  /**
   * Policz oczekujące zapotrzebowania dla artykułu
   */
  async countPendingDemands(articleId: number): Promise<number> {
    return this.prisma.okucDemand.count({
      where: {
        articleId,
        status: { in: ['pending', 'confirmed'] },
        deletedAt: null,
      },
    });
  }

  /**
   * Pobierz sumę stanów magazynowych artykułu
   */
  async getTotalStock(articleId: number): Promise<number> {
    const stocks = await this.prisma.okucStock.findMany({
      where: { articleId },
      select: { currentQuantity: true },
    });

    return stocks.reduce((sum, s) => sum + s.currentQuantity, 0);
  }
}
