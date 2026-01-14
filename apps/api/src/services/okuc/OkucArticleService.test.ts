/**
 * OkucArticleService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OkucArticleService } from './OkucArticleService.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import type { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('OkucArticleService', () => {
  let service: OkucArticleService;
  let mockRepository: Partial<OkucArticleRepository>;

  beforeEach(() => {
    // Mock repository methods
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByArticleId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      addAlias: vi.fn(),
      getAliases: vi.fn(),
    };

    service = new OkucArticleService(mockRepository as OkucArticleRepository);
  });

  describe('getAllArticles', () => {
    it('should return all articles with filters', async () => {
      const mockArticles = [
        { id: 1, articleId: 'A001', name: 'Article 1', usedInPvc: true },
        { id: 2, articleId: 'A002', name: 'Article 2', usedInAlu: true },
      ];
      (mockRepository.findAll as any).mockResolvedValue(mockArticles);

      const result = await service.getAllArticles({ usedInPvc: true });

      expect(result).toEqual(mockArticles);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ usedInPvc: true });
    });
  });

  describe('getArticleById', () => {
    it('should return article when found', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      (mockRepository.findById as any).mockResolvedValue(mockArticle);

      const result = await service.getArticleById(1);

      expect(result).toEqual(mockArticle);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when article not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);

      await expect(service.getArticleById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getArticleByArticleId', () => {
    it('should return article when found by articleId', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      (mockRepository.findByArticleId as any).mockResolvedValue(mockArticle);

      const result = await service.getArticleByArticleId('A001');

      expect(result).toEqual(mockArticle);
      expect(mockRepository.findByArticleId).toHaveBeenCalledWith('A001');
    });

    it('should throw NotFoundError when article not found', async () => {
      (mockRepository.findByArticleId as any).mockResolvedValue(null);

      await expect(service.getArticleByArticleId('NOTFOUND')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createArticle', () => {
    it('should create article with valid data', async () => {
      const input = {
        articleId: 'A001',
        name: 'Article 1',
        usedInPvc: true,
        usedInAlu: false,
        orderClass: 'typical' as const,
        sizeClass: 'standard' as const,
      };
      const mockCreated = { id: 1, ...input };
      (mockRepository.create as any).mockResolvedValue(mockCreated);

      const result = await service.createArticle(input);

      expect(result).toEqual(mockCreated);
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateArticle', () => {
    it('should update article when exists', async () => {
      const mockUpdated = { id: 1, articleId: 'A001', name: 'Updated' };
      (mockRepository.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateArticle(1, { name: 'Updated' });

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    });

    it('should throw NotFoundError when article not found', async () => {
      (mockRepository.update as any).mockResolvedValue(null);

      await expect(service.updateArticle(999, { name: 'Updated' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteArticle', () => {
    it('should delete article when exists', async () => {
      const mockDeleted = { id: 1, articleId: 'A001' };
      (mockRepository.delete as any).mockResolvedValue(mockDeleted);

      const result = await service.deleteArticle(1);

      expect(result).toEqual(mockDeleted);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when article not found', async () => {
      (mockRepository.delete as any).mockResolvedValue(null);

      await expect(service.deleteArticle(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('addAlias', () => {
    it('should add alias to existing article', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      const mockAlias = { id: 1, articleId: 1, aliasNumber: 'A001-ALIAS' };
      (mockRepository.findById as any).mockResolvedValue(mockArticle);
      (mockRepository.addAlias as any).mockResolvedValue(mockAlias);

      const result = await service.addAlias(1, 'A001-ALIAS');

      expect(result).toEqual(mockAlias);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.addAlias).toHaveBeenCalledWith(1, 'A001-ALIAS');
    });

    it('should throw NotFoundError when article not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);

      await expect(service.addAlias(999, 'A001-ALIAS')).rejects.toThrow(NotFoundError);
    });
  });
});
