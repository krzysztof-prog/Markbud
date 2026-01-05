/**
 * Import File System Service
 *
 * Abstracts file system operations for the import module.
 * Provides a mockable interface for testing and consistent error handling.
 */

import { writeFile, mkdir, readdir, copyFile, rename, rm } from 'fs/promises';
import { existsSync, statSync, type Stats, type Dirent } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

/**
 * Data structure for CSV file information
 */
export interface CsvFileData {
  filepath: string;
  filename: string;
  relativePath: string;
}

/**
 * Import File System Service
 *
 * Centralizes all file system operations used by the import module.
 * Benefits:
 * - Easy to mock in tests
 * - Consistent error handling
 * - Can be swapped for cloud storage (S3, etc.) in the future
 */
export class ImportFileSystemService {
  /**
   * Create a directory if it doesn't exist
   */
  async createDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Write buffer to a file
   */
  async writeFile(filePath: string, buffer: Buffer): Promise<void> {
    await writeFile(filePath, buffer);
  }

  /**
   * Copy a file from source to destination
   */
  async copyFile(source: string, dest: string): Promise<void> {
    await copyFile(source, dest);
  }

  /**
   * Move a file or directory (rename)
   */
  async moveFile(source: string, dest: string): Promise<void> {
    await rename(source, dest);
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    await rm(dirPath, { recursive, force: true });
  }

  /**
   * Check if a path exists
   */
  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Check if path is a directory
   */
  isDirectory(filePath: string): boolean {
    if (!existsSync(filePath)) {
      return false;
    }
    return statSync(filePath).isDirectory();
  }

  /**
   * Get file/directory stats
   */
  getStats(filePath: string): Stats {
    return statSync(filePath);
  }

  /**
   * Read directory entries
   */
  async readDirectory(dirPath: string): Promise<Dirent[]> {
    return readdir(dirPath, { withFileTypes: true });
  }

  /**
   * Ensure uploads directory exists and return its path
   */
  async ensureUploadsDirectory(): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await this.createDirectory(uploadsDir);
    return uploadsDir;
  }

  /**
   * Validate that a folder path is within the allowed base path
   * Throws ForbiddenError if path is outside allowed location
   */
  validatePathWithinBase(folderPath: string, basePath: string): void {
    const normalizedBase = path.resolve(basePath);
    const normalizedFolder = path.resolve(folderPath);

    // Case-insensitive comparison on Windows
    if (!normalizedFolder.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
      throw new ForbiddenError('Folder musi znajdowac sie w dozwolonej lokalizacji');
    }
  }

  /**
   * Validate that a path exists and is a directory
   * Throws NotFoundError if path doesn't exist
   * Throws ValidationError if path is not a directory
   */
  validateDirectory(folderPath: string): void {
    const normalizedFolder = path.resolve(folderPath);

    if (!existsSync(normalizedFolder)) {
      throw new NotFoundError('Folder');
    }

    const stats = statSync(normalizedFolder);
    if (!stats.isDirectory()) {
      throw new ValidationError('Sciezka nie jest folderem');
    }
  }

  /**
   * Recursively find CSV files with "uzyte" or "bele" in name
   */
  async findCsvFilesRecursively(
    dirPath: string,
    maxDepth: number = 3,
    currentDepth: number = 0
  ): Promise<CsvFileData[]> {
    const results: CsvFileData[] = [];

    if (currentDepth > maxDepth) {
      return results;
    }

    try {
      const entries = await this.readDirectory(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findCsvFilesRecursively(
            fullPath,
            maxDepth,
            currentDepth + 1
          );
          results.push(...subResults);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          if (
            lowerName.endsWith('.csv') &&
            (lowerName.includes('uzyte') || lowerName.includes('bele'))
          ) {
            const relativePath = path.relative(dirPath, fullPath);
            results.push({
              filepath: fullPath,
              filename: entry.name,
              relativePath,
            });
          }
        }
      }
    } catch (error) {
      logger.error(
        `Blad podczas skanowania ${dirPath}: ${error instanceof Error ? error.message : 'Nieznany blad'}`
      );
    }

    return results;
  }

  /**
   * Move a folder to the archive subdirectory
   * Creates "archiwum" subfolder in the parent directory if it doesn't exist
   * Returns the new path to the archived folder
   */
  async moveFolderToArchive(folderPath: string): Promise<string> {
    const parentDir = path.dirname(folderPath);
    const folderName = path.basename(folderPath);
    const archiveDir = path.join(parentDir, 'archiwum');
    const archivePath = path.join(archiveDir, folderName);

    // Create archive directory if it doesn't exist
    if (!existsSync(archiveDir)) {
      await mkdir(archiveDir, { recursive: true });
      logger.info(`Utworzono folder archiwum: ${archiveDir}`);
    }

    // Check if destination already exists (shouldn't happen, but handle gracefully)
    if (existsSync(archivePath)) {
      // Add timestamp to make it unique
      const timestamp = Date.now();
      const uniqueArchivePath = path.join(archiveDir, `${folderName}_${timestamp}`);
      await rename(folderPath, uniqueArchivePath);
      return uniqueArchivePath;
    }

    // Move folder to archive
    await rename(folderPath, archivePath);
    return archivePath;
  }

  /**
   * Extract date from folder name
   * Expected format: DD.MM.YYYY in folder name
   * Returns null if no date found
   */
  extractDateFromFolderName(folderName: string): Date | null {
    const dateMatch = folderName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

    if (!dateMatch) {
      return null;
    }

    const [, day, month, year] = dateMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /**
   * Generate a safe filename with timestamp
   */
  generateSafeFilename(originalFilename: string, sanitizeFn: (name: string) => string): string {
    const timestamp = Date.now();
    return `${timestamp}_${sanitizeFn(originalFilename)}`;
  }

  /**
   * Normalize and resolve a path
   */
  normalizePath(inputPath: string): string {
    return path.resolve(inputPath);
  }

  /**
   * Get the base name of a path
   */
  getBaseName(inputPath: string): string {
    return path.basename(inputPath);
  }

  /**
   * Join path segments
   */
  joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Get the directory name of a path
   */
  getDirName(inputPath: string): string {
    return path.dirname(inputPath);
  }

  /**
   * Extract delivery date from folder name (alias for extractDateFromFolderName)
   * For testing compatibility
   */
  extractDeliveryDateFromFolder(folderName: string): Date | null {
    return this.extractDateFromFolderName(folderName);
  }

  /**
   * Scan for CSV files in a folder (non-recursive, only .csv files)
   * For testing compatibility
   */
  async scanForCsvFiles(dirPath: string): Promise<CsvFileData[]> {
    const results: CsvFileData[] = [];

    try {
      const entries = await this.readDirectory(dirPath);

      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(dirPath, fullPath);
          results.push({
            filepath: fullPath,
            filename: entry.name,
            relativePath,
          });
        }
      }
    } catch (error) {
      logger.error(
        `Error scanning ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return results;
  }
}

// Singleton instance for use across the application
export const importFileSystemService = new ImportFileSystemService();
