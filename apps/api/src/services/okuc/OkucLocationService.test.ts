/**
 * OkucLocationService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OkucLocationService } from './OkucLocationService.js';
import { NotFoundError } from '../../utils/errors.js';
import { createMockPrisma } from '../../tests/mocks/prisma.mock.js';

// Mock prisma
const mockPrisma = createMockPrisma();
vi.mock('../../utils/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('OkucLocationService', () => {
  let service: OkucLocationService;

  beforeEach(() => {
    service = new OkucLocationService();
    vi.clearAllMocks();
  });

  describe('getAllLocations', () => {
    it('should return all active locations sorted by sortOrder', async () => {
      const mockLocations = [
        {
          id: 1,
          name: 'Location 1',
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          _count: { articles: 5 },
        },
        {
          id: 2,
          name: 'Location 2',
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          _count: { articles: 3 },
        },
      ];
      mockPrisma.okucLocation.findMany.mockResolvedValue(mockLocations);

      const result = await service.getAllLocations();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'Location 1',
        sortOrder: 0,
        articlesCount: 5,
      });
      expect(mockPrisma.okucLocation.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { articles: true } } },
      });
    });
  });

  describe('getLocationById', () => {
    it('should return location when found', async () => {
      const mockLocation = {
        id: 1,
        name: 'Location 1',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        _count: { articles: 5 },
      };
      mockPrisma.okucLocation.findFirst.mockResolvedValue(mockLocation);

      const result = await service.getLocationById(1);

      expect(result).toMatchObject({
        id: 1,
        name: 'Location 1',
        articlesCount: 5,
      });
      expect(mockPrisma.okucLocation.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: { _count: { select: { articles: true } } },
      });
    });

    it('should throw NotFoundError when location not found', async () => {
      mockPrisma.okucLocation.findFirst.mockResolvedValue(null);

      await expect(service.getLocationById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createLocation', () => {
    it('should create location', async () => {
      const input = { name: 'New Location', sortOrder: 2 };
      const mockCreated = {
        id: 3,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockPrisma.okucLocation.create.mockResolvedValue(mockCreated);

      const result = await service.createLocation(input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.okucLocation.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('updateLocation', () => {
    it('should update location when exists', async () => {
      const existingLocation = {
        id: 1,
        name: 'Old Name',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const updatedLocation = { ...existingLocation, name: 'New Name' };

      mockPrisma.okucLocation.findFirst.mockResolvedValue(existingLocation);
      mockPrisma.okucLocation.update.mockResolvedValue(updatedLocation);

      const result = await service.updateLocation(1, { name: 'New Name' });

      expect(result).toEqual(updatedLocation);
      expect(mockPrisma.okucLocation.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
      expect(mockPrisma.okucLocation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundError when location not found', async () => {
      mockPrisma.okucLocation.findFirst.mockResolvedValue(null);

      await expect(service.updateLocation(999, { name: 'New Name' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteLocation', () => {
    it('should soft delete location', async () => {
      const existingLocation = {
        id: 1,
        name: 'Location 1',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrisma.okucLocation.findFirst.mockResolvedValue(existingLocation);
      mockPrisma.okucLocation.update.mockResolvedValue({
        ...existingLocation,
        deletedAt: new Date(),
      });

      const result = await service.deleteLocation(1);

      expect(result).toBe(true);
      expect(mockPrisma.okucLocation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundError when location not found', async () => {
      mockPrisma.okucLocation.findFirst.mockResolvedValue(null);

      await expect(service.deleteLocation(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('reorderLocations', () => {
    it('should reorder locations in transaction', async () => {
      const ids = [3, 1, 2];
      const mockReordered = [
        { id: 3, name: 'Location 3', sortOrder: 0, deletedAt: null },
        { id: 1, name: 'Location 1', sortOrder: 1, deletedAt: null },
        { id: 2, name: 'Location 2', sortOrder: 2, deletedAt: null },
      ];

      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.okucLocation.findMany.mockResolvedValue(mockReordered);

      const result = await service.reorderLocations(ids);

      expect(result).toEqual(mockReordered);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.okucLocation.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });
});
