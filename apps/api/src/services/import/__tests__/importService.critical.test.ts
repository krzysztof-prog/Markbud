/**
 * Import Service - Critical Path Tests
 *
 * Tests for critical import flow operations:
 * 1. Upload + Parse Happy Path (Integration)
 * 2. Validation Errors Collection (Unit)
 * 3. Variant Conflict Detection (Integration)
 * 4. Transaction Rollback on Error (Integration)
 * 5. Lock Acquisition + Release (Integration)
 * 6. Order Already in Delivery Validation (Unit)
 * 7. Folder Date Extraction + CSV Discovery (Unit)
 *
 * @see C:\Users\Krzysztof\.claude\plans\calm-meandering-sutton.md - Section 1.1
 */

import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from 'vitest';

// ============================================================
// CRITICAL MOCKS - Must be hoisted before any imports
// ============================================================

// Import real Prisma client BEFORE mocking to use in the mock
import { prisma as realPrisma } from '../../../utils/prisma.js';

// Mock the index.js to prevent loading full Fastify server
// But use real PrismaClient so CsvParser can access database
vi.mock('../../../index.js', () => ({
  prisma: realPrisma, // Use real Prisma client, not null
}));

// Mock event emitter
vi.mock('../../event-emitter.js', () => ({
  emitDeliveryCreated: vi.fn(),
  emitOrderUpdated: vi.fn(),
  emitWarehouseStockUpdated: vi.fn()
}));

// ============================================================
// IMPORTS - After mocks are set up
// ============================================================

import { ImportValidationService } from '../importValidationService.js';
import { ImportConflictService } from '../importConflictService.js';
import { ImportLockService } from '../../importLockService.js';
import { ImportFileSystemService } from '../importFileSystemService.js';
import { ImportTransactionService } from '../importTransactionService.js';
import { ImportRepository } from '../../../repositories/ImportRepository.js';
import { createMockPrisma, setupTransactionMock } from '../../../tests/mocks/prisma.mock.js';
import { resetTestDatabase, seedMinimalData, cleanupTestDatabase } from '../../../tests/utils/test-db.js';
import { OrderBuilder } from '../../../tests/fixtures/orders.fixture.js';
import { ConflictError } from '../../../utils/errors.js';
import fs from 'fs/promises';
import path from 'path';

// ============================================================
// TEST SETUP
// ============================================================

// Use the real Prisma client imported earlier (same as mocked in index.js)
const prisma = realPrisma;

