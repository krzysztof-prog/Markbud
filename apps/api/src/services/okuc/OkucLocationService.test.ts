/**
 * OkucLocationService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// Import after mocks
const { OkucLocationService } = await import('./OkucLocationService.js');

describe('OkucLocationService', () => {
  let service: InstanceType<typeof OkucLocationService>;

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
      ];
      mockPrisma.okucLocation.findMany.mockResolvedValue(mockLocations);

      const result = await service.getAllLocations();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'Location 1',
        articlesCount: 5,
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
  });
});
