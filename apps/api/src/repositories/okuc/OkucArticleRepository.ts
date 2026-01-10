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
   * Delete an article
   */
  async delete(id: number) {
    try {
      const article = await this.prisma.okucArticle.delete({
        where: { id },
      });

      logger.info('Deleted article', { id, articleId: article.articleId });
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
}
