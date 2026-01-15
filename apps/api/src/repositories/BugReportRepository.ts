/**
 * Bug Report Repository - File operations layer
 * Obsługuje operacje na pliku bug-reports.log
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import type { BugReportInput } from '../validators/bugReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżka do pliku z logami zgłoszeń
// __dirname = apps/api/src/repositories/ -> idziemy 2 poziomy w górę do apps/api/logs/
const BUG_REPORTS_LOG = path.join(__dirname, '../../logs/bug-reports.log');

export class BugReportRepository {
  /**
   * Upewnij się że folder logs/ istnieje
   */
  private async ensureLogsDirectory(): Promise<void> {
    const logsDir = path.dirname(BUG_REPORTS_LOG);
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
      logger.info(`Created logs directory: ${logsDir}`);
    }
  }

  /**
   * Zapisz zgłoszenie do pliku log
   */
  async save(data: BugReportInput, userEmail: string | undefined): Promise<void> {
    await this.ensureLogsDirectory();

    const entry = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐛 ZGŁOSZENIE BŁĘDU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data: ${data.timestamp}
Użytkownik: ${userEmail || 'Nieznany'}
URL: ${data.url}
UserAgent: ${data.userAgent}

Opis:
${data.description}

Screenshot: ${data.screenshot ? 'TAK (załączony)' : 'NIE'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    await fs.appendFile(BUG_REPORTS_LOG, entry, 'utf-8');
  }

  /**
   * Pobierz wszystkie zgłoszenia z pliku
   */
  async getAll(_limit?: number): Promise<string> {
    try {
      await fs.access(BUG_REPORTS_LOG);
    } catch {
      return 'Brak zgłoszeń.';
    }

    const content = await fs.readFile(BUG_REPORTS_LOG, 'utf-8');
    return content;
  }
}
