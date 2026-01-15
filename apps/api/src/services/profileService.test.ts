/**
 * ProfileService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from './profileService.js';
import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { createMockPrisma } from '../tests/mocks/prisma.mock.js';

describe('ProfileService', () => {
  let service: ProfileService;
  let repository: ProfileRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new ProfileRepository(mockPrisma);
    service = new ProfileService(repository);
  });

  describe('getAllProfiles', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [
        { id: 1, number: 'P001', name: 'Profile 1', description: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, number: 'P002', name: 'Profile 2', description: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles);

      const result = await service.getAllProfiles();

      expect(result).toEqual(mockProfiles);
      expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
        orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
      });
    });
  });

  describe('getProfileById', () => {
    it('should return profile when found', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfileById(1);

      expect(result).toEqual(mockProfile);
      expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundError when profile not found', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.getProfileById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createProfile', () => {
    it('should create profile when number is unique', async () => {
      const input = { number: 'P001', name: 'New Profile', description: 'Test' };
      const mockCreated = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() };
      const mockColors = [{ id: 1 }, { id: 2 }];

      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue(mockCreated);
      mockPrisma.color.findMany.mockResolvedValue(mockColors);
      mockPrisma.profileColor.findMany.mockResolvedValue([]); // No existing links
      mockPrisma.warehouseStock.findMany.mockResolvedValue([]); // No existing stock
      mockPrisma.profileColor.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.warehouseStock.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createProfile(input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith({
        where: { number: 'P001' },
      });
      expect(mockPrisma.profile.create).toHaveBeenCalledWith({
        data: input,
      });
    });

    it('should throw ConflictError when profile number already exists', async () => {
      const input = { number: 'P001', name: 'New Profile' };
      const existing = { id: 1, number: 'P001', name: 'Existing', description: null, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.profile.findUnique.mockResolvedValue(existing);

      await expect(service.createProfile(input)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update profile when exists', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };
      const updateData = { name: 'Updated Name', description: 'Updated Desc' };
      const mockUpdated = { ...mockProfile, ...updateData };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.update.mockResolvedValue(mockUpdated);

      const result = await service.updateProfile(1, updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.profile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(999, { name: 'Test' })).rejects.toThrow(NotFoundError);
      expect(mockPrisma.profile.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile when exists and has no related data', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      // Mock related counts - all zero
      mockPrisma.orderRequirement.count.mockResolvedValue(0);
      mockPrisma.warehouseStock.count.mockResolvedValue(0);
      mockPrisma.warehouseOrder.count.mockResolvedValue(0);
      mockPrisma.warehouseHistory.count.mockResolvedValue(0);
      // Mock deleteMany for profileColor
      mockPrisma.profileColor.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.profile.delete.mockResolvedValue(mockProfile);

      await service.deleteProfile(1);

      expect(mockPrisma.profile.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.deleteProfile(999)).rejects.toThrow(NotFoundError);
      expect(mockPrisma.profile.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when profile has related order requirements', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      // Mock related counts - with order requirements
      mockPrisma.orderRequirement.count.mockResolvedValue(2);
      mockPrisma.warehouseStock.count.mockResolvedValue(0);
      mockPrisma.warehouseOrder.count.mockResolvedValue(0);
      mockPrisma.warehouseHistory.count.mockResolvedValue(0);

      await expect(service.deleteProfile(1)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when profile has warehouse stock', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      // Mock related counts - with warehouse stock
      mockPrisma.orderRequirement.count.mockResolvedValue(0);
      mockPrisma.warehouseStock.count.mockResolvedValue(5);
      mockPrisma.warehouseOrder.count.mockResolvedValue(0);
      mockPrisma.warehouseHistory.count.mockResolvedValue(0);

      await expect(service.deleteProfile(1)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when profile has multiple types of related data', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      // Mock related counts - with multiple types
      mockPrisma.orderRequirement.count.mockResolvedValue(2);
      mockPrisma.warehouseStock.count.mockResolvedValue(3);
      mockPrisma.warehouseOrder.count.mockResolvedValue(1);
      mockPrisma.warehouseHistory.count.mockResolvedValue(5);

      await expect(service.deleteProfile(1)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.delete).not.toHaveBeenCalled();
    });
  });

  describe('createProfile - articleNumber uniqueness', () => {
    it('should throw ConflictError when articleNumber already exists', async () => {
      const input = {
        number: 'P001',
        name: 'New Profile',
        articleNumber: 'ART123',
      };

      const existingArticle = {
        id: 99,
        number: 'P999',
        name: 'Existing',
        description: null,
        articleNumber: 'ART123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call for number check returns null
      mockPrisma.profile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingArticle);

      await expect(service.createProfile(input)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.create).not.toHaveBeenCalled();
    });

    it('should create profile when articleNumber is unique', async () => {
      const input = {
        number: 'P001',
        name: 'New Profile',
        articleNumber: 'ART123',
      };
      const mockCreated = {
        id: 1,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockColors = [{ id: 1 }, { id: 2 }];

      // Both uniqueness checks return null
      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue(mockCreated);
      mockPrisma.color.findMany.mockResolvedValue(mockColors);
      mockPrisma.profileColor.findMany.mockResolvedValue([]);
      mockPrisma.warehouseStock.findMany.mockResolvedValue([]);
      mockPrisma.profileColor.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.warehouseStock.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createProfile(input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.profile.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should create profile without articleNumber', async () => {
      const input = {
        number: 'P001',
        name: 'New Profile',
      };
      const mockCreated = {
        id: 1,
        ...input,
        description: null,
        articleNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockColors = [{ id: 1 }, { id: 2 }];

      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue(mockCreated);
      mockPrisma.color.findMany.mockResolvedValue(mockColors);
      mockPrisma.profileColor.findMany.mockResolvedValue([]);
      mockPrisma.warehouseStock.findMany.mockResolvedValue([]);
      mockPrisma.profileColor.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.warehouseStock.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createProfile(input);

      expect(result).toEqual(mockCreated);
      // Should only check for number, not articleNumber
      expect(mockPrisma.profile.findUnique).toHaveBeenCalledOnce();
    });
  });

  describe('updateProfile - articleNumber uniqueness', () => {
    it('should throw ConflictError when updating to existing articleNumber', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        articleNumber: 'ART001',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      const existingArticle = {
        id: 2,
        number: 'P002',
        name: 'Profile 2',
        description: null,
        articleNumber: 'ART123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = { articleNumber: 'ART123' };

      mockPrisma.profile.findUnique
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(existingArticle);

      await expect(service.updateProfile(1, updateData)).rejects.toThrow(ConflictError);
      expect(mockPrisma.profile.update).not.toHaveBeenCalled();
    });

    it('should allow updating articleNumber to same profile value', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        articleNumber: 'ART123',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      const updateData = { articleNumber: 'ART123' };
      const mockUpdated = { ...mockProfile, ...updateData };

      mockPrisma.profile.findUnique
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.profile.update.mockResolvedValue(mockUpdated);

      const result = await service.updateProfile(1, updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.profile.update).toHaveBeenCalled();
    });
  });

  describe('updateProfileOrders', () => {
    it('should update profile sort orders using transaction', async () => {
      const profileOrders = [
        { id: 1, sortOrder: 1 },
        { id: 2, sortOrder: 2 },
        { id: 3, sortOrder: 3 },
      ];

      const { setupTransactionMock } = await import('../tests/mocks/prisma.mock.js');
      setupTransactionMock(mockPrisma);

      await service.updateProfileOrders({ profileOrders });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle empty profile orders array', async () => {
      const { setupTransactionMock } = await import('../tests/mocks/prisma.mock.js');
      setupTransactionMock(mockPrisma);

      await service.updateProfileOrders({ profileOrders: [] });

      expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
    });
  });
});
