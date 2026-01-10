/**
 * File Validation Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateMimeType,
  validateFileExtension,
  validateFilename,
  validateFileSize,
  sanitizeFilename,
  validateUploadedFile,
  MAX_FILE_SIZE,
} from './file-validation.js';
import { ValidationError } from './errors.js';
import { logger } from './logger.js';

// Mock logger
vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('File Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMimeType', () => {
    it('should accept valid CSV MIME type', () => {
      expect(() => validateMimeType('text/csv')).not.toThrow();
    });

    it('should accept valid PDF MIME type', () => {
      expect(() => validateMimeType('application/pdf')).not.toThrow();
    });

    it('should accept valid Excel MIME types', () => {
      expect(() => validateMimeType('application/vnd.ms-excel')).not.toThrow();
      expect(() =>
        validateMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ).not.toThrow();
    });

    it('should accept text/plain for TXT files', () => {
      expect(() => validateMimeType('text/plain')).not.toThrow();
    });

    it('should accept application/octet-stream as fallback', () => {
      expect(() => validateMimeType('application/octet-stream')).not.toThrow();
    });

    it('should reject executable MIME types', () => {
      expect(() => validateMimeType('application/x-msdownload')).toThrow(ValidationError);
      expect(() => validateMimeType('application/x-executable')).toThrow(ValidationError);
    });

    it('should reject script MIME types', () => {
      expect(() => validateMimeType('application/javascript')).toThrow(ValidationError);
      expect(() => validateMimeType('text/javascript')).toThrow(ValidationError);
      expect(() => validateMimeType('application/x-sh')).toThrow(ValidationError);
    });

    it('should reject undefined MIME type', () => {
      expect(() => validateMimeType(undefined)).toThrow(ValidationError);
      expect(logger.warn).toHaveBeenCalledWith('File upload attempt with no MIME type');
    });

    it('should log warning for invalid MIME type', () => {
      try {
        validateMimeType('application/x-executable');
      } catch {
        // Expected error
      }
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('File upload rejected - invalid MIME type')
      );
    });
  });

  describe('validateFileExtension', () => {
    it('should accept valid CSV extension', () => {
      expect(() => validateFileExtension('data.csv')).not.toThrow();
      expect(() => validateFileExtension('DATA.CSV')).not.toThrow();
    });

    it('should accept valid PDF extension', () => {
      expect(() => validateFileExtension('document.pdf')).not.toThrow();
    });

    it('should accept valid Excel extensions', () => {
      expect(() => validateFileExtension('spreadsheet.xls')).not.toThrow();
      expect(() => validateFileExtension('spreadsheet.xlsx')).not.toThrow();
    });

    it('should accept valid TXT extension', () => {
      expect(() => validateFileExtension('notes.txt')).not.toThrow();
    });

    it('should reject executable extensions', () => {
      expect(() => validateFileExtension('malware.exe')).toThrow(ValidationError);
      expect(() => validateFileExtension('script.sh')).toThrow(ValidationError);
      expect(() => validateFileExtension('batch.bat')).toThrow(ValidationError);
    });

    it('should reject files without extension', () => {
      expect(() => validateFileExtension('noextension')).toThrow(ValidationError);
    });

    it('should be case-insensitive', () => {
      expect(() => validateFileExtension('FILE.CSV')).not.toThrow();
      expect(() => validateFileExtension('FILE.Csv')).not.toThrow();
    });

    it('should log warning for invalid extension', () => {
      try {
        validateFileExtension('malware.exe');
      } catch {
        // Expected error
      }
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('File upload rejected - invalid extension')
      );
    });
  });

  describe('validateFilename', () => {
    it('should accept valid filenames', () => {
      expect(() => validateFilename('document.csv')).not.toThrow();
      expect(() => validateFilename('my-file_123.pdf')).not.toThrow();
      expect(() => validateFilename('Dane użyte 2024.csv')).not.toThrow();
    });

    it('should reject path traversal with ..', () => {
      expect(() => validateFilename('../../../etc/passwd')).toThrow(ValidationError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Path traversal attack detected')
      );
    });

    it('should reject absolute paths', () => {
      expect(() => validateFilename('/etc/passwd')).toThrow(ValidationError);
      expect(() => validateFilename('C:\\Windows\\System32\\config')).toThrow(ValidationError);
    });

    it('should reject relative paths', () => {
      expect(() => validateFilename('subdir/file.csv')).toThrow(ValidationError);
      expect(() => validateFilename('subdir\\file.csv')).toThrow(ValidationError);
    });

    it('should reject null byte injection', () => {
      expect(() => validateFilename('file.csv\0.exe')).toThrow(ValidationError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Null byte injection detected')
      );
    });

    it('should reject empty filenames', () => {
      expect(() => validateFilename('')).toThrow(ValidationError);
      expect(() => validateFilename('   ')).toThrow(ValidationError);
    });

    it('should reject excessively long filenames', () => {
      const longFilename = 'a'.repeat(256) + '.csv';
      expect(() => validateFilename(longFilename)).toThrow(ValidationError);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('File upload rejected - filename too long')
      );
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => validateFileSize(1024)).not.toThrow(); // 1KB
      expect(() => validateFileSize(1024 * 1024)).not.toThrow(); // 1MB
      expect(() => validateFileSize(5 * 1024 * 1024)).not.toThrow(); // 5MB
    });

    it('should accept file at max size limit', () => {
      expect(() => validateFileSize(MAX_FILE_SIZE)).not.toThrow();
    });

    it('should reject zero size files', () => {
      expect(() => validateFileSize(0)).toThrow(ValidationError);
    });

    it('should reject negative size files', () => {
      expect(() => validateFileSize(-1)).toThrow(ValidationError);
    });

    it('should reject files over size limit', () => {
      const oversized = MAX_FILE_SIZE + 1;
      expect(() => validateFileSize(oversized)).toThrow(ValidationError);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('File upload rejected - size too large')
      );
    });

    it('should provide helpful error message with file sizes', () => {
      try {
        validateFileSize(15 * 1024 * 1024); // 15MB
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.errors?.size?.[0]).toContain('15.00MB');
      }
    });
  });

  describe('sanitizeFilename', () => {
    it('should keep valid alphanumeric filenames unchanged', () => {
      expect(sanitizeFilename('file123.csv')).toBe('file123.csv');
      expect(sanitizeFilename('my-file_v2.pdf')).toBe('my-file_v2.pdf');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('my file@#$.csv')).toBe('my_file___.csv');
      expect(sanitizeFilename('file (copy).pdf')).toBe('file__copy_.pdf');
    });

    it('should handle Polish characters', () => {
      expect(sanitizeFilename('Dane użyte.csv')).toBe('Dane_u_yte.csv');
    });

    it('should remove path components', () => {
      expect(sanitizeFilename('../../../file.csv')).toBe('file.csv');
      expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
    });

    it('should prevent hidden files (starting with dot)', () => {
      expect(sanitizeFilename('.hidden')).toBe('_.hidden');
      expect(sanitizeFilename('.gitignore')).toBe('_.gitignore');
    });

    it('should handle complex real-world filenames', () => {
      const input = 'Schüco Connect - Zamówienia - 16.12.2025.csv';
      const output = sanitizeFilename(input);
      expect(output).toBe('Sch_co_Connect_-_Zam_wienia_-_16.12.2025.csv');
    });
  });

  describe('validateUploadedFile', () => {
    const validFilename = 'test.csv';
    const validMimeType = 'text/csv';
    const validSize = 1024 * 1024; // 1MB

    it('should pass validation for valid file', () => {
      expect(() =>
        validateUploadedFile(validFilename, validMimeType, validSize)
      ).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('File upload validation passed')
      );
    });

    it('should fail if filename is invalid', () => {
      expect(() =>
        validateUploadedFile('../../../etc/passwd', validMimeType, validSize)
      ).toThrow(ValidationError);
    });

    it('should fail if extension is invalid', () => {
      expect(() => validateUploadedFile('malware.exe', validMimeType, validSize)).toThrow(
        ValidationError
      );
    });

    it('should fail if MIME type is invalid', () => {
      expect(() =>
        validateUploadedFile(validFilename, 'application/x-executable', validSize)
      ).toThrow(ValidationError);
    });

    it('should fail if file size is invalid', () => {
      expect(() => validateUploadedFile(validFilename, validMimeType, 0)).toThrow(
        ValidationError
      );
      expect(() =>
        validateUploadedFile(validFilename, validMimeType, MAX_FILE_SIZE + 1)
      ).toThrow(ValidationError);
    });

    it('should log successful validation with file details', () => {
      validateUploadedFile(validFilename, validMimeType, validSize);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('test.csv')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('text/csv')
      );
    });
  });

  describe('Security Attack Scenarios', () => {
    it('should block path traversal attack', () => {
      expect(() =>
        validateUploadedFile('../../../etc/passwd', 'text/plain', 1024)
      ).toThrow(ValidationError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Path traversal attack detected')
      );
    });

    it('should block executable uploads', () => {
      expect(() =>
        validateUploadedFile('malware.exe', 'application/x-msdownload', 1024)
      ).toThrow(ValidationError);
    });

    it('should block script uploads', () => {
      expect(() =>
        validateUploadedFile('malicious.sh', 'application/x-sh', 1024)
      ).toThrow(ValidationError);
    });

    it('should block file bombs (very large files)', () => {
      const fileBombSize = 100 * 1024 * 1024; // 100MB
      expect(() =>
        validateUploadedFile('bomb.csv', 'text/csv', fileBombSize)
      ).toThrow(ValidationError);
    });

    it('should block null byte injection', () => {
      expect(() =>
        validateUploadedFile('file.csv\0.exe', 'text/csv', 1024)
      ).toThrow(ValidationError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Null byte injection detected')
      );
    });

    it('should block Windows system paths', () => {
      expect(() =>
        validateUploadedFile('C:\\Windows\\System32\\evil.csv', 'text/csv', 1024)
      ).toThrow(ValidationError);
    });

    it('should block Unix system paths', () => {
      expect(() =>
        validateUploadedFile('/etc/passwd', 'text/plain', 1024)
      ).toThrow(ValidationError);
    });
  });

  describe('Real-world File Scenarios', () => {
    it('should accept valid CSV import file', () => {
      expect(() =>
        validateUploadedFile(
          'Dane użyte i bele - 2024.csv',
          'text/csv',
          2 * 1024 * 1024
        )
      ).not.toThrow();
    });

    it('should accept valid PDF price file', () => {
      expect(() =>
        validateUploadedFile(
          'Cena zamówienia 12345.pdf',
          'application/pdf',
          500 * 1024
        )
      ).not.toThrow();
    });

    it('should accept valid Excel file', () => {
      expect(() =>
        validateUploadedFile(
          'Export.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          3 * 1024 * 1024
        )
      ).not.toThrow();
    });

    it('should accept Schuco export file', () => {
      expect(() =>
        validateUploadedFile(
          'Schüco Connect - Zamówienia - 16.12.2025.csv',
          'text/csv',
          1 * 1024 * 1024
        )
      ).not.toThrow();
    });
  });
});
