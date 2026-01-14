/**
 * Import Service - Backward Compatible Wrapper
 *
 * This file provides backward compatibility for existing code that imports ImportService.
 * It delegates all operations to the new ImportOrchestrator.
 *
 * The actual implementation has been refactored into:
 * - ImportOrchestrator: Main coordination (~350 lines)
 * - UzyteBeleProcessor: CSV "uzyte bele" processing (~400 lines)
 * - CenyProcessor: PDF price file processing (~200 lines)
 *
 * All new code should import directly from './import/index.js' instead.
 *
 * @deprecated Use ImportOrchestrator from './import/index.js' instead
 */

import { ImportRepository } from '../repositories/ImportRepository.js';
import { ImportOrchestrator, logParserFeatureFlags } from './import/index.js';
import type { VariantResolutionAction } from './orderVariantService.js';

// Log feature flags on module load for visibility
logParserFeatureFlags();

/**
 * ImportService - Backward Compatible Wrapper
 *
 * Wraps ImportOrchestrator to maintain backward compatibility.
 * All methods delegate to the orchestrator.
 *
 * @deprecated Use ImportOrchestrator directly for new code
 */
export class ImportService {
  private orchestrator: ImportOrchestrator;

  constructor(repository: ImportRepository) {
    this.orchestrator = new ImportOrchestrator(repository);
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  /**
   * Get imports base path from settings or environment
   * Supports per-user folder settings if userId is provided
   */
  async getImportsBasePath(userId?: number): Promise<string> {
    return this.orchestrator.getImportsBasePath(userId);
  }

  // ============================================================
  // BASIC CRUD
  // ============================================================

  /**
   * Get all imports with optional status filter
   */
  async getAllImports(status?: string) {
    return this.orchestrator.getAllImports(status);
  }

  /**
   * Get pending imports
   */
  async getPendingImports() {
    return this.orchestrator.getPendingImports();
  }

  /**
   * Get import by ID
   */
  async getImportById(id: number) {
    return this.orchestrator.getImportById(id);
  }

  /**
   * Reject an import
   */
  async rejectImport(id: number) {
    return this.orchestrator.rejectImport(id);
  }

  /**
   * Delete an import and associated data
   */
  async deleteImport(id: number) {
    return this.orchestrator.deleteImport(id);
  }

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  /**
   * Upload and create a new file import
   */
  async uploadFile(filename: string, buffer: Buffer, mimeType?: string) {
    return this.orchestrator.uploadFile(filename, buffer, mimeType);
  }

  // ============================================================
  // PREVIEW
  // ============================================================

  /**
   * Get preview of import file with variant conflict detection
   */
  async getPreview(id: number) {
    return this.orchestrator.getPreview(id);
  }

  /**
   * Preview file by filepath with variant conflict detection
   */
  async previewByFilepath(filepath: string): Promise<any> {
    return this.orchestrator.previewByFilepath(filepath);
  }

  // ============================================================
  // APPROVAL
  // ============================================================

  /**
   * Approve and process an import
   */
  async approveImport(id: number, action: 'overwrite' | 'add_new' = 'add_new', replaceBase: boolean = false) {
    return this.orchestrator.approveImport(id, action, replaceBase);
  }

  /**
   * Process uzyte/bele CSV import with variant resolution
   */
  async processUzyteBeleWithResolution(
    id: number,
    resolution: VariantResolutionAction
  ): Promise<{ success: boolean; result: unknown }> {
    return this.orchestrator.processUzyteBeleWithResolution(id, resolution);
  }

  // ============================================================
  // FOLDER OPERATIONS
  // ============================================================

  /**
   * Import all CSV files from a folder with date in name
   */
  async importFromFolder(folderPath: string, deliveryNumber: 'I' | 'II' | 'III', userId: number) {
    return this.orchestrator.importFromFolder(folderPath, deliveryNumber, userId);
  }

  /**
   * List folders with dates in their names
   */
  async listFolders(userId?: number) {
    return this.orchestrator.listFolders(userId);
  }

  /**
   * Scan a folder and return info about CSV files
   */
  async scanFolder(folderPath: string, userId?: number) {
    return this.orchestrator.scanFolder(folderPath, userId);
  }

  /**
   * Archive a folder to the "archiwum" subdirectory
   */
  async archiveFolder(folderPath: string, userId?: number): Promise<string> {
    return this.orchestrator.archiveFolder(folderPath, userId);
  }

  /**
   * Delete a folder permanently
   */
  async deleteFolder(folderPath: string, userId?: number): Promise<void> {
    return this.orchestrator.deleteFolder(folderPath, userId);
  }

  // ============================================================
  // PROCESS IMPORT BY FILEPATH
  // ============================================================

  /**
   * Process import with optional variant resolution
   */
  async processImport(
    filepath: string,
    deliveryNumber?: 'I' | 'II' | 'III',
    resolution?: VariantResolutionAction
  ) {
    return this.orchestrator.processImport(filepath, deliveryNumber, resolution);
  }
}
