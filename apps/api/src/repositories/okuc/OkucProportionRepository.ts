/**
 * OkucProportionRepository - Data access layer for proportion management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class OkucProportionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all proportions
   */
  async findAll(filters?: { isActive?: boolean }) {
    const where: Prisma.OkucProportionWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const proportions = await this.prisma.okucProportion.findMany({
      where,
      include: {
        sourceArticle: true,
        targetArticle: true,
      },
      orderBy: [
        { sourceArticle: { name: 'asc' } },
        { targetArticle: { name: 'asc' } },
      ],
    });

    logger.debug('Found proportions', { count: proportions.length, filters });
    return proportions;
  }

  /**
   * Find proportion by ID
   */
  async findById(id: number) {
    const proportion = await this.prisma.okucProportion.findUnique({
      where: { id },
      include: {
        sourceArticle: true,
        targetArticle: true,
      },
    });

    if (!proportion) {
      logger.warn('Proportion not found', { id });
    }

    return proportion;
  }

  /**
   * Find proportions by source article
   */
  async findBySourceArticle(sourceArticleId: number) {
    return this.prisma.okucProportion.findMany({
      where: {
        sourceArticleId,
        isActive: true,
      },
      include: {
        targetArticle: true,
      },
    });
  }

  /**
   * Find proportions by target article
   */
  async findByTargetArticle(targetArticleId: number) {
    return this.prisma.okucProportion.findMany({
      where: {
        targetArticleId,
        isActive: true,
      },
      include: {
        sourceArticle: true,
      },
    });
  }

  /**
   * Check if proportion exists between two articles
   */
  async exists(sourceArticleId: number, targetArticleId: number): Promise<boolean> {
    const count = await this.prisma.okucProportion.count({
      where: {
        sourceArticleId,
        targetArticleId,
      },
    });

    return count > 0;
  }

  /**
   * Create a new proportion
   */
  async create(data: {
    sourceArticleId: number;
    targetArticleId: number;
    proportionType: string;
    ratio: number;
    splitPercent?: number;
    tolerance: number;
    isActive: boolean;
  }) {
    // Check for duplicate
    const existingProportion = await this.prisma.okucProportion.findFirst({
      where: {
        sourceArticleId: data.sourceArticleId,
        targetArticleId: data.targetArticleId,
      },
    });

    if (existingProportion) {
      throw new Error('Proportion between these articles already exists');
    }

    const proportion = await this.prisma.okucProportion.create({
      data: {
        sourceArticleId: data.sourceArticleId,
        targetArticleId: data.targetArticleId,
        proportionType: data.proportionType,
        ratio: data.ratio,
        splitPercent: data.splitPercent,
        tolerance: data.tolerance,
        isActive: data.isActive,
      },
      include: {
        sourceArticle: true,
        targetArticle: true,
      },
    });

    logger.info('Created proportion', {
      id: proportion.id,
      sourceArticleId: data.sourceArticleId,
      targetArticleId: data.targetArticleId,
      type: data.proportionType,
    });

    return proportion;
  }

  /**
   * Update existing proportion
   */
  async update(
    id: number,
    data: {
      proportionType?: string;
      ratio?: number;
      splitPercent?: number;
      tolerance?: number;
      isActive?: boolean;
    }
  ) {
    const proportion = await this.prisma.okucProportion.update({
      where: { id },
      data,
      include: {
        sourceArticle: true,
        targetArticle: true,
      },
    });

    logger.info('Updated proportion', { id, changes: data });
    return proportion;
  }

  /**
   * Delete proportion
   */
  async delete(id: number) {
    const proportion = await this.prisma.okucProportion.delete({
      where: { id },
    });

    logger.info('Deleted proportion', { id });
    return proportion;
  }

  /**
   * Deactivate proportion (soft delete)
   */
  async deactivate(id: number) {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate proportion
   */
  async activate(id: number) {
    return this.update(id, { isActive: true });
  }

  /**
   * Get all proportion chains starting from a source article
   * Returns chains like: A -> B -> C
   */
  async getProportionChains(sourceArticleId: number): Promise<any[]> {
    const chains: any[] = [];
    const visited = new Set<number>();

    const buildChain = async (articleId: number, currentChain: any[] = []) => {
      if (visited.has(articleId)) {
        return; // Prevent infinite loops
      }

      visited.add(articleId);

      const proportions = await this.findBySourceArticle(articleId);

      if (proportions.length === 0) {
        if (currentChain.length > 0) {
          chains.push([...currentChain]);
        }
        return;
      }

      for (const proportion of proportions) {
        const chainStep = {
          sourceArticleId: proportion.sourceArticleId,
          targetArticleId: proportion.targetArticleId,
          proportionType: proportion.proportionType,
          ratio: proportion.ratio,
          targetArticle: proportion.targetArticle,
        };

        await buildChain(proportion.targetArticleId, [...currentChain, chainStep]);
      }
    };

    await buildChain(sourceArticleId);

    return chains;
  }
}
