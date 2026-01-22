/**
 * ImportOrchestrator Unit Tests
 * Testy dla orchestratora importow - upload, preview, approval, folder operations
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ImportOrchestrator } from './ImportOrchestrator.js';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';

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
  const mockAcquireLock = vi.fn().mockResolvedValue({ id: 1 });
  const mockReleaseLock = vi.fn().mockResolvedValue(true);
  const mockCheckLock = vi.fn().mockResolvedValue(null);
  return {
    ImportLockService: class MockImportLockService {
      acquireLock = mockAcquireLock;
      releaseLock = mockReleaseLock;
      checkLock = mockCheckLock;
    },
    __mocks: { mockAcquireLock, mockReleaseLock, mockCheckLock },
  };
});

vi.mock('./importFileSystemService.js', () => {
  const mockFileSystemService = {
    ensureUploadsDirectory: vi.fn().mockResolvedValue('/uploads'),
    generateSafeFilename: vi.fn().mockReturnValue('safe-filename.csv'),
    joinPath: vi.fn((a: string, b: string) => a + '/' + b),
    writeFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockReturnValue(true),
    normalizePath: vi.fn((p: string) => p),
    validatePathWithinBase: vi.fn(),
    validateDirectory: vi.fn(),
    readDirectory: vi.fn().mockResolvedValue([]),
    extractDateFromFolderName: vi.fn().mockReturnValue(new Date('2026-01-15')),
    getBaseName: vi.fn((p: string) => p.split('/').pop() || p),
    getDirName: vi.fn((p: string) => p.split('/').slice(0, -1).join('/') || '/'),
    copyFile: vi.fn().mockResolvedValue(undefined),
    moveFolderToArchive: vi.fn().mockResolvedValue('/archive/folder'),
    deleteDirectory: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ImportFileSystemService: class MockImportFileSystemService {},
    importFileSystemService: mockFileSystemService,
  };
});

vi.mock('./importSettingsService.js', () => {
  const mockGetImportsBasePath = vi.fn().mockResolvedValue('/imports');
  return {
    ImportSettingsService: class MockImportSettingsService {
      getImportsBasePath = mockGetImportsBasePath;
    },
    __mocks: { mockGetImportsBasePath },
  };
});

vi.mock('./importValidationService.js', () => {
  const mockValidateUploadedFile = vi.fn();
  const mockDetectFileType = vi.fn().mockReturnValue('uzyte_bele');
  const mockSanitizeFilename = vi.fn((f: string) => f.replace(/[^a-zA-Z0-9._-]/g, '_'));
  const mockValidateImportCanBeProcessed = vi.fn().mockImplementation(async (id: number) => ({
    id,
    fileType: 'uzyte_bele',
    status: 'pending',
    filepath: '/uploads/test.csv',
  }));
  const mockParseAndValidateCsv = vi.fn().mockResolvedValue({
    orderNumber: '12345',
    data: [],
    summary: { totalRecords: 10, validRecords: 10, invalidRecords: 0 },
  });
  return {
    ImportValidationService: class MockImportValidationService {
      validateUploadedFile = mockValidateUploadedFile;
      detectFileType = mockDetectFileType;
      sanitizeFilename = mockSanitizeFilename;
      validateImportCanBeProcessed = mockValidateImportCanBeProcessed;
      parseAndValidateCsv = mockParseAndValidateCsv;
    },
    __mocks: {
      mockValidateUploadedFile,
      mockDetectFileType,
      mockSanitizeFilename,
      mockValidateImportCanBeProcessed,
      mockParseAndValidateCsv,
    },
  };
});

vi.mock('./importTransactionService.js', () => {
  const mockMarkAsProcessing = vi.fn().mockResolvedValue(undefined);
  const mockMarkAsCompleted = vi.fn().mockResolvedValue(undefined);
  const mockMarkAsError = vi.fn().mockResolvedValue(undefined);
  return {
    ImportTransactionService: class MockImportTransactionService {
      markAsProcessing = mockMarkAsProcessing;
      markAsCompleted = mockMarkAsCompleted;
      markAsError = mockMarkAsError;
    },
    __mocks: { mockMarkAsProcessing, mockMarkAsCompleted, mockMarkAsError },
  };
});

vi.mock('./importConflictService.js', () => {
  const mockDetectConflicts = vi.fn().mockResolvedValue({ hasConflict: false });
  const mockExecuteResolution = vi.fn().mockResolvedValue({ action: 'add_new', message: 'OK' });
  return {
    ImportConflictService: class MockImportConflictService {
      detectConflicts = mockDetectConflicts;
      executeResolution = mockExecuteResolution;
    },
    __mocks: { mockDetectConflicts, mockExecuteResolution },
  };
});

vi.mock('./UzyteBeleProcessor.js', () => {
  const mockGetUzyteBelePreview = vi.fn().mockResolvedValue({
    data: [{ lineNumber: 1, profile: 'TEST', length: 6000 }],
    summary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 },
  });
  const mockProcessUzyteBeleImport = vi.fn().mockResolvedValue({ orderId: 1, created: 5, updated: 0 });
  const mockProcessUzyteBeleWithResolution = vi.fn().mockResolvedValue({ success: true, result: { orderId: 1 } });
  const mockPerformFolderImport = vi.fn().mockResolvedValue({ imported: 3, failed: 0, errors: [] });
  const mockScanFolder = vi.fn().mockResolvedValue({ csvFiles: ['file1.csv', 'file2.csv'] });
  const mockPreviewByFilepath = vi.fn().mockResolvedValue({
    data: [],
    summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0 },
  });
  return {
    UzyteBeleProcessor: class MockUzyteBeleProcessor {
      getUzyteBelePreview = mockGetUzyteBelePreview;
      processUzyteBeleImport = mockProcessUzyteBeleImport;
      processUzyteBeleWithResolution = mockProcessUzyteBeleWithResolution;
      performFolderImport = mockPerformFolderImport;
      scanFolder = mockScanFolder;
      previewByFilepath = mockPreviewByFilepath;
    },
    __mocks: {
      mockGetUzyteBelePreview,
      mockProcessUzyteBeleImport,
      mockProcessUzyteBeleWithResolution,
      mockPerformFolderImport,
      mockScanFolder,
      mockPreviewByFilepath,
    },
  };
});

vi.mock('./CenyProcessor.js', () => {
  const mockAutoImportPdf = vi.fn().mockResolvedValue({
    fileImport: { id: 1, status: 'completed' },
    autoImportStatus: 'success',
  });
  const mockGetPdfPreview = vi.fn().mockResolvedValue({
    data: [{ price: 100, profile: 'TEST' }],
    summary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 },
  });
  const mockProcessPdfApproval = vi.fn().mockResolvedValue({ success: true, updated: 5 });
  return {
    CenyProcessor: class MockCenyProcessor {
      autoImportPdf = mockAutoImportPdf;
      getPdfPreview = mockGetPdfPreview;
      processPdfApproval = mockProcessPdfApproval;
    },
    __mocks: { mockAutoImportPdf, mockGetPdfPreview, mockProcessPdfApproval },
  };
});

// Mock CSV parser for processImport
vi.mock('../parsers/csv-parser.js', () => {
  const mockProcessUzyteBele = vi.fn().mockResolvedValue({ orderId: 1, created: 5, updated: 0 });
  return {
    CsvParser: class MockCsvParser {
      processUzyteBele = mockProcessUzyteBele;
    },
    __mocks: { mockProcessUzyteBele },
  };
});

describe('ImportOrchestrator', () => {
  let orchestrator: ImportOrchestrator;
  let mockRepository: {
    findAll: Mock;
    findPending: Mock;
    findById: Mock;
    update: Mock;
    delete: Mock;
    create: Mock;
    findOrderById: Mock;
    deleteOrder: Mock;
    findDeliveryByDateAndNumber: Mock;
    createDelivery: Mock;
    findExistingDeliveryOrder: Mock;
    getMaxDeliveryOrderPosition: Mock;
    addOrderToDelivery: Mock;
  };

  // Get references to mocks from the hoisted mocks
  let mockFileSystemService: ReturnType<typeof import('./importFileSystemService.js')>['importFileSystemService'];
  let lockMocks: { mockAcquireLock: Mock; mockReleaseLock: Mock; mockCheckLock: Mock };
  let validationMocks: {
    mockValidateUploadedFile: Mock;
    mockDetectFileType: Mock;
    mockSanitizeFilename: Mock;
    mockValidateImportCanBeProcessed: Mock;
    mockParseAndValidateCsv: Mock;
  };
  let transactionMocks: { mockMarkAsProcessing: Mock; mockMarkAsCompleted: Mock; mockMarkAsError: Mock };
  let conflictMocks: { mockDetectConflicts: Mock; mockExecuteResolution: Mock };
  let uzyteBeleMocks: {
    mockGetUzyteBelePreview: Mock;
    mockProcessUzyteBeleImport: Mock;
    mockProcessUzyteBeleWithResolution: Mock;
    mockPerformFolderImport: Mock;
    mockScanFolder: Mock;
    mockPreviewByFilepath: Mock;
  };
  let cenyMocks: { mockAutoImportPdf: Mock; mockGetPdfPreview: Mock; mockProcessPdfApproval: Mock };
  let csvParserMocks: { mockProcessUzyteBele: Mock };
  let settingsMocks: { mockGetImportsBasePath: Mock };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mock references
    const fsModule = await import('./importFileSystemService.js');
    mockFileSystemService = fsModule.importFileSystemService;

    const lockModule = (await import('../importLockService.js')) as unknown as { __mocks: typeof lockMocks };
    lockMocks = lockModule.__mocks;

    const validationModule = (await import('./importValidationService.js')) as unknown as {
      __mocks: typeof validationMocks;
    };
    validationMocks = validationModule.__mocks;

    const transactionModule = (await import('./importTransactionService.js')) as unknown as {
      __mocks: typeof transactionMocks;
    };
    transactionMocks = transactionModule.__mocks;

    const conflictModule = (await import('./importConflictService.js')) as unknown as {
      __mocks: typeof conflictMocks;
    };
    conflictMocks = conflictModule.__mocks;

    const uzyteBeleModule = (await import('./UzyteBeleProcessor.js')) as unknown as {
      __mocks: typeof uzyteBeleMocks;
    };
    uzyteBeleMocks = uzyteBeleModule.__mocks;

    const cenyModule = (await import('./CenyProcessor.js')) as unknown as { __mocks: typeof cenyMocks };
    cenyMocks = cenyModule.__mocks;

    const csvParserModule = (await import('../parsers/csv-parser.js')) as unknown as {
      __mocks: typeof csvParserMocks;
    };
    csvParserMocks = csvParserModule.__mocks;

    const settingsModule = (await import('./importSettingsService.js')) as unknown as {
      __mocks: typeof settingsMocks;
    };
    settingsMocks = settingsModule.__mocks;

    mockRepository = {
      findAll: vi.fn(),
      findPending: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      findOrderById: vi.fn(),
      deleteOrder: vi.fn(),
      findDeliveryByDateAndNumber: vi.fn(),
      createDelivery: vi.fn(),
      findExistingDeliveryOrder: vi.fn(),
      getMaxDeliveryOrderPosition: vi.fn().mockResolvedValue(0),
      addOrderToDelivery: vi.fn(),
    };

    // Reset default mock behaviors
    (mockFileSystemService.exists as Mock).mockReturnValue(true);
    (mockFileSystemService.readDirectory as Mock).mockResolvedValue([]);
    lockMocks.mockAcquireLock.mockResolvedValue({ id: 1 });
    lockMocks.mockCheckLock.mockResolvedValue(null);
    validationMocks.mockDetectFileType.mockReturnValue('uzyte_bele');
    conflictMocks.mockDetectConflicts.mockResolvedValue({ hasConflict: false });

    orchestrator = new ImportOrchestrator(mockRepository as unknown as ImportRepository);
  });

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  describe('CRUD operations', () => {
    it('should get all imports', async () => {
      const mockImports = [{ id: 1, filename: 'test.csv', status: 'pending' }];
      mockRepository.findAll.mockResolvedValue(mockImports);

      const result = await orchestrator.getAllImports();

      expect(result).toEqual(mockImports);
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should get all imports with status filter', async () => {
      const mockImports = [{ id: 1, filename: 'test.csv', status: 'completed' }];
      mockRepository.findAll.mockResolvedValue(mockImports);

      const result = await orchestrator.getAllImports('completed');

      expect(result).toEqual(mockImports);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ status: 'completed' });
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

    it('should throw NotFoundError when rejecting non-existent import', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(orchestrator.rejectImport(999)).rejects.toThrow(NotFoundError);
    });

    it('should delete import', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'pending', metadata: null };
      mockRepository.findById.mockResolvedValue(mockImport);
      mockRepository.delete.mockResolvedValue(undefined);

      await orchestrator.deleteImport(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when deleting non-existent import', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(orchestrator.deleteImport(999)).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================
  // UPLOAD FILE FLOW
  // ============================================================

  describe('uploadFile', () => {
    it('should upload CSV file and create import record', async () => {
      const mockCreatedImport = { id: 1, filename: 'test.csv', fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      const result = await orchestrator.uploadFile('test.csv', Buffer.from('data'), 'text/csv');

      expect(validationMocks.mockValidateUploadedFile).toHaveBeenCalledWith('test.csv', 'text/csv', 4);
      expect(validationMocks.mockDetectFileType).toHaveBeenCalledWith('test.csv');
      expect(mockFileSystemService.ensureUploadsDirectory).toHaveBeenCalled();
      expect(mockFileSystemService.generateSafeFilename).toHaveBeenCalled();
      expect(mockFileSystemService.writeFile).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        filename: 'test.csv',
        filepath: '/uploads/safe-filename.csv',
        fileType: 'uzyte_bele',
        status: 'pending',
      });
      expect(result.fileImport).toEqual(mockCreatedImport);
      expect(result.autoImportStatus).toBeNull();
    });

    it('should auto-import PDF (ceny_pdf) file', async () => {
      validationMocks.mockDetectFileType.mockReturnValue('ceny_pdf');
      const mockCreatedImport = { id: 1, filename: 'ceny.pdf', fileType: 'ceny_pdf', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      const result = await orchestrator.uploadFile('ceny.pdf', Buffer.from('pdf-data'), 'application/pdf');

      expect(cenyMocks.mockAutoImportPdf).toHaveBeenCalledWith(1, '/uploads/safe-filename.csv', 'ceny.pdf');
      expect(result.autoImportStatus).toBe('success');
    });

    it('should throw ValidationError for invalid file', async () => {
      validationMocks.mockValidateUploadedFile.mockImplementationOnce(() => {
        throw new ValidationError('Nieprawidlowy typ pliku');
      });

      await expect(
        orchestrator.uploadFile('malware.exe', Buffer.from('bad'), 'application/x-executable')
      ).rejects.toThrow(ValidationError);
    });

    it('should sanitize filename for security', async () => {
      const mockCreatedImport = { id: 1, filename: '../../../etc/passwd', fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      await orchestrator.uploadFile('../../../etc/passwd', Buffer.from('data'), 'text/csv');

      expect(mockFileSystemService.generateSafeFilename).toHaveBeenCalled();
    });

    it('should handle empty buffer', async () => {
      const mockCreatedImport = { id: 1, filename: 'empty.csv', fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      const result = await orchestrator.uploadFile('empty.csv', Buffer.from(''), 'text/csv');

      expect(validationMocks.mockValidateUploadedFile).toHaveBeenCalledWith('empty.csv', 'text/csv', 0);
      expect(result.fileImport).toEqual(mockCreatedImport);
    });

    it('should handle special characters in filename', async () => {
      const mockCreatedImport = {
        id: 1,
        filename: 'plik z polskimi znakami.csv',
        fileType: 'uzyte_bele',
        status: 'pending',
      };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      await orchestrator.uploadFile('plik z polskimi znakami.csv', Buffer.from('data'), 'text/csv');

      // sanitizeFilename is passed as a callback to generateSafeFilename
      expect(mockFileSystemService.generateSafeFilename).toHaveBeenCalled();
    });
  });

  // ============================================================
  // PREVIEW FLOW
  // ============================================================

  describe('getPreview', () => {
    it('should preview uzyte_bele file', async () => {
      const mockImport = { id: 1, fileType: 'uzyte_bele', filepath: '/uploads/test.csv', status: 'pending' };
      mockRepository.findById.mockResolvedValue(mockImport);

      const result = await orchestrator.getPreview(1);

      expect(uzyteBeleMocks.mockGetUzyteBelePreview).toHaveBeenCalledWith('/uploads/test.csv');
      expect(result.import).toEqual(mockImport);
      expect(result.data).toHaveLength(1);
      expect(result.summary.totalRecords).toBe(1);
    });

    it('should preview uzyte_bele_prywatne file', async () => {
      const mockImport = {
        id: 1,
        fileType: 'uzyte_bele_prywatne',
        filepath: '/uploads/prywatne.csv',
        status: 'pending',
      };
      mockRepository.findById.mockResolvedValue(mockImport);

      const result = await orchestrator.getPreview(1);

      expect(uzyteBeleMocks.mockGetUzyteBelePreview).toHaveBeenCalledWith('/uploads/prywatne.csv');
      expect(result.import).toEqual(mockImport);
    });

    it('should preview ceny_pdf file', async () => {
      const mockImport = { id: 1, fileType: 'ceny_pdf', filepath: '/uploads/ceny.pdf', status: 'pending' };
      mockRepository.findById.mockResolvedValue(mockImport);

      const result = await orchestrator.getPreview(1);

      expect(cenyMocks.mockGetPdfPreview).toHaveBeenCalledWith('/uploads/ceny.pdf');
      expect(result.import).toEqual(mockImport);
      expect(result.data).toHaveLength(1);
    });

    it('should return message for unsupported file type', async () => {
      const mockImport = { id: 1, fileType: 'unknown_type', filepath: '/uploads/unknown.xyz', status: 'pending' };
      mockRepository.findById.mockResolvedValue(mockImport);

      const result = await orchestrator.getPreview(1);

      expect(result.message).toBe('Podglad dla tego typu pliku nie jest jeszcze dostepny');
      expect(result.data).toEqual([]);
      expect(result.summary.totalRecords).toBe(0);
    });

    it('should throw NotFoundError for non-existent import', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(orchestrator.getPreview(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('previewByFilepath', () => {
    it('should preview file by filepath', async () => {
      (mockFileSystemService.exists as Mock).mockReturnValue(true);

      const result = await orchestrator.previewByFilepath('/some/path/file.csv');

      expect(uzyteBeleMocks.mockPreviewByFilepath).toHaveBeenCalledWith('/some/path/file.csv');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError when file does not exist', async () => {
      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      await expect(orchestrator.previewByFilepath('/non/existent/file.csv')).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================
  // APPROVAL FLOW
  // ============================================================

  describe('approveImport', () => {
    it('should approve uzyte_bele import', async () => {
      const mockImport = { id: 1, fileType: 'uzyte_bele', filepath: '/uploads/test.csv', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);

      const result = await orchestrator.approveImport(1);

      expect(transactionMocks.mockMarkAsProcessing).toHaveBeenCalledWith(1);
      expect(uzyteBeleMocks.mockProcessUzyteBeleImport).toHaveBeenCalledWith(mockImport, 'add_new', false);
      expect(transactionMocks.mockMarkAsCompleted).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ orderId: 1, created: 5, updated: 0 });
    });

    it('should approve uzyte_bele with overwrite action', async () => {
      const mockImport = { id: 1, fileType: 'uzyte_bele', filepath: '/uploads/test.csv', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);

      const result = await orchestrator.approveImport(1, 'overwrite', true);

      expect(uzyteBeleMocks.mockProcessUzyteBeleImport).toHaveBeenCalledWith(mockImport, 'overwrite', true);
      expect(result.success).toBe(true);
    });

    it('should approve uzyte_bele_prywatne with isPrivateImport option', async () => {
      const mockImport = {
        id: 1,
        fileType: 'uzyte_bele_prywatne',
        filepath: '/uploads/prywatne.csv',
        status: 'pending',
      };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);

      const result = await orchestrator.approveImport(1);

      expect(uzyteBeleMocks.mockProcessUzyteBeleImport).toHaveBeenCalledWith(mockImport, 'add_new', false, {
        isPrivateImport: true,
      });
      expect(result.success).toBe(true);
    });

    it('should approve ceny_pdf import', async () => {
      const mockImport = { id: 1, fileType: 'ceny_pdf', filepath: '/uploads/ceny.pdf', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);

      const result = await orchestrator.approveImport(1);

      expect(cenyMocks.mockProcessPdfApproval).toHaveBeenCalledWith(mockImport);
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ success: true, updated: 5 });
    });

    it('should throw ValidationError for unknown file type', async () => {
      const mockImport = { id: 1, fileType: 'unknown_type', filepath: '/uploads/unknown.xyz', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);

      await expect(orchestrator.approveImport(1)).rejects.toThrow(ValidationError);
      expect(transactionMocks.mockMarkAsError).toHaveBeenCalled();
    });

    it('should mark as error and rethrow on processing failure', async () => {
      const mockImport = { id: 1, fileType: 'uzyte_bele', filepath: '/uploads/test.csv', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);
      uzyteBeleMocks.mockProcessUzyteBeleImport.mockRejectedValue(new Error('Processing failed'));

      await expect(orchestrator.approveImport(1)).rejects.toThrow('Processing failed');
      expect(transactionMocks.mockMarkAsError).toHaveBeenCalledWith(1, 'Processing failed');
    });

    it('should handle non-Error exceptions', async () => {
      const mockImport = { id: 1, fileType: 'uzyte_bele', filepath: '/uploads/test.csv', status: 'pending' };
      validationMocks.mockValidateImportCanBeProcessed.mockResolvedValue(mockImport);
      uzyteBeleMocks.mockProcessUzyteBeleImport.mockRejectedValue('String error');

      await expect(orchestrator.approveImport(1)).rejects.toBe('String error');
      expect(transactionMocks.mockMarkAsError).toHaveBeenCalledWith(1, 'Nieznany blad');
    });
  });

  describe('processUzyteBeleWithResolution', () => {
    it('should delegate to UzyteBeleProcessor', async () => {
      const resolution = { type: 'replace' as const, orderId: 1 };

      const result = await orchestrator.processUzyteBeleWithResolution(1, resolution);

      expect(uzyteBeleMocks.mockProcessUzyteBeleWithResolution).toHaveBeenCalledWith(1, resolution);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // FOLDER OPERATIONS
  // ============================================================

  describe('importFromFolder', () => {
    it('should acquire lock, process, and release lock', async () => {
      await orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1);

      expect(lockMocks.mockAcquireLock).toHaveBeenCalledWith('/imports/2026-01-15', 1);
      expect(uzyteBeleMocks.mockPerformFolderImport).toHaveBeenCalledWith('/imports/2026-01-15', 'I', 1);
      expect(lockMocks.mockReleaseLock).toHaveBeenCalledWith(1);
    });

    it('should release lock even if import fails', async () => {
      uzyteBeleMocks.mockPerformFolderImport.mockRejectedValueOnce(new Error('Import failed'));

      await expect(orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1)).rejects.toThrow('Import failed');

      expect(lockMocks.mockReleaseLock).toHaveBeenCalledWith(1);
    });

    it('should throw ConflictError when folder is locked by another user', async () => {
      lockMocks.mockAcquireLock.mockResolvedValue(null);
      lockMocks.mockCheckLock.mockResolvedValue({ user: { name: 'Jan Kowalski' } });

      await expect(orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError with user name when folder is locked', async () => {
      lockMocks.mockAcquireLock.mockResolvedValue(null);
      lockMocks.mockCheckLock.mockResolvedValue({ user: { name: 'Jan Kowalski' } });

      await expect(orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1)).rejects.toThrow(
        'Folder jest obecnie importowany przez: Jan Kowalski'
      );
    });

    it('should throw ConflictError when lock cannot be acquired', async () => {
      lockMocks.mockAcquireLock.mockResolvedValue(null);
      lockMocks.mockCheckLock.mockResolvedValue(null);

      await expect(orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1)).rejects.toThrow(ConflictError);
    });

    it('should throw generic ConflictError message when no lock info available', async () => {
      lockMocks.mockAcquireLock.mockResolvedValue(null);
      lockMocks.mockCheckLock.mockResolvedValue(null);

      await expect(orchestrator.importFromFolder('/imports/2026-01-15', 'II', 1)).rejects.toThrow(
        'Nie mozna zalokowac folderu do importu'
      );
    });

    it('should validate folder is within base path', async () => {
      await orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1);

      expect(mockFileSystemService.validatePathWithinBase).toHaveBeenCalledWith('/imports/2026-01-15', '/imports');
    });

    it('should validate folder exists and is a directory', async () => {
      await orchestrator.importFromFolder('/imports/2026-01-15', 'I', 1);

      expect(mockFileSystemService.validateDirectory).toHaveBeenCalledWith('/imports/2026-01-15');
    });

    it('should normalize folder path', async () => {
      await orchestrator.importFromFolder('/imports\\2026-01-15', 'III', 1);

      expect(mockFileSystemService.normalizePath).toHaveBeenCalledWith('/imports\\2026-01-15');
    });
  });

  describe('listFolders', () => {
    it('should return list of folders with dates', async () => {
      const mockEntries = [
        { name: '2026-01-15', isDirectory: () => true },
        { name: '2026-01-14', isDirectory: () => true },
        { name: 'readme.txt', isDirectory: () => false },
      ];
      (mockFileSystemService.readDirectory as Mock).mockResolvedValue(mockEntries);
      (mockFileSystemService.extractDateFromFolderName as Mock).mockImplementation((name: string) => {
        if (name.match(/\d{4}-\d{2}-\d{2}/)) return new Date(name);
        return null;
      });

      const result = await orchestrator.listFolders();

      expect(result.folders).toHaveLength(2);
      expect(result.basePath).toBe('/imports');
      expect(result.folders[0].name).toBe('2026-01-15');
      expect(result.folders[0].hasDate).toBe(true);
    });

    it('should return error when base path does not exist', async () => {
      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const result = await orchestrator.listFolders();

      expect(result.error).toBe('Folder bazowy nie istnieje');
      expect(result.folders).toEqual([]);
    });

    it('should return error details when base path does not exist', async () => {
      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const result = await orchestrator.listFolders();

      expect(result.details).toContain('Skonfiguruj IMPORTS_BASE_PATH');
      expect(result.basePath).toBe('/imports');
    });

    it('should handle read directory error', async () => {
      (mockFileSystemService.readDirectory as Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await orchestrator.listFolders();

      expect(result.error).toBe('Blad odczytu folderow');
      expect(result.details).toBe('Permission denied');
    });

    it('should filter out folders without dates', async () => {
      const mockEntries = [
        { name: 'random_folder', isDirectory: () => true },
        { name: 'no_date_here', isDirectory: () => true },
      ];
      (mockFileSystemService.readDirectory as Mock).mockResolvedValue(mockEntries);
      (mockFileSystemService.extractDateFromFolderName as Mock).mockReturnValue(null);

      const result = await orchestrator.listFolders();

      expect(result.folders).toHaveLength(0);
    });

    it('should sort folders by date descending', async () => {
      const mockEntries = [
        { name: '2026-01-10', isDirectory: () => true },
        { name: '2026-01-20', isDirectory: () => true },
        { name: '2026-01-15', isDirectory: () => true },
      ];
      (mockFileSystemService.readDirectory as Mock).mockResolvedValue(mockEntries);
      (mockFileSystemService.extractDateFromFolderName as Mock).mockImplementation((name: string) => new Date(name));

      const result = await orchestrator.listFolders();

      expect(result.folders[0].name).toBe('2026-01-20');
      expect(result.folders[1].name).toBe('2026-01-15');
      expect(result.folders[2].name).toBe('2026-01-10');
    });

    it('should pass userId to getImportsBasePath', async () => {
      await orchestrator.listFolders(42);

      expect(settingsMocks.mockGetImportsBasePath).toHaveBeenCalledWith(42);
    });
  });

  describe('scanFolder', () => {
    it('should delegate to UzyteBeleProcessor', async () => {
      const result = await orchestrator.scanFolder('/imports/2026-01-15');

      expect(uzyteBeleMocks.mockScanFolder).toHaveBeenCalledWith('/imports/2026-01-15', undefined);
      expect(result.csvFiles).toEqual(['file1.csv', 'file2.csv']);
    });

    it('should pass userId to scanFolder', async () => {
      await orchestrator.scanFolder('/imports/2026-01-15', 42);

      expect(uzyteBeleMocks.mockScanFolder).toHaveBeenCalledWith('/imports/2026-01-15', 42);
    });
  });

  describe('archiveFolder', () => {
    it('should validate and archive folder', async () => {
      const result = await orchestrator.archiveFolder('/imports/2026-01-15');

      expect(mockFileSystemService.validatePathWithinBase).toHaveBeenCalled();
      expect(mockFileSystemService.validateDirectory).toHaveBeenCalled();
      expect(mockFileSystemService.moveFolderToArchive).toHaveBeenCalledWith('/imports/2026-01-15');
      expect(result).toBe('/archive/folder');
    });

    it('should pass userId to getImportsBasePath', async () => {
      await orchestrator.archiveFolder('/imports/2026-01-15', 42);

      expect(settingsMocks.mockGetImportsBasePath).toHaveBeenCalledWith(42);
    });

    it('should normalize folder path before archiving', async () => {
      await orchestrator.archiveFolder('/imports\\2026-01-15');

      expect(mockFileSystemService.normalizePath).toHaveBeenCalledWith('/imports\\2026-01-15');
    });
  });

  describe('deleteFolder', () => {
    it('should validate and delete folder', async () => {
      await orchestrator.deleteFolder('/imports/2026-01-15');

      expect(mockFileSystemService.validatePathWithinBase).toHaveBeenCalled();
      expect(mockFileSystemService.validateDirectory).toHaveBeenCalled();
      expect(mockFileSystemService.deleteDirectory).toHaveBeenCalledWith('/imports/2026-01-15');
    });

    it('should pass userId to getImportsBasePath', async () => {
      await orchestrator.deleteFolder('/imports/2026-01-15', 42);

      expect(settingsMocks.mockGetImportsBasePath).toHaveBeenCalledWith(42);
    });

    it('should normalize folder path before deleting', async () => {
      await orchestrator.deleteFolder('/imports\\2026-01-15');

      expect(mockFileSystemService.normalizePath).toHaveBeenCalledWith('/imports\\2026-01-15');
    });
  });

  // ============================================================
  // PROCESS IMPORT
  // ============================================================

  describe('processImport', () => {
    it('should throw NotFoundError when file does not exist', async () => {
      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      await expect(orchestrator.processImport('/non/existent/file.csv')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError on variant conflict without resolution', async () => {
      conflictMocks.mockDetectConflicts.mockResolvedValue({
        hasConflict: true,
        conflict: { type: 'variant_mismatch', details: 'Different variant' },
      });

      await expect(orchestrator.processImport('/path/to/file.csv')).rejects.toThrow(ValidationError);
    });

    it('should return cancelled result when resolution type is cancel', async () => {
      const result = await orchestrator.processImport('/path/to/file.csv', undefined, { type: 'cancel' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Import cancelled by user');
    });

    it('should set action=overwrite and replaceBase=true for replace resolution', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      conflictMocks.mockDetectConflicts.mockResolvedValue({ hasConflict: true, conflict: {} });

      await orchestrator.processImport('/path/to/file.csv', undefined, { type: 'replace', orderId: 1 });

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should mark as completed on success', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });

      const result = await orchestrator.processImport('/path/to/file.csv');

      expect(transactionMocks.mockMarkAsCompleted).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.importId).toBe(1);
    });

    it('should mark as error on failure', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      csvParserMocks.mockProcessUzyteBele.mockRejectedValueOnce(new Error('Parse error'));

      await expect(orchestrator.processImport('/path/to/file.csv')).rejects.toThrow('Parse error');
      expect(transactionMocks.mockMarkAsError).toHaveBeenCalledWith(1, 'Parse error');
    });

    it('should add order to delivery when deliveryNumber is provided', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      mockRepository.findDeliveryByDateAndNumber.mockResolvedValue({ id: 10 });
      mockRepository.findExistingDeliveryOrder.mockResolvedValue(null);

      await orchestrator.processImport('/path/to/folder/file.csv', 'II');

      expect(mockRepository.findDeliveryByDateAndNumber).toHaveBeenCalled();
      expect(mockRepository.addOrderToDelivery).toHaveBeenCalledWith(10, 1, 1);
    });

    it('should create delivery if not exists when deliveryNumber is provided', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      mockRepository.findDeliveryByDateAndNumber.mockResolvedValue(null);
      mockRepository.createDelivery.mockResolvedValue({ id: 20 });
      mockRepository.findExistingDeliveryOrder.mockResolvedValue(null);

      await orchestrator.processImport('/path/to/folder/file.csv', 'I');

      expect(mockRepository.createDelivery).toHaveBeenCalled();
      expect(mockRepository.addOrderToDelivery).toHaveBeenCalledWith(20, 1, 1);
    });

    it('should not duplicate order in delivery if already exists', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      mockRepository.findDeliveryByDateAndNumber.mockResolvedValue({ id: 10 });
      mockRepository.findExistingDeliveryOrder.mockResolvedValue({ id: 100 });

      await orchestrator.processImport('/path/to/folder/file.csv', 'I');

      expect(mockRepository.addOrderToDelivery).not.toHaveBeenCalled();
    });

    it('should execute resolution when provided', async () => {
      mockRepository.create.mockResolvedValue({ id: 1, filename: 'test.csv', status: 'processing' });
      const resolution = { type: 'keep' as const, orderId: 5 };

      await orchestrator.processImport('/path/to/file.csv', undefined, resolution);

      expect(conflictMocks.mockExecuteResolution).toHaveBeenCalledWith(resolution, '12345', expect.any(Object));
    });
  });

  // ============================================================
  // DELETE IMPORT WITH CASCADE
  // ============================================================

  describe('deleteImport with cascade', () => {
    it('should delete associated order when import is completed with orderId', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'completed',
        metadata: JSON.stringify({ orderId: 42 }),
      };
      mockRepository.findById.mockResolvedValue(mockImport);
      mockRepository.findOrderById.mockResolvedValue({ id: 42 });

      await orchestrator.deleteImport(1);

      expect(mockRepository.findOrderById).toHaveBeenCalledWith(42);
      expect(mockRepository.deleteOrder).toHaveBeenCalledWith(42);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should not delete order when import has no metadata', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'completed', metadata: null };
      mockRepository.findById.mockResolvedValue(mockImport);

      await orchestrator.deleteImport(1);

      expect(mockRepository.findOrderById).not.toHaveBeenCalled();
      expect(mockRepository.deleteOrder).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should not delete order when import status is not completed', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'pending',
        metadata: JSON.stringify({ orderId: 42 }),
      };
      mockRepository.findById.mockResolvedValue(mockImport);

      await orchestrator.deleteImport(1);

      expect(mockRepository.deleteOrder).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should not fail when order does not exist', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'completed',
        metadata: JSON.stringify({ orderId: 999 }),
      };
      mockRepository.findById.mockResolvedValue(mockImport);
      mockRepository.findOrderById.mockResolvedValue(null);

      await orchestrator.deleteImport(1);

      expect(mockRepository.deleteOrder).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle invalid JSON metadata gracefully', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'completed',
        metadata: 'invalid-json',
      };
      mockRepository.findById.mockResolvedValue(mockImport);

      await orchestrator.deleteImport(1);

      // Should not throw, just log error and continue
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle metadata without orderId', async () => {
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        status: 'completed',
        metadata: JSON.stringify({ someOtherField: 'value' }),
      };
      mockRepository.findById.mockResolvedValue(mockImport);

      await orchestrator.deleteImport(1);

      expect(mockRepository.findOrderById).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================
  // SETTINGS
  // ============================================================

  describe('getImportsBasePath', () => {
    it('should return imports base path', async () => {
      const result = await orchestrator.getImportsBasePath();

      expect(result).toBe('/imports');
    });

    it('should pass userId to settings service', async () => {
      await orchestrator.getImportsBasePath(42);

      expect(settingsMocks.mockGetImportsBasePath).toHaveBeenCalledWith(42);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle concurrent upload attempts', async () => {
      const mockCreatedImport = { id: 1, filename: 'test.csv', fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      // Simulate concurrent uploads
      const uploads = await Promise.all([
        orchestrator.uploadFile('test1.csv', Buffer.from('data1'), 'text/csv'),
        orchestrator.uploadFile('test2.csv', Buffer.from('data2'), 'text/csv'),
        orchestrator.uploadFile('test3.csv', Buffer.from('data3'), 'text/csv'),
      ]);

      expect(uploads).toHaveLength(3);
      expect(mockRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should handle very long filenames', async () => {
      const longFilename = 'a'.repeat(500) + '.csv';
      const mockCreatedImport = { id: 1, filename: longFilename, fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      const result = await orchestrator.uploadFile(longFilename, Buffer.from('data'), 'text/csv');

      expect(result.fileImport).toBeDefined();
      // sanitizeFilename is passed as callback to generateSafeFilename
      expect(mockFileSystemService.generateSafeFilename).toHaveBeenCalled();
    });

    it('should handle unicode filenames', async () => {
      const unicodeFilename = 'zlecenie_\u0142odz_\u017c\u00f3\u0142ty.csv';
      const mockCreatedImport = { id: 1, filename: unicodeFilename, fileType: 'uzyte_bele', status: 'pending' };
      mockRepository.create.mockResolvedValue(mockCreatedImport);

      const result = await orchestrator.uploadFile(unicodeFilename, Buffer.from('data'), 'text/csv');

      expect(result.fileImport).toBeDefined();
    });

    it('should handle empty folder list', async () => {
      (mockFileSystemService.readDirectory as Mock).mockResolvedValue([]);

      const result = await orchestrator.listFolders();

      expect(result.folders).toEqual([]);
    });

    it('should handle folder with only files (no subdirectories)', async () => {
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'file2.csv', isDirectory: () => false },
      ];
      (mockFileSystemService.readDirectory as Mock).mockResolvedValue(mockEntries);

      const result = await orchestrator.listFolders();

      expect(result.folders).toEqual([]);
    });

    it('should handle validation error in upload', async () => {
      validationMocks.mockValidateUploadedFile.mockImplementationOnce(() => {
        throw new ValidationError('File too large', { maxSize: ['10MB'] });
      });

      await expect(orchestrator.uploadFile('large.csv', Buffer.alloc(100 * 1024 * 1024), 'text/csv')).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle file system error during upload', async () => {
      (mockFileSystemService.writeFile as Mock).mockRejectedValueOnce(new Error('Disk full'));

      await expect(orchestrator.uploadFile('test.csv', Buffer.from('data'), 'text/csv')).rejects.toThrow('Disk full');
    });
  });
});
