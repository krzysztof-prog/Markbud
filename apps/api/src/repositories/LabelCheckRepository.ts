/**
 * LabelCheckRepository - Database access layer for label checks
 *
 * Odpowiedzialnosc:
 * - TYLKO operacje na bazie danych (CRUD)
 * - Proste zapytania findById, findMany, create, update, softDelete
 * - Operacje na relacjach LabelCheckResult
 *
 * UWAGA: Logika biznesowa (OCR, walidacja dat, sprawdzanie etykiet) powinna byc w:
 * - LabelCheckService (apps/api/src/services/labelCheckService.ts)
 */

import { PrismaClient, Prisma, LabelCheck, LabelCheckResult } from '@prisma/client';

// Types for repository operations
export interface LabelCheckFilters {
  status?: string;
  deliveryId?: number;
  from?: Date;
  to?: Date;
  includeDeleted?: boolean;
}

export interface LabelCheckPagination {
  skip?: number;
  take?: number;
}

export interface CreateLabelCheckInput {
  deliveryId: number;
  deliveryDate: Date;
  totalOrders: number;
}

export interface CreateResultInput {
  orderId: number;
  orderNumber: string;
  status: string;
  expectedDate: Date;
  detectedDate?: Date | null;
  detectedText?: string | null;
  imagePath?: string | null;
  errorMessage?: string | null;
}

export interface UpdateStatusInput {
  status?: string;
  checkedCount?: number;
  okCount?: number;
  mismatchCount?: number;
  errorCount?: number;
  completedAt?: Date;
}

export interface LabelCheckWithResults extends LabelCheck {
  results: LabelCheckResult[];
  delivery?: {
    id: number;
    deliveryDate: Date;
    deliveryNumber: string | null;
    status: string;
  };
}

export interface PaginatedLabelCheckResponse {
  data: LabelCheck[];
  total: number;
  skip: number;
  take: number;
}

export class LabelCheckRepository {
  constructor(private prisma: PrismaClient) {}

  // ===================
  // Basic CRUD Operations
  // ===================

  /**
   * Create a new LabelCheck for a delivery
   */
  async create(data: CreateLabelCheckInput): Promise<LabelCheck> {
    return this.prisma.labelCheck.create({
      data: {
        deliveryId: data.deliveryId,
        deliveryDate: data.deliveryDate,
        totalOrders: data.totalOrders,
        status: 'pending',
        checkedCount: 0,
        okCount: 0,
        mismatchCount: 0,
        errorCount: 0,
      },
    });
  }

  /**
   * Find LabelCheck by ID with results and delivery relation
   * Excludes soft deleted records by default
   */
  async findById(id: number): Promise<LabelCheckWithResults | null> {
    return this.prisma.labelCheck.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        results: true,
        delivery: {
          select: {
            id: true,
            deliveryDate: true,
            deliveryNumber: true,
            status: true,
          },
        },
      },
    }) as Promise<LabelCheckWithResults | null>;
  }

  /**
   * Find all LabelChecks for a specific delivery
   * Excludes soft deleted records
   * Orders by createdAt descending (newest first)
   */
  async findByDeliveryId(deliveryId: number): Promise<LabelCheck[]> {
    return this.prisma.labelCheck.findMany({
      where: {
        deliveryId,
        deletedAt: null,
      },
      include: {
        results: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all LabelChecks with filters and pagination
   * Excludes soft deleted records by default (unless includeDeleted is true)
   */
  async findAll(
    filters: LabelCheckFilters = {},
    pagination?: LabelCheckPagination
  ): Promise<PaginatedLabelCheckResponse> {
    const where: Prisma.LabelCheckWhereInput = {};

    // Soft delete filter - exclude deleted by default
    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Delivery ID filter
    if (filters.deliveryId) {
      where.deliveryId = filters.deliveryId;
    }

    // Date range filter
    if (filters.from || filters.to) {
      where.deliveryDate = {};
      if (filters.from) where.deliveryDate.gte = filters.from;
      if (filters.to) where.deliveryDate.lte = filters.to;
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 50;

    // Execute count and findMany in parallel
    const [total, data] = await Promise.all([
      this.prisma.labelCheck.count({ where }),
      this.prisma.labelCheck.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  /**
   * Soft delete a LabelCheck (sets deletedAt instead of removing)
   */
  async softDelete(id: number): Promise<LabelCheck> {
    return this.prisma.labelCheck.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ===================
  // Result Operations
  // ===================

  /**
   * Add a result to an existing LabelCheck
   */
  async addResult(labelCheckId: number, data: CreateResultInput): Promise<LabelCheckResult> {
    return this.prisma.labelCheckResult.create({
      data: {
        labelCheckId,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        expectedDate: data.expectedDate,
        detectedDate: data.detectedDate,
        detectedText: data.detectedText,
        imagePath: data.imagePath,
        errorMessage: data.errorMessage,
      },
    });
  }

  /**
   * Update LabelCheck status and counters
   */
  async updateStatus(id: number, data: UpdateStatusInput): Promise<LabelCheck> {
    return this.prisma.labelCheck.update({
      where: { id },
      data,
    });
  }

  // ===================
  // Query Operations
  // ===================

  /**
   * Get the most recent LabelCheck for a delivery
   * Excludes soft deleted records
   * Includes results ordered by orderId
   */
  async getLatestForDelivery(deliveryId: number): Promise<LabelCheckWithResults | null> {
    return this.prisma.labelCheck.findFirst({
      where: {
        deliveryId,
        deletedAt: null,
      },
      include: {
        results: {
          orderBy: { orderId: 'asc' },
        },
        delivery: {
          select: {
            id: true,
            deliveryDate: true,
            deliveryNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<LabelCheckWithResults | null>;
  }

  // ===================
  // Transaction Operations
  // ===================

  /**
   * Create LabelCheck with results in a single transaction
   * Ensures atomicity - all or nothing
   */
  async createWithResults(
    data: CreateLabelCheckInput,
    results: CreateResultInput[]
  ): Promise<LabelCheck> {
    return this.prisma.$transaction(async (tx) => {
      // Create the LabelCheck
      const labelCheck = await tx.labelCheck.create({
        data: {
          deliveryId: data.deliveryId,
          deliveryDate: data.deliveryDate,
          totalOrders: data.totalOrders,
          status: 'pending',
          checkedCount: 0,
          okCount: 0,
          mismatchCount: 0,
          errorCount: 0,
        },
      });

      // Create all results
      for (const result of results) {
        await tx.labelCheckResult.create({
          data: {
            labelCheckId: labelCheck.id,
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            status: result.status,
            expectedDate: result.expectedDate,
            detectedDate: result.detectedDate,
            detectedText: result.detectedText,
            imagePath: result.imagePath,
            errorMessage: result.errorMessage,
          },
        });
      }

      return labelCheck;
    });
  }
}