describe('ImportService - Critical Paths', () => {
  let validationService: ImportValidationService;
  let conflictService: ImportConflictService;
  let _lockService: ImportLockService;
  let _fileSystemService: ImportFileSystemService;
  let transactionService: ImportTransactionService;
  let repository: ImportRepository;

  // Integration tests - use real database
  beforeEach(async () => {
    await resetTestDatabase();
    await seedMinimalData();
    repository = new ImportRepository(prisma);
    validationService = new ImportValidationService(prisma, repository);
    transactionService = new ImportTransactionService(prisma, repository);
    conflictService = new ImportConflictService(prisma, repository, transactionService);
    _lockService = new ImportLockService(prisma);
    _fileSystemService = new ImportFileSystemService();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    // Cleanup: Remove test uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.startsWith('TEST-') || file.includes('test')) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // TEST 1: Upload + Parse Happy Path (Integration)
  // ============================================================

  describe('Upload + Parse Happy Path', () => {
    it('should successfully parse valid CSV file', async () => {
      // Arrange: Create valid CSV content with existing profile and color from DB
      // Profile: 9016 + Color: 000 (Biały) = article 19016000
      // Profile: 8866 + Color: 000 (Biały) = article 18866000
      // Both profiles and color "000" exist in production DB
      const csvContent = `AKROBUD;zlecenie 53335;klient;projekt;system;termin;data dostawy PVC
numZlec;numArt;nowychBel;reszta
53335;19016000;2;500
53335;18866000;1;300

lista okien
lp;szer;wys;typProfilu;ilosc;referencja
1;1200;1500;OS;2;REF-001

zestawienie;okna;skrzydla;szyby
total;1;2;3`;

      // Create temp file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const testFilePath = path.join(uploadsDir, 'TEST-53335_uzyte_bele.csv');
      await fs.writeFile(testFilePath, csvContent, 'utf-8');

      try {
        // Act: Parse CSV with error reporting
        const parseResult = await validationService.parseAndValidateCsvWithErrors(testFilePath);

        // Assert: Parse result summary
        expect(parseResult.summary.totalRows).toBeGreaterThan(0);
        expect(parseResult.summary.successRows).toBe(parseResult.summary.totalRows);
        expect(parseResult.summary.failedRows).toBe(0);

        // Assert: Data structure
        expect(parseResult.data.orderNumber).toBe('53335');
        expect(parseResult.data.requirements.length).toBeGreaterThan(0);
        expect(parseResult.data.windows.length).toBeGreaterThan(0);

        // Assert: Errors array exists (even if empty for valid data)
        expect(parseResult.errors).toBeDefined();
        expect(Array.isArray(parseResult.errors)).toBe(true);
      } finally {
        // Cleanup
        await fs.unlink(testFilePath);
      }
    });
  });

  // ============================================================
  // TEST 2: Validation Errors Collection (Unit)
  // ============================================================

  describe('Validation Errors Collection', () => {
    it('should collect validation errors for invalid CSV data', async () => {
      // Note: This test uses REAL database since parser needs to check profiles/colors
      // We create CSV with non-existent profiles to trigger validation errors

      // Mock CSV with non-existent profiles and colors to trigger validation errors
      // Article 19999000: profile "9999" doesn't exist (not in fixtures)
      // Article 19016999: profile "9016" exists but color "999" doesn't exist
      const csvContent = `AKROBUD;zlecenie 53336;klient;projekt;system;termin;data dostawy PVC
numZlec;numArt;nowychBel;reszta
53336;19999000;2;500
53336;19016999;1;300

lp;szer;wys;typProfilu;ilosc;referencja
1;1200;1500;OS;1;REF-001

zestawienie;okna;skrzydla;szyby
total;1;1;1`;

      // Create temp file for testing
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const testFilePath = path.join(uploadsDir, 'TEST-validation-errors.csv');
      await fs.writeFile(testFilePath, csvContent, 'utf-8');

      try {
        // Act: Parse with error reporting
        const result = await validationService.parseAndValidateCsvWithErrors(testFilePath);

        // Assert: Errors collected
        expect(result.errors).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.summary.totalRows).toBeGreaterThan(0);
        expect(result.summary.failedRows).toBeGreaterThan(0);

        // Each error should have row, field, and reason
        if (result.errors.length > 0) {
          const firstError = result.errors[0];
          expect(firstError).toHaveProperty('row');
          expect(firstError).toHaveProperty('reason');
          expect(typeof firstError.row).toBe('number');
          expect(typeof firstError.reason).toBe('string');
        }
      } finally {
        // Cleanup
        await fs.unlink(testFilePath);
      }
    });
  });

  // ============================================================
  // TEST 3: Variant Conflict Detection (Integration)
  // ============================================================

  describe('Variant Conflict Detection', () => {
    it('should detect variant conflict when base order exists', async () => {
      // Arrange: Create base order 53337 in database
      const baseOrder = await new OrderBuilder()
        .withOrderNumber('53337')
        .withStatus('new')
        .create(prisma);

      // Create CSV for variant 53337-a with valid profile/color from DB
      // Using profile "9016" + color "000" → 19016000
      const csvContent = `AKROBUD;zlecenie 53337-a;klient;projekt;system;termin;data dostawy PVC
numZlec;numArt;nowychBel;reszta
53337-a;19016000;2;500

lista okien
lp;szer;wys;typProfilu;ilosc;referencja
1;1200;1500;OS;1;REF-001

zestawienie;okna;skrzydla;szyby
total;1;1;1`;

      // Create temp file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const testFilePath = path.join(uploadsDir, 'TEST-53337-a_uzyte_bele.csv');
      await fs.writeFile(testFilePath, csvContent, 'utf-8');

      try {
        // Act: Parse CSV
        const parseResult = await validationService.parseAndValidateCsvWithErrors(testFilePath);

        // Act: Detect conflicts
        const conflictResult = await conflictService.detectConflicts(
          parseResult.data.orderNumber,
          parseResult.data
        );

        // Assert: Conflict detected
        expect(conflictResult.hasConflict).toBe(true);
        expect(conflictResult.conflict).toBeDefined();
        // VariantConflict uses 'type' field to indicate conflict type
        // 'base_exists' means the base order (53337) exists when importing variant (53337-a)
        expect(conflictResult.conflict?.type).toBe('base_exists');
        // existingOrders contains the base order that was found
        expect(conflictResult.conflict?.existingOrders).toBeDefined();
        expect(conflictResult.conflict?.existingOrders.length).toBeGreaterThan(0);
        // Check that base order 53337 is in the existing orders
        const foundBaseOrder = conflictResult.conflict?.existingOrders.find(
          o => o.orderNumber === '53337'
        );
        expect(foundBaseOrder).toBeDefined();
      } finally {
        // Cleanup
        await fs.unlink(testFilePath);
      }
    });
  });

  // ============================================================
  // TEST 4: Transaction Rollback on Error (Integration)
  // ============================================================

  describe('Transaction Rollback on Error', () => {
    it('should handle transaction errors gracefully', async () => {
      // Arrange: Create import record in database
      const fileImport = await repository.create({
        filename: 'TEST-53338_uzyte_bele.csv',
        filepath: '/test/path.csv',
        fileType: 'uzyte_bele',
        status: 'pending',
      });

      // Act: Try to mark as processing with invalid ID (should fail)
      let error: Error | undefined;
      try {
        await transactionService.markAsProcessing(9999999); // Non-existent ID
      } catch (err) {
        error = err as Error;
      }

      // Assert: Error thrown
      expect(error).toBeDefined();

      // Assert: Original import status unchanged
      const unchanged = await repository.findById(fileImport.id);
      expect(unchanged?.status).toBe('pending');
    });

    it('should maintain data integrity when constraint violated', async () => {
      // Arrange: Create an order
      const existingOrder = await new OrderBuilder()
        .withOrderNumber('53338')
        .withStatus('new')
        .create(prisma);

      // Act: Try to create duplicate order (should fail due to unique constraint)
      let error: Error | undefined;
      try {
        await prisma.order.create({
          data: {
            orderNumber: '53338', // Duplicate
            status: 'new'
          }
        });
      } catch (err) {
        error = err as Error;
      }

      // Assert: Error thrown (unique constraint)
      expect(error).toBeDefined();

      // Assert: Only one order exists
      const orders = await prisma.order.findMany({
        where: { orderNumber: '53338' }
      });
      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe(existingOrder.id);
    });
  });

  // ============================================================
  // TEST 5: Lock Acquisition + Release (Integration)
  // ============================================================

  describe('Lock Acquisition + Release', () => {
    it('should prevent concurrent imports for same folder', async () => {
      // Arrange: Create test users (userId 1 is system user from seedMinimalData)
      const user2 = await prisma.user.create({
        data: {
          id: 2,
          email: 'user2@akrobud.local',
          passwordHash: '$2a$10$dummy.hash.for.test.user',
          name: 'Test User 2',
          role: 'user',
        },
      });

      const lockService = new ImportLockService(prisma);
      const folderPath = 'C:\\Test\\Dostawa 15.01.2026';
      const userId1 = 1;
      const userId2 = user2.id;

      // Act: First user acquires lock
      const lock1 = await lockService.acquireLock(folderPath, userId1);

      // Assert: Lock acquired
      expect(lock1).not.toBeNull();
      expect(lock1?.folderPath).toBe(folderPath);
      expect(lock1?.userId).toBe(userId1);

      // Act: Second user tries to acquire same lock
      let error: Error | undefined;
      try {
        await lockService.acquireLock(folderPath, userId2);
      } catch (err) {
        error = err as Error;
      }

      // Assert: Second call throws ConflictError
      expect(error).toBeInstanceOf(ConflictError);
      expect(error?.message).toContain('obecnie importowany');

      // Act: Release lock
      await lockService.releaseLock(folderPath);

      // Assert: Lock can now be acquired by second user
      const lock2 = await lockService.acquireLock(folderPath, userId2);
      expect(lock2).not.toBeNull();
      expect(lock2?.userId).toBe(userId2);
    });

    it('should expire lock after timeout', async () => {
      // Arrange: Create lock service with mock expiration
      const lockService = new ImportLockService(prisma);
      const folderPath = 'C:\\Test\\Dostawa 16.01.2026';
      const userId = 1;

      // Create expired lock manually
      const expiredAt = new Date(Date.now() - 1000); // Expired 1 second ago
      await prisma.importLock.create({
        data: {
          folderPath,
          userId,
          expiresAt: expiredAt,
          processId: 'test-process'
        }
      });

      // Act: Try to acquire lock (should succeed because expired)
      const lock = await lockService.acquireLock(folderPath, userId);

      // Assert: Lock acquired (old one was deleted)
      expect(lock).not.toBeNull();
      expect(lock?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ============================================================
  // TEST 6: Order Already in Delivery Validation (Unit)
  // ============================================================

  describe('Order Already in Delivery Validation', () => {
    it('should validate order cannot be imported to delivery when already assigned', async () => {
      // Arrange: Create mock Prisma
      const mockPrisma = createMockPrisma();
      setupTransactionMock(mockPrisma);
      const mockRepository = new ImportRepository(mockPrisma);
      const validationService = new ImportValidationService(mockPrisma, mockRepository);

      // Mock order assigned to delivery
      const orderNumber = '53339';
      const deliveryId = 1;
      const deliveryNumber = 'D001';

      mockRepository.findOrderByOrderNumber = vi.fn().mockResolvedValue({
        id: 1,
        orderNumber,
        deliveryOrders: [
          {
            delivery: {
              id: deliveryId,
              deliveryNumber,
              deliveryDate: new Date('2026-01-15')
            }
          }
        ]
      });

      // Act: Check delivery assignment
      const result = await validationService.checkOrderDeliveryAssignment(orderNumber);

      // Assert: Order is assigned
      expect(result.isAssigned).toBe(true);
      expect(result.deliveryId).toBe(deliveryId);
      expect(result.deliveryNumber).toBe(deliveryNumber);
    });

    it('should allow import when order not assigned to any delivery', async () => {
      // Arrange: Create mock Prisma
      const mockPrisma = createMockPrisma();
      setupTransactionMock(mockPrisma);
      const mockRepository = new ImportRepository(mockPrisma);
      const validationService = new ImportValidationService(mockPrisma, mockRepository);

      // Mock order NOT assigned to delivery
      const orderNumber = '53340';
      mockRepository.findOrderByOrderNumber = vi.fn().mockResolvedValue({
        id: 1,
        orderNumber,
        deliveryOrders: [] // No deliveries
      });

      // Act: Check delivery assignment
      const result = await validationService.checkOrderDeliveryAssignment(orderNumber);

      // Assert: Order not assigned
      expect(result.isAssigned).toBe(false);
    });
  });

  // ============================================================
  // TEST 7: Folder Date Extraction + CSV Discovery (Unit)
  // ============================================================

  describe('Folder Date Extraction + CSV Discovery', () => {
    it('should extract delivery date from folder name', async () => {
      // Arrange: Create file system service
      const fileSystemService = new ImportFileSystemService();

      // Test various folder name formats
      const testCases = [
        { folder: 'Dostawa 15.01.2026', expected: new Date(2026, 0, 15) },
        { folder: 'Dostawa 15.1.2026', expected: new Date(2026, 0, 15) },
        { folder: 'dostawa 05.12.2025', expected: new Date(2025, 11, 5) },
        { folder: 'DOSTAWA 31.12.2025', expected: new Date(2025, 11, 31) },
      ];

      for (const testCase of testCases) {
        // Act: Extract date from folder name
        const date = fileSystemService.extractDeliveryDateFromFolder(testCase.folder);

        // Assert: Date extracted correctly
        expect(date).toEqual(testCase.expected);
      }
    });

    it('should scan for CSV files in folder', async () => {
      // Arrange: Create temp folder with CSV files
      const tempFolder = path.join(process.cwd(), 'uploads', 'TEST-Dostawa-Scan');
      await fs.mkdir(tempFolder, { recursive: true });

      // Create test CSV files
      const csvFiles = [
        'TEST-53341_uzyte_bele.csv',
        'TEST-53342_uzyte_bele.csv',
        'TEST-53343_uzyte_bele.csv',
      ];

      for (const csvFile of csvFiles) {
        await fs.writeFile(
          path.join(tempFolder, csvFile),
          'test content',
          'utf-8'
        );
      }

      // Also create non-CSV file (should be ignored)
      await fs.writeFile(
        path.join(tempFolder, 'readme.txt'),
        'not a csv',
        'utf-8'
      );

      try {
        // Act: Scan for CSV files
        const fileSystemService = new ImportFileSystemService();
        const foundFiles = await fileSystemService.scanForCsvFiles(tempFolder);

        // Assert: Found 3 CSV files (not the txt file)
        expect(foundFiles).toHaveLength(3);
        expect(foundFiles.every(f => f.filename.endsWith('.csv'))).toBe(true);
        expect(foundFiles.every(f => f.filepath.includes(tempFolder))).toBe(true);
      } finally {
        // Cleanup: Remove temp folder
        await fs.rm(tempFolder, { recursive: true, force: true });
      }
    });

    it('should return empty array when no CSV files found', async () => {
      // Arrange: Create temp folder with no CSV files
      const tempFolder = path.join(process.cwd(), 'uploads', 'TEST-Empty-Folder');
      await fs.mkdir(tempFolder, { recursive: true });

      try {
        // Act: Scan for CSV files
        const fileSystemService = new ImportFileSystemService();
        const foundFiles = await fileSystemService.scanForCsvFiles(tempFolder);

        // Assert: No files found
        expect(foundFiles).toHaveLength(0);
      } finally {
        // Cleanup
        await fs.rm(tempFolder, { recursive: true, force: true });
      }
    });
  });
});
