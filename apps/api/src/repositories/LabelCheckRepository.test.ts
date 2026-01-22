/**
 * LabelCheckRepository Unit Tests (TDD)
 *
 * Comprehensive tests for LabelCheckRepository covering:
 * - CRUD operations (create, findById, findByDeliveryId, findAll, softDelete)
 * - Result operations (addResult, updateStatus)
 * - Query operations (getLatestForDelivery)
 * - Edge cases and error handling
 *
 * TDD: Testy pisane PRZED implementacją - będą FAIL dopóki nie zaimplementujemy repository
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LabelCheckRepository } from './LabelCheckRepository.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';
import { Prisma } from '@prisma/client';

describe('LabelCheckRepository', () => {
  let repository: LabelCheckRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Test fixtures
  const mockLabelCheck = {
    id: 1,
    deliveryId: 1,
    deliveryDate: new Date('2024-02-15'),
    status: 'pending',
    totalOrders: 5,
    checkedCount: 0,
    okCount: 0,
    mismatchCount: 0,
    errorCount: 0,
    createdAt: new Date('2024-01-01'),
    completedAt: null,
    deletedAt: null,
  };

  const mockLabelCheckResult = {
    id: 1,
    labelCheckId: 1,
    orderId: 100,
    orderNumber: '53690',
    status: 'OK',
    expectedDate: new Date('2024-02-15'),
    detectedDate: new Date('2024-02-15'),
    detectedText: '15.02',
    imagePath: '//pila21/KABANTRANSFER/53690/label.bmp',
    errorMessage: null,
    createdAt: new Date(),
  };

  const mockLabelCheckWithResults = {
    ...mockLabelCheck,
    results: [mockLabelCheckResult],
    delivery: {
      id: 1,
      deliveryDate: new Date('2024-02-15'),
      deliveryNumber: 'D001',
      status: 'planned',
    },
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new LabelCheckRepository(mockPrisma);
  });

  describe('CRUD operations', () => {
    describe('create', () => {
      it('creates LabelCheck for delivery', async () => {
        const createData = {
          deliveryId: 1,
          deliveryDate: new Date('2024-02-15'),
          totalOrders: 5,
        };
        const createdLabelCheck = {
          ...mockLabelCheck,
          ...createData,
          createdAt: new Date(),
        };

        mockPrisma.labelCheck.create.mockResolvedValue(createdLabelCheck);

        const result = await repository.create(createData);

        expect(result).toEqual(createdLabelCheck);
        expect(mockPrisma.labelCheck.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            deliveryId: createData.deliveryId,
            deliveryDate: createData.deliveryDate,
            totalOrders: createData.totalOrders,
          }),
        });
      });

      it('creates LabelCheck with default status pending', async () => {
        const createData = {
          deliveryId: 2,
          deliveryDate: new Date('2024-02-20'),
          totalOrders: 10,
        };
        const createdLabelCheck = {
          id: 2,
          ...createData,
          status: 'pending',
          checkedCount: 0,
          okCount: 0,
          mismatchCount: 0,
          errorCount: 0,
          createdAt: new Date(),
          completedAt: null,
          deletedAt: null,
        };

        mockPrisma.labelCheck.create.mockResolvedValue(createdLabelCheck);

        const result = await repository.create(createData);

        expect(result.status).toBe('pending');
        expect(result.checkedCount).toBe(0);
        expect(result.okCount).toBe(0);
      });
    });

    describe('findById', () => {
      it('returns LabelCheck with results when exists', async () => {
        mockPrisma.labelCheck.findUnique.mockResolvedValue(mockLabelCheckWithResults);

        const result = await repository.findById(1);

        expect(result).toEqual(mockLabelCheckWithResults);
        expect(mockPrisma.labelCheck.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ id: 1 }),
            include: expect.objectContaining({
              results: true,
            }),
          })
        );
      });

      it('returns null when not exists', async () => {
        mockPrisma.labelCheck.findUnique.mockResolvedValue(null);

        const result = await repository.findById(999);

        expect(result).toBeNull();
      });

      it('includes delivery relation', async () => {
        mockPrisma.labelCheck.findUnique.mockResolvedValue(mockLabelCheckWithResults);

        const result = await repository.findById(1);

        expect(result?.delivery).toBeDefined();
        expect(result?.delivery?.deliveryNumber).toBe('D001');
      });

      it('excludes soft deleted records by default', async () => {
        mockPrisma.labelCheck.findUnique.mockResolvedValue(null);

        await repository.findById(1);

        expect(mockPrisma.labelCheck.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: 1,
              deletedAt: null,
            }),
          })
        );
      });
    });

    describe('findByDeliveryId', () => {
      it('returns all LabelChecks for delivery', async () => {
        const labelChecks = [
          mockLabelCheck,
          { ...mockLabelCheck, id: 2, status: 'completed' },
        ];

        mockPrisma.labelCheck.findMany.mockResolvedValue(labelChecks);

        const result = await repository.findByDeliveryId(1);

        expect(result).toHaveLength(2);
        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith({
          where: {
            deliveryId: 1,
            deletedAt: null,
          },
          include: expect.objectContaining({
            results: true,
          }),
          orderBy: { createdAt: 'desc' },
        });
      });

      it('returns empty array when no checks exist', async () => {
        mockPrisma.labelCheck.findMany.mockResolvedValue([]);

        const result = await repository.findByDeliveryId(999);

        expect(result).toEqual([]);
      });

      it('orders by createdAt descending (newest first)', async () => {
        mockPrisma.labelCheck.findMany.mockResolvedValue([mockLabelCheck]);

        await repository.findByDeliveryId(1);

        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        );
      });
    });

    describe('findAll', () => {
      it('returns paginated list with default pagination', async () => {
        mockPrisma.labelCheck.count.mockResolvedValue(100);
        mockPrisma.labelCheck.findMany.mockResolvedValue([mockLabelCheck]);

        const result = await repository.findAll({});

        expect(result).toEqual({
          data: [mockLabelCheck],
          total: 100,
          skip: 0,
          take: 50,
        });
      });

      it('filters by status', async () => {
        mockPrisma.labelCheck.count.mockResolvedValue(5);
        mockPrisma.labelCheck.findMany.mockResolvedValue([mockLabelCheck]);

        await repository.findAll({ status: 'pending' });

        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'pending',
            }),
          })
        );
      });

      it('excludes soft deleted by default', async () => {
        mockPrisma.labelCheck.count.mockResolvedValue(1);
        mockPrisma.labelCheck.findMany.mockResolvedValue([mockLabelCheck]);

        await repository.findAll({});

        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              deletedAt: null,
            }),
          })
        );
      });

      it('includes soft deleted when includeDeleted is true', async () => {
        mockPrisma.labelCheck.count.mockResolvedValue(2);
        mockPrisma.labelCheck.findMany.mockResolvedValue([
          mockLabelCheck,
          { ...mockLabelCheck, id: 2, deletedAt: new Date() },
        ]);

        await repository.findAll({ includeDeleted: true });

        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              deletedAt: null,
            }),
          })
        );
      });

      it('applies custom pagination', async () => {
        mockPrisma.labelCheck.count.mockResolvedValue(100);
        mockPrisma.labelCheck.findMany.mockResolvedValue([]);

        const result = await repository.findAll({}, { skip: 20, take: 10 });

        expect(result.skip).toBe(20);
        expect(result.take).toBe(10);
        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 20,
            take: 10,
          })
        );
      });

      it('filters by date range', async () => {
        const from = new Date('2024-02-01');
        const to = new Date('2024-02-28');

        mockPrisma.labelCheck.count.mockResolvedValue(5);
        mockPrisma.labelCheck.findMany.mockResolvedValue([mockLabelCheck]);

        await repository.findAll({ from, to });

        expect(mockPrisma.labelCheck.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              deliveryDate: {
                gte: from,
                lte: to,
              },
            }),
          })
        );
      });
    });

    describe('softDelete', () => {
      it('sets deletedAt instead of removing record', async () => {
        const deletedLabelCheck = {
          ...mockLabelCheck,
          deletedAt: new Date(),
        };

        mockPrisma.labelCheck.update.mockResolvedValue(deletedLabelCheck);

        const result = await repository.softDelete(1);

        expect(result.deletedAt).not.toBeNull();
        expect(mockPrisma.labelCheck.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        });
      });

      it('throws when LabelCheck not found', async () => {
        mockPrisma.labelCheck.update.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.softDelete(999)).rejects.toThrow();
      });
    });
  });

  describe('Result operations', () => {
    describe('addResult', () => {
      it('adds LabelCheckResult to existing check', async () => {
        const resultData = {
          orderId: 100,
          orderNumber: '53690',
          status: 'OK' as const,
          expectedDate: new Date('2024-02-15'),
          detectedDate: new Date('2024-02-15'),
          detectedText: '15.02',
          imagePath: '//pila21/KABANTRANSFER/53690/label.bmp',
        };

        mockPrisma.labelCheckResult.create.mockResolvedValue({
          id: 1,
          labelCheckId: 1,
          ...resultData,
          errorMessage: null,
          createdAt: new Date(),
        });

        const result = await repository.addResult(1, resultData);

        expect(result.labelCheckId).toBe(1);
        expect(result.status).toBe('OK');
        expect(mockPrisma.labelCheckResult.create).toHaveBeenCalledWith({
          data: {
            labelCheckId: 1,
            ...resultData,
          },
        });
      });

      it('adds result with error status', async () => {
        const resultData = {
          orderId: 101,
          orderNumber: '53691',
          status: 'NO_FOLDER' as const,
          expectedDate: new Date('2024-02-15'),
          detectedDate: null,
          detectedText: null,
          imagePath: null,
          errorMessage: 'Folder zlecenia nie istnieje',
        };

        mockPrisma.labelCheckResult.create.mockResolvedValue({
          id: 2,
          labelCheckId: 1,
          ...resultData,
          createdAt: new Date(),
        });

        const result = await repository.addResult(1, resultData);

        expect(result.status).toBe('NO_FOLDER');
        expect(result.errorMessage).toBe('Folder zlecenia nie istnieje');
      });

      it('adds result with MISMATCH status', async () => {
        const resultData = {
          orderId: 102,
          orderNumber: '53692',
          status: 'MISMATCH' as const,
          expectedDate: new Date('2024-02-15'),
          detectedDate: new Date('2024-02-20'), // Inna data!
          detectedText: '20.02',
          imagePath: '//pila21/KABANTRANSFER/53692/label.bmp',
        };

        mockPrisma.labelCheckResult.create.mockResolvedValue({
          id: 3,
          labelCheckId: 1,
          ...resultData,
          errorMessage: null,
          createdAt: new Date(),
        });

        const result = await repository.addResult(1, resultData);

        expect(result.status).toBe('MISMATCH');
        expect(result.expectedDate).not.toEqual(result.detectedDate);
      });
    });

    describe('updateStatus', () => {
      it('updates status and counters', async () => {
        const updateData = {
          status: 'completed' as const,
          checkedCount: 5,
          okCount: 4,
          mismatchCount: 1,
          errorCount: 0,
          completedAt: new Date(),
        };

        const updatedCheck = {
          ...mockLabelCheck,
          ...updateData,
        };

        mockPrisma.labelCheck.update.mockResolvedValue(updatedCheck);

        const result = await repository.updateStatus(1, updateData);

        expect(result.status).toBe('completed');
        expect(result.checkedCount).toBe(5);
        expect(result.okCount).toBe(4);
        expect(result.mismatchCount).toBe(1);
        expect(mockPrisma.labelCheck.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updateData,
        });
      });

      it('updates only provided fields', async () => {
        const updateData = {
          checkedCount: 3,
          okCount: 3,
        };

        mockPrisma.labelCheck.update.mockResolvedValue({
          ...mockLabelCheck,
          ...updateData,
        });

        await repository.updateStatus(1, updateData);

        expect(mockPrisma.labelCheck.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updateData,
        });
      });

      it('sets status to failed with error count', async () => {
        const updateData = {
          status: 'failed' as const,
          checkedCount: 5,
          okCount: 2,
          mismatchCount: 1,
          errorCount: 2,
        };

        mockPrisma.labelCheck.update.mockResolvedValue({
          ...mockLabelCheck,
          ...updateData,
        });

        const result = await repository.updateStatus(1, updateData);

        expect(result.status).toBe('failed');
        expect(result.errorCount).toBe(2);
      });

      it('throws when LabelCheck not found', async () => {
        mockPrisma.labelCheck.update.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(
          repository.updateStatus(999, { status: 'completed' })
        ).rejects.toThrow();
      });
    });
  });

  describe('Query operations', () => {
    describe('getLatestForDelivery', () => {
      it('returns most recent LabelCheck for delivery', async () => {
        const latestCheck = {
          ...mockLabelCheckWithResults,
          id: 3,
          createdAt: new Date('2024-02-15T10:00:00'),
        };

        mockPrisma.labelCheck.findFirst.mockResolvedValue(latestCheck);

        const result = await repository.getLatestForDelivery(1);

        expect(result).toEqual(latestCheck);
        expect(mockPrisma.labelCheck.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              deliveryId: 1,
              deletedAt: null,
            },
            include: expect.objectContaining({
              results: expect.anything(),
            }),
            orderBy: { createdAt: 'desc' },
          })
        );
      });

      it('returns null when no checks exist for delivery', async () => {
        mockPrisma.labelCheck.findFirst.mockResolvedValue(null);

        const result = await repository.getLatestForDelivery(999);

        expect(result).toBeNull();
      });

      it('excludes soft deleted checks', async () => {
        mockPrisma.labelCheck.findFirst.mockResolvedValue(mockLabelCheckWithResults);

        await repository.getLatestForDelivery(1);

        expect(mockPrisma.labelCheck.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              deletedAt: null,
            }),
          })
        );
      });

      it('includes results ordered by orderId', async () => {
        const checkWithOrderedResults = {
          ...mockLabelCheckWithResults,
          results: [
            { ...mockLabelCheckResult, orderId: 100 },
            { ...mockLabelCheckResult, id: 2, orderId: 101 },
            { ...mockLabelCheckResult, id: 3, orderId: 102 },
          ],
        };

        mockPrisma.labelCheck.findFirst.mockResolvedValue(checkWithOrderedResults);

        const result = await repository.getLatestForDelivery(1);

        expect(result?.results).toHaveLength(3);
        expect(mockPrisma.labelCheck.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              results: expect.objectContaining({
                orderBy: { orderId: 'asc' },
              }),
            }),
          })
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('handles LabelCheck with no results', async () => {
      const checkWithNoResults = {
        ...mockLabelCheck,
        results: [],
      };

      mockPrisma.labelCheck.findUnique.mockResolvedValue(checkWithNoResults);

      const result = await repository.findById(1);

      expect(result?.results).toEqual([]);
    });

    it('handles LabelCheck with all status types in results', async () => {
      const checkWithMixedResults = {
        ...mockLabelCheck,
        checkedCount: 5,
        okCount: 2,
        mismatchCount: 1,
        errorCount: 2,
        results: [
          { ...mockLabelCheckResult, id: 1, status: 'OK' },
          { ...mockLabelCheckResult, id: 2, status: 'OK' },
          { ...mockLabelCheckResult, id: 3, status: 'MISMATCH' },
          { ...mockLabelCheckResult, id: 4, status: 'NO_FOLDER', errorMessage: 'Folder not found' },
          { ...mockLabelCheckResult, id: 5, status: 'OCR_ERROR', errorMessage: 'OCR failed' },
        ],
      };

      mockPrisma.labelCheck.findUnique.mockResolvedValue(checkWithMixedResults);

      const result = await repository.findById(1);

      expect(result?.results).toHaveLength(5);
      expect(result?.okCount).toBe(2);
      expect(result?.mismatchCount).toBe(1);
      expect(result?.errorCount).toBe(2);
    });

    it('handles empty findAll result', async () => {
      mockPrisma.labelCheck.count.mockResolvedValue(0);
      mockPrisma.labelCheck.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('handles multiple LabelChecks for same delivery', async () => {
      const multipleChecks = [
        { ...mockLabelCheck, id: 1, status: 'completed', createdAt: new Date('2024-02-15T08:00:00') },
        { ...mockLabelCheck, id: 2, status: 'completed', createdAt: new Date('2024-02-15T10:00:00') },
        { ...mockLabelCheck, id: 3, status: 'pending', createdAt: new Date('2024-02-15T12:00:00') },
      ];

      mockPrisma.labelCheck.findMany.mockResolvedValue(multipleChecks);

      const result = await repository.findByDeliveryId(1);

      expect(result).toHaveLength(3);
    });

    it('handles null values in LabelCheckResult', async () => {
      const resultWithNulls = {
        ...mockLabelCheckResult,
        detectedDate: null,
        detectedText: null,
        imagePath: null,
        status: 'NO_BMP',
        errorMessage: 'BMP file not found',
      };

      mockPrisma.labelCheckResult.create.mockResolvedValue(resultWithNulls);

      const result = await repository.addResult(1, {
        orderId: 100,
        orderNumber: '53690',
        status: 'NO_BMP',
        expectedDate: new Date('2024-02-15'),
        detectedDate: null,
        detectedText: null,
        imagePath: null,
        errorMessage: 'BMP file not found',
      });

      expect(result.detectedDate).toBeNull();
      expect(result.detectedText).toBeNull();
      expect(result.imagePath).toBeNull();
    });

    it('handles pagination with large skip values', async () => {
      mockPrisma.labelCheck.count.mockResolvedValue(1000);
      mockPrisma.labelCheck.findMany.mockResolvedValue([]);

      const result = await repository.findAll({}, { skip: 900, take: 100 });

      expect(result.skip).toBe(900);
      expect(result.take).toBe(100);
      expect(result.total).toBe(1000);
    });
  });

  describe('Transaction handling', () => {
    it('creates LabelCheck with results in transaction', async () => {
      const createData = {
        deliveryId: 1,
        deliveryDate: new Date('2024-02-15'),
        totalOrders: 3,
      };

      const resultsData = [
        { orderId: 100, orderNumber: '53690', status: 'OK' as const, expectedDate: new Date('2024-02-15') },
        { orderId: 101, orderNumber: '53691', status: 'OK' as const, expectedDate: new Date('2024-02-15') },
        { orderId: 102, orderNumber: '53692', status: 'MISMATCH' as const, expectedDate: new Date('2024-02-15') },
      ];

      const createdCheck = { ...mockLabelCheck, id: 1 };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.labelCheck.create.mockResolvedValue(createdCheck);
      mockPrisma.labelCheckResult.create.mockResolvedValue(mockLabelCheckResult);

      // Zakładam, że będzie metoda createWithResults używająca transakcji
      const result = await repository.createWithResults(createData, resultsData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rolls back on error during result creation', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const createData = {
        deliveryId: 1,
        deliveryDate: new Date('2024-02-15'),
        totalOrders: 1,
      };

      const resultsData = [
        { orderId: 100, orderNumber: '53690', status: 'OK' as const, expectedDate: new Date('2024-02-15') },
      ];

      await expect(repository.createWithResults(createData, resultsData)).rejects.toThrow('Transaction failed');
    });
  });

  describe('Statistics', () => {
    it('calculates success rate correctly', async () => {
      const checkWithStats = {
        ...mockLabelCheck,
        totalOrders: 10,
        checkedCount: 10,
        okCount: 8,
        mismatchCount: 1,
        errorCount: 1,
        status: 'completed',
      };

      mockPrisma.labelCheck.findUnique.mockResolvedValue(checkWithStats);

      const result = await repository.findById(1);

      // 8 OK out of 10 = 80% success rate
      expect(result?.okCount).toBe(8);
      expect(result?.checkedCount).toBe(10);
      // Właściwe obliczenie success rate będzie w serwisie, ale repository zwraca dane
    });
  });
});
