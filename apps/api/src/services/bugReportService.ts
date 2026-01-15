/**
 * Bug Report Service - Business logic layer
 * Obsługuje zapisywanie i odczytywanie zgłoszeń błędów
 */

import { BugReportRepository } from '../repositories/BugReportRepository.js';
import type { BugReportInput } from '../validators/bugReport.js';
import { logger } from '../utils/logger.js';

export class BugReportService {
  constructor(private repository: BugReportRepository) {}

  /**
   * Zapisz zgłoszenie błędu
   */
  async saveBugReport(data: BugReportInput, userEmail: string | undefined): Promise<void> {
    await this.repository.save(data, userEmail);
    logger.info('Bug report saved', { userEmail, url: data.url });
  }

  /**
   * Pobierz wszystkie zgłoszenia
   */
  async getAllReports(limit?: number): Promise<string> {
    return this.repository.getAll(limit);
  }
}
