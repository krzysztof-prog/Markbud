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

      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue(mockCreated);

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
  });
});
