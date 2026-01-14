/**
 * OkucArticleService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OkucArticleService } from './OkucArticleService.js';
import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { createMockPrisma } from '../../tests/mocks/prisma.mock.js';

// Mock prisma
vi.mock('../../utils/prisma.js', () => ({
  prisma: createMockPrisma(),
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

describe('OkucArticleService', () => {
  let service: OkucArticleService;
  let mockRepository: any;

  beforeEach(() => {
    // Mock repository
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

    service = new OkucArticleService(mockRepository);
  });

  describe('getAllArticles', () => {
    it('should return all articles with filters', async () => {
      const mockArticles = [
        { id: 1, articleId: 'A001', name: 'Article 1', usedInPvc: true },
        { id: 2, articleId: 'A002', name: 'Article 2', usedInAlu: true },
      ];
      mockRepository.findAll.mockResolvedValue(mockArticles);

      const result = await service.getAllArticles({ usedInPvc: true });

      expect(result).toEqual(mockArticles);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ usedInPvc: true });
    });
  });

  describe('getArticleById', () => {
    it('should return article when found', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      mockRepository.findById.mockResolvedValue(mockArticle);

      const result = await service.getArticleById(1);

      expect(result).toEqual(mockArticle);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when article not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getArticleById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getArticleByArticleId', () => {
    it('should return article when found by articleId', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      mockRepository.findByArticleId.mockResolvedValue(mockArticle);

      const result = await service.getArticleByArticleId('A001');

      expect(result).toEqual(mockArticle);
      expect(mockRepository.findByArticleId).toHaveBeenCalledWith('A001');
    });

    it('should throw NotFoundError when article not found', async () => {
      mockRepository.findByArticleId.mockResolvedValue(null);

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
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.createArticle(input);

      expect(result).toEqual(mockCreated);
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateArticle', () => {
    it('should update article when exists', async () => {
      const mockUpdated = { id: 1, articleId: 'A001', name: 'Updated' };
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.updateArticle(1, { name: 'Updated' });

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    });

    it('should throw NotFoundError when article not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(service.updateArticle(999, { name: 'Updated' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteArticle', () => {
    it('should delete article when exists', async () => {
      const mockDeleted = { id: 1, articleId: 'A001' };
      mockRepository.delete.mockResolvedValue(mockDeleted);

      const result = await service.deleteArticle(1);

      expect(result).toEqual(mockDeleted);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when article not found', async () => {
      mockRepository.delete.mockResolvedValue(null);

      await expect(service.deleteArticle(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('addAlias', () => {
    it('should add alias to existing article', async () => {
      const mockArticle = { id: 1, articleId: 'A001', name: 'Article 1' };
      const mockAlias = { id: 1, articleId: 1, aliasNumber: 'A001-ALIAS' };
      mockRepository.findById.mockResolvedValue(mockArticle);
      mockRepository.addAlias.mockResolvedValue(mockAlias);

      const result = await service.addAlias(1, 'A001-ALIAS');

      expect(result).toEqual(mockAlias);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.addAlias).toHaveBeenCalledWith(1, 'A001-ALIAS');
    });

    it('should throw NotFoundError when article not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.addAlias(999, 'A001-ALIAS')).rejects.toThrow(NotFoundError);
    });
  });

  describe('previewImport', () => {
    it('should parse CSV and detect new articles', async () => {
      const csvContent = `Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
A001;Article 1;Tak;Nie;Typowy;Standard;Magazyn 1`;

      mockRepository.findByArticleId.mockResolvedValue(null);

      const result = await service.previewImport(csvContent);

      expect(result.new).toHaveLength(1);
      expect(result.new[0]).toMatchObject({
        articleId: 'A001',
        name: 'Article 1',
        usedInPvc: true,
        usedInAlu: false,
        orderClass: 'typical',
        sizeClass: 'standard',
      });
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect conflicts with existing articles', async () => {
      const csvContent = `Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
A001;Article 1;Tak;Nie;Typowy;Standard;Magazyn 1`;

      const existingArticle = {
        id: 1,
        articleId: 'A001',
        name: 'Old Name',
        usedInPvc: false,
        usedInAlu: true,
        orderClass: 'atypical',
        sizeClass: 'gabarat',
      };
      mockRepository.findByArticleId.mockResolvedValue(existingArticle);

      const result = await service.previewImport(csvContent);

      expect(result.new).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        articleId: 'A001',
        existingData: {
          name: 'Old Name',
          usedInPvc: false,
          usedInAlu: true,
          orderClass: 'atypical',
          sizeClass: 'gabarat',
        },
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should report errors for invalid rows', async () => {
      const csvContent = `Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
;Invalid Row;Tak;Nie;Typowy;Standard;Magazyn 1`;

      const result = await service.previewImport(csvContent);

      expect(result.new).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 2,
        error: expect.stringContaining('Brak numeru artykulu'),
      });
    });

    it('should throw ValidationError for empty CSV', async () => {
      const csvContent = `Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn`;

      await expect(service.previewImport(csvContent)).rejects.toThrow(ValidationError);
    });
  });

  describe('exportArticlesToCsv', () => {
    it('should export all articles to CSV', async () => {
      const mockArticles = [
        {
          id: 1,
          articleId: 'A001',
          name: 'Article 1',
          description: 'Test description',
          usedInPvc: true,
          usedInAlu: false,
          orderClass: 'typical',
          sizeClass: 'standard',
          orderUnit: 'piece',
          packagingSizes: '10,20,30',
          preferredSize: 20,
          supplierCode: 'SUP001',
          leadTimeDays: 14,
          safetyDays: 3,
          location: { name: 'Magazyn 1' },
        },
      ];
      mockRepository.findAll.mockResolvedValue(mockArticles);

      const csv = await service.exportArticlesToCsv();

      expect(csv).toContain('Numer artykulu;Nazwa');
      expect(csv).toContain('A001;Article 1');
      expect(csv).toContain('TAK;NIE'); // PVC;ALU
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by warehouse type', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.exportArticlesToCsv('pvc');

      expect(mockRepository.findAll).toHaveBeenCalledWith({ usedInPvc: true });
    });
  });
});
