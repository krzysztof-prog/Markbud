/**
 * File Upload Validation Utility
 * Provides security validations for file uploads
 */

import path from 'path';
import { ValidationError } from './errors.js';
import { logger } from './logger.js';

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain', // For .txt files
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/pdf',
  'application/octet-stream', // Fallback for CSV files sometimes detected as binary
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx', '.pdf', '.txt'] as const;

type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate MIME type of uploaded file
 */
export function validateMimeType(mimeType: string | undefined): void {
  if (!mimeType) {
    logger.warn('File upload attempt with no MIME type');
    throw new ValidationError('Brak typu MIME pliku', {
      mimeType: ['Nie mozna zidentyfikowac typu pliku'],
    });
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    logger.warn(`File upload rejected - invalid MIME type: ${mimeType}`);
    throw new ValidationError('Nieprawidlowy typ pliku', {
      mimeType: [
        `Typ "${mimeType}" nie jest dozwolony. Dozwolone typy: CSV, Excel (XLS/XLSX), PDF, TXT`,
      ],
    });
  }
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): void {
  const ext = path.extname(filename).toLowerCase();

  if (!ext) {
    logger.warn(`File upload rejected - no extension: ${filename}`);
    throw new ValidationError('Brak rozszerzenia pliku', {
      filename: ['Plik musi miec rozszerzenie (np. .csv, .pdf)'],
    });
  }

  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    logger.warn(`File upload rejected - invalid extension: ${ext} (${filename})`);
    throw new ValidationError('Nieprawidlowe rozszerzenie pliku', {
      extension: [
        `Rozszerzenie "${ext}" nie jest dozwolone. Dozwolone rozszerzenia: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ],
    });
  }
}

/**
 * Validate filename for path traversal attacks
 */
export function validateFilename(filename: string): void {
  // Check for path traversal patterns
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    logger.error(`Path traversal attack detected in filename: ${filename}`);
    throw new ValidationError('Nieprawidlowa nazwa pliku', {
      filename: ['Nazwa pliku zawiera niedozwolone znaki'],
    });
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    logger.error(`Null byte injection detected in filename: ${filename}`);
    throw new ValidationError('Nieprawidlowa nazwa pliku', {
      filename: ['Nazwa pliku zawiera niedozwolone znaki'],
    });
  }

  // Check if filename is empty after validation
  if (!filename || filename.trim().length === 0) {
    logger.warn('File upload rejected - empty filename');
    throw new ValidationError('Pusta nazwa pliku', {
      filename: ['Nazwa pliku nie moze byc pusta'],
    });
  }

  // Check for excessively long filenames (max 255 chars)
  if (filename.length > 255) {
    logger.warn(`File upload rejected - filename too long: ${filename.length} chars`);
    throw new ValidationError('Nazwa pliku zbyt dluga', {
      filename: ['Nazwa pliku nie moze przekraczac 255 znakow'],
    });
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): void {
  if (size <= 0) {
    logger.warn('File upload rejected - zero or negative size');
    throw new ValidationError('Nieprawidlowy rozmiar pliku', {
      size: ['Plik jest pusty lub ma nieprawidlowy rozmiar'],
    });
  }

  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    logger.warn(`File upload rejected - size too large: ${sizeMB}MB`);
    throw new ValidationError('Plik jest zbyt duzy', {
      size: [`Maksymalny rozmiar to ${maxSizeMB}MB, a plik ma ${sizeMB}MB`],
    });
  }
}

/**
 * Sanitize filename to be safe for filesystem
 * Removes/replaces dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components (just in case)
  const baseName = path.basename(filename);

  // Replace all non-alphanumeric characters (except dots, hyphens, underscores) with underscore
  // This prevents potential issues with special characters in filenames
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent filenames starting with dot (hidden files on Unix)
  if (sanitized.startsWith('.')) {
    return '_' + sanitized;
  }

  return sanitized;
}

/**
 * Main validation function - validates all aspects of uploaded file
 */
export function validateUploadedFile(
  filename: string,
  mimeType: string | undefined,
  size: number
): void {
  // 1. Validate filename for path traversal
  validateFilename(filename);

  // 2. Validate file extension
  validateFileExtension(filename);

  // 3. Validate MIME type
  validateMimeType(mimeType);

  // 4. Validate file size
  validateFileSize(size);

  logger.info(`File upload validation passed: ${filename} (${mimeType}, ${(size / 1024).toFixed(2)}KB)`);
}
