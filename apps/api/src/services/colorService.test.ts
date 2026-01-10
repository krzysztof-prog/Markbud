/**
 * ColorService Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ColorService } from './colorService.js';
import { ColorRepository } from '../repositories/ColorRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { createMockPrisma } from '../tests/mocks/prisma.mock.js';

describe('ColorService', () => {
  let service: ColorService;
  let repository: ColorRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new ColorRepository(mockPrisma);
    service = new ColorService(repository);
  });

  describe('getAllColors', () => {
    it('should return all colors', async () => {
      const mockColors = [
        { id: 1, code: 'RAL9016', name: 'White', type: 'ral', hexColor: '#FFFFFF', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, code: 'RAL7016', name: 'Gray', type: 'ral', hexColor: '#293133', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockPrisma.color.findMany.mockResolvedValue(mockColors);

      const result = await service.getAllColors();

      expect(result).toEqual(mockColors);
      expect(mockPrisma.color.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { code: 'asc' },
      });
    });

    it('should filter by type when provided', async () => {
      const mockColors = [
        { id: 1, code: 'RAL9016', name: 'White', type: 'ral', hexColor: '#FFFFFF', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockPrisma.color.findMany.mockResolvedValue(mockColors);

      const result = await service.getAllColors('ral');

      expect(result).toEqual(mockColors);
      expect(mockPrisma.color.findMany).toHaveBeenCalledWith({
        where: { type: 'ral' },
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('getColorById', () => {
    it('should return color when found', async () => {
      const mockColor = {
        id: 1,
        code: 'RAL9016',
        name: 'White',
        type: 'ral',
        hexColor: '#FFFFFF',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.color.findUnique.mockResolvedValue(mockColor);

      const result = await service.getColorById(1);

      expect(result).toEqual(mockColor);
    });

    it('should throw NotFoundError when color not found', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);

      await expect(service.getColorById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createColor', () => {
    it('should create color with profile links and warehouse stock', async () => {
      const input = { code: 'RAL9016', name: 'White', type: 'ral', hexColor: '#FFFFFF' };
      const mockProfiles = [
        { id: 1, number: 'P001', name: 'Profile 1', description: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, number: 'P002', name: 'Profile 2', description: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      const mockCreated = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.color.findUnique.mockResolvedValue(null);
      mockPrisma.color.create.mockResolvedValue(mockCreated);
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles);
      mockPrisma.profileColor.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.warehouseStock.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createColor(input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.profileColor.createMany).toHaveBeenCalled();
      expect(mockPrisma.warehouseStock.createMany).toHaveBeenCalled();
    });

    it('should throw ConflictError when color code already exists', async () => {
      const input = { code: 'RAL9016', name: 'White', type: 'ral' };
      const existing = { id: 1, ...input, hexColor: null, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.color.findUnique.mockResolvedValue(existing);

      await expect(service.createColor(input)).rejects.toThrow(ConflictError);
      expect(mockPrisma.color.create).not.toHaveBeenCalled();
    });
  });

  describe('updateColor', () => {
    it('should update color when exists', async () => {
      const mockColor = {
        id: 1,
        code: 'RAL9016',
        name: 'White',
        type: 'ral',
        hexColor: '#FFFFFF',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };
      const updateData = { name: 'Pure White' };
      const mockUpdated = { ...mockColor, ...updateData };

      mockPrisma.color.findUnique.mockResolvedValue(mockColor);
      mockPrisma.color.update.mockResolvedValue(mockUpdated);

      const result = await service.updateColor(1, updateData);

      expect(result).toEqual(mockUpdated);
    });

    it('should throw NotFoundError when color does not exist', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);

      await expect(service.updateColor(999, { name: 'Test' })).rejects.toThrow(NotFoundError);
      expect(mockPrisma.color.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteColor', () => {
    it('should delete color when exists', async () => {
      const mockColor = {
        id: 1,
        code: 'RAL9016',
        name: 'White',
        type: 'ral',
        hexColor: '#FFFFFF',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      mockPrisma.color.findUnique.mockResolvedValue(mockColor);
      mockPrisma.color.delete.mockResolvedValue(mockColor);

      await service.deleteColor(1);

      expect(mockPrisma.color.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError when color does not exist', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);

      await expect(service.deleteColor(999)).rejects.toThrow(NotFoundError);
      expect(mockPrisma.color.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateProfileColorVisibility', () => {
    it('should update profile color visibility', async () => {
      const mockResult = {
        profileId: 1,
        colorId: 1,
        isVisible: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.profileColor.update.mockResolvedValue(mockResult);

      const result = await service.updateProfileColorVisibility(1, 1, false);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.profileColor.update).toHaveBeenCalledWith({
        where: {
          profileId_colorId: {
            profileId: 1,
            colorId: 1,
          },
        },
        data: { isVisible: false },
      });
    });
  });
});
