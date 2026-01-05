/**
 * Profile Handler Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileHandler } from './profileHandler.js';
import { ProfileService } from '../services/profileService.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { FastifyReply } from 'fastify';

// Mock Fastify Reply
const createMockReply = (): FastifyReply => {
  return {
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as any;
};

describe('ProfileHandler', () => {
  let handler: ProfileHandler;
  let service: ProfileService;

  beforeEach(() => {
    service = {
      getAllProfiles: vi.fn(),
      getProfileById: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
      updateProfileOrders: vi.fn(),
    } as any;

    handler = new ProfileHandler(service);
  });

  describe('getAll', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [
        { id: 1, number: 'P001', name: 'Profile 1', description: null, articleNumber: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, number: 'P002', name: 'Profile 2', description: null, articleNumber: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(service.getAllProfiles).mockResolvedValue(mockProfiles);
      const reply = createMockReply();

      await handler.getAll({} as any, reply);

      expect(service.getAllProfiles).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith(mockProfiles);
    });
  });

  describe('getById', () => {
    it('should return profile when found', async () => {
      const mockProfile = {
        id: 1,
        number: 'P001',
        name: 'Profile 1',
        description: null,
        articleNumber: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileColors: [],
      };

      vi.mocked(service.getProfileById).mockResolvedValue(mockProfile);
      const reply = createMockReply();
      const request = { params: { id: '1' } } as any;

      await handler.getById(request, reply);

      expect(service.getProfileById).toHaveBeenCalledWith(1);
      expect(reply.send).toHaveBeenCalledWith(mockProfile);
    });

    it('should throw NotFoundError when profile not found', async () => {
      vi.mocked(service.getProfileById).mockRejectedValue(new NotFoundError('Profile'));
      const reply = createMockReply();
      const request = { params: { id: '999' } } as any;

      await expect(handler.getById(request, reply)).rejects.toThrow(NotFoundError);
    });

    it('should reject invalid profile ID format', async () => {
      const reply = createMockReply();
      const request = { params: { id: 'invalid' } } as any;

      await expect(handler.getById(request, reply)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create profile and return 201', async () => {
      const input = { number: 'P001', name: 'New Profile', description: 'Test' };
      const mockCreated = { id: 1, ...input, articleNumber: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };

      vi.mocked(service.createProfile).mockResolvedValue(mockCreated);
      const reply = createMockReply();
      const request = { body: input } as any;

      await handler.create(request, reply);

      expect(service.createProfile).toHaveBeenCalledWith(expect.objectContaining(input));
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(mockCreated);
    });

    it('should reject when profile number already exists', async () => {
      const input = { number: 'P001', name: 'New Profile' };

      vi.mocked(service.createProfile).mockRejectedValue(
        new ConflictError('Profile with this number already exists')
      );
      const reply = createMockReply();
      const request = { body: input } as any;

      await expect(handler.create(request, reply)).rejects.toThrow(ConflictError);
    });

    it('should reject invalid input', async () => {
      const reply = createMockReply();
      const request = { body: { name: 'No Number' } } as any; // Missing required 'number'

      await expect(handler.create(request, reply)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update profile successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUpdated = {
        id: 1,
        number: 'P001',
        name: 'Updated Name',
        description: null,
        articleNumber: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(service.updateProfile).mockResolvedValue(mockUpdated);
      const reply = createMockReply();
      const request = { params: { id: '1' }, body: updateData } as any;

      await handler.update(request, reply);

      expect(service.updateProfile).toHaveBeenCalledWith(1, expect.objectContaining(updateData));
      expect(reply.send).toHaveBeenCalledWith(mockUpdated);
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      vi.mocked(service.updateProfile).mockRejectedValue(new NotFoundError('Profile'));
      const reply = createMockReply();
      const request = { params: { id: '999' }, body: { name: 'Test' } } as any;

      await expect(handler.update(request, reply)).rejects.toThrow(NotFoundError);
    });

    it('should reject invalid ID', async () => {
      const reply = createMockReply();
      const request = { params: { id: 'invalid' }, body: { name: 'Test' } } as any;

      await expect(handler.update(request, reply)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete profile and return 204', async () => {
      vi.mocked(service.deleteProfile).mockResolvedValue(undefined);
      const reply = createMockReply();
      const request = { params: { id: '1' } } as any;

      await handler.delete(request, reply);

      expect(service.deleteProfile).toHaveBeenCalledWith(1);
      expect(reply.status).toHaveBeenCalledWith(204);
      expect(reply.send).toHaveBeenCalled();
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      vi.mocked(service.deleteProfile).mockRejectedValue(new NotFoundError('Profile'));
      const reply = createMockReply();
      const request = { params: { id: '999' } } as any;

      await expect(handler.delete(request, reply)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when profile has related data', async () => {
      vi.mocked(service.deleteProfile).mockRejectedValue(
        new ConflictError('Nie można usunąć profilu - istnieją powiązane dane')
      );
      const reply = createMockReply();
      const request = { params: { id: '1' } } as any;

      await expect(handler.delete(request, reply)).rejects.toThrow(ConflictError);
    });

    it('should reject invalid ID', async () => {
      const reply = createMockReply();
      const request = { params: { id: 'invalid' } } as any;

      await expect(handler.delete(request, reply)).rejects.toThrow();
    });
  });

  describe('updateOrders', () => {
    it('should update profile orders and return 204', async () => {
      const input = {
        profileOrders: [
          { id: 1, sortOrder: 1 },
          { id: 2, sortOrder: 2 },
        ],
      };

      vi.mocked(service.updateProfileOrders).mockResolvedValue(undefined);
      const reply = createMockReply();
      const request = { body: input } as any;

      await handler.updateOrders(request, reply);

      expect(service.updateProfileOrders).toHaveBeenCalledWith(expect.objectContaining(input));
      expect(reply.status).toHaveBeenCalledWith(204);
      expect(reply.send).toHaveBeenCalled();
    });

    it('should handle empty profile orders', async () => {
      const input = { profileOrders: [] };

      vi.mocked(service.updateProfileOrders).mockResolvedValue(undefined);
      const reply = createMockReply();
      const request = { body: input } as any;

      await handler.updateOrders(request, reply);

      expect(service.updateProfileOrders).toHaveBeenCalledWith(input);
      expect(reply.status).toHaveBeenCalledWith(204);
    });

    it('should reject invalid input', async () => {
      const reply = createMockReply();
      const request = { body: { profileOrders: 'invalid' } } as any; // Should be array

      await expect(handler.updateOrders(request, reply)).rejects.toThrow();
    });
  });
});