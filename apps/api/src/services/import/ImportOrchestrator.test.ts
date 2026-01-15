/**
 * ImportOrchestrator Unit Tests
 * Podstawowe testy dla orchestratora (bez testowania pelnej logiki procesorow)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportOrchestrator } from './ImportOrchestrator.js';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { NotFoundError } from '../../utils/errors.js';

// Mock wszystkich zaleznosci
vi.mock('../../index.js', () => ({
  prisma: {},
}));

vi.mock('../event-emitter.js', () => ({
  emitOrderUpdated: vi.fn(),
  emitDeliveryCreated: vi.fn(),
}));

// Mock klasy jako prawdziwe klasy (wymagane przez Vitest 4)
vi.mock('../importLockService.js', () => {
  return {
    ImportLockService: class MockImportLockService {
      acquireLock = vi.fn().mockResolvedValue({ id: 1 });
      releaseLock = vi.fn().mockResolvedValue(true);
      checkLock = vi.fn().mockResolvedValue(null);
    },
  };
});

vi.mock('./importFileSystemService.js', () => {
  return {
    ImportFileSystemService: class MockImportFileSystemService {},
    importFileSystemService: {
      ensureUploadsDirectory: vi.fn().mockResolvedValue('/uploads'),
      generateSafeFilename: vi.fn().mockReturnValue('safe-filename.csv'),
      joinPath: vi.fn((a, b) => a + '/' + b),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockReturnValue(true),
      normalizePath: vi.fn((p) => p),
      validatePathWithinBase: vi.fn(),
      validateDirectory: vi.fn(),
      readDirectory: vi.fn().mockResolvedValue([]),
      extractDateFromFolderName: vi.fn().mockReturnValue(new Date()),
      getBaseName: vi.fn((p) => p.split('/').pop() || p),
      getDirName: vi.fn((p) => p.split('/').slice(0, -1).join('/') || '/'),
    },
  };
});

vi.mock('./importSettingsService.js', () => {
  return {
    ImportSettingsService: class MockImportSettingsService {
      getImportsBasePath = vi.fn().mockResolvedValue('/imports');
    },
  };
});

vi.mock('./importValidationService.js', () => {
  return {
    ImportValidationService: class MockImportValidationService {
      validateUploadedFile = vi.fn();
      detectFileType = vi.fn().mockReturnValue('uzyte_bele');
      sanitizeFilename = vi.fn((f) => f);
      validateImportCanBeProcessed = vi.fn().mockImplementation(async (id) => ({
        id,
        fileType: 'uzyte_bele',
        status: 'pending',
      }));
    },
  };
});

vi.mock('./importTransactionService.js', () => {
  return {
    ImportTransactionService: class MockImportTransactionService {
      markAsProcessing = vi.fn().mockResolvedValue(undefined);
      markAsCompleted = vi.fn().mockResolvedValue(undefined);
      markAsError = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('./importConflictService.js', () => {
  return {
    ImportConflictService: class MockImportConflictService {},
  };
});

vi.mock('./UzyteBeleProcessor.js', () => {
  return {
    UzyteBeleProcessor: class MockUzyteBeleProcessor {
      getUzyteBelePreview = vi.fn().mockResolvedValue({
        data: [],
        summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0 },
      });
      processUzyteBeleImport = vi.fn().mockResolvedValue({ orderId: 1 });
      processUzyteBeleWithResolution = vi.fn().mockResolvedValue({ success: true, result: {} });
      performFolderImport = vi.fn().mockResolvedValue({ imported: 0, failed: 0, errors: [] });
      scanFolder = vi.fn().mockResolvedValue({ csvFiles: [] });
    },
  };
});

vi.mock('./CenyProcessor.js', () => {
  return {
    CenyProcessor: class MockCenyProcessor {
      autoImportPdf = vi.fn().mockResolvedValue({ fileImport: {}, autoImportStatus: 'success' });
      getPdfPreview = vi.fn().mockResolvedValue({
        data: [],
        summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0 },
      });
      processPdfApproval = vi.fn().mockResolvedValue({ success: true });
    },
  };
});

describe('ImportOrchestrator', () => {
  let orchestrator: ImportOrchestrator;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findPending: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      findOrderById: vi.fn(),
      deleteOrder: vi.fn(),
    };

    orchestrator = new ImportOrchestrator(mockRepository as ImportRepository);
  });

  describe('CRUD operations', () => {
    it('should get all imports', async () => {
      const mockImports = [{ id: 1, filename: 'test.csv', status: 'pending' }];
      mockRepository.findAll.mockResolvedValue(mockImports);

      const result = await orchestrator.getAllImports();

      expect(result).toEqual(mockImports);
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should get pending imports', async () => {
      const mockPending = [{ id: 1, filename: 'test.csv', status: 'pending' }];
      mockRepository.findPending.mockResolvedValue(mockPending);

      const result = await orchestrator.getPendingImports();

      expect(result).toEqual(mockPending);
    });

    it('should get import by ID', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'pending' };
      mockRepository.findById.mockResolvedValue(mockImport);

      const result = await orchestrator.getImportById(1);

      expect(result).toEqual(mockImport);
    });

    it('should throw NotFoundError when import not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(orchestrator.getImportById(999)).rejects.toThrow(NotFoundError);
    });

    it('should reject import', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'pending' };
      mockRepository.findById.mockResolvedValue(mockImport);
      mockRepository.update.mockResolvedValue({ ...mockImport, status: 'rejected' });

      const result = await orchestrator.rejectImport(1);

      expect(result.status).toBe('rejected');
      expect(mockRepository.update).toHaveBeenCalledWith(1, { status: 'rejected' });
    });

    it('should delete import', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'pending', metadata: null };
      mockRepository.findById.mockResolvedValue(mockImport);
      mockRepository.delete.mockResolvedValue(undefined);

      await orchestrator.deleteImport(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getImportsBasePath', () => {
    it('should return imports base path', async () => {
      const result = await orchestrator.getImportsBasePath();

      expect(result).toBe('/imports');
    });
  });

  describe('listFolders', () => {
    it('should return error when base path does not exist', async () => {
      const { importFileSystemService } = await import('./importFileSystemService.js');
      (importFileSystemService.exists).mockReturnValueOnce(false);

      const result = await orchestrator.listFolders();

      expect(result.error).toBeDefined();
      expect(result.folders).toEqual([]);
    });
  });
});
