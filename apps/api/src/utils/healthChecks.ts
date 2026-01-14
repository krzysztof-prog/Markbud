/**
 * Health Checks - Funkcje sprawdzające stan systemu
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import { logger } from './logger.js';
import os from 'os';
import { config } from './config.js';

export type HealthStatus = 'ok' | 'warning' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: any;
}

/**
 * Sprawdź połączenie z bazą danych
 */
export async function checkDatabase(prisma: PrismaClient): Promise<HealthCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      message: 'Połączono z bazą danych',
    };
  } catch (error) {
    logger.error('Database health check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Nieznany błąd',
    };
  }
}

/**
 * Sprawdź miejsce na dysku
 */
export async function checkDiskSpace(): Promise<HealthCheckResult> {
  try {
    const dbPath = config.database.url.replace('file:', '');
    const stats = await fs.stat(dbPath);
    const dbSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    // Sprawdź wolne miejsce na dysku (Windows)
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

    // Ostrzeżenie jeśli baza > 500MB lub RAM usage > 90%
    if (stats.size > 500 * 1024 * 1024 || usedMemPercent > 90) {
      return {
        status: 'warning',
        message: 'Niska ilość wolnej pamięci lub duża baza danych',
        details: {
          databaseSizeMB: dbSizeMB,
          memoryUsedPercent: usedMemPercent.toFixed(2),
        },
      };
    }

    return {
      status: 'ok',
      message: 'Wystarczająco miejsca',
      details: {
        databaseSizeMB: dbSizeMB,
        memoryUsedPercent: usedMemPercent.toFixed(2),
      },
    };
  } catch (error) {
    logger.error('Disk space check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Nie można sprawdzić miejsca na dysku',
    };
  }
}

/**
 * Sprawdź dostęp do folderów sieciowych
 */
export async function checkNetworkFolders(): Promise<HealthCheckResult> {
  const folders = [
    { name: 'Użyte Bele', path: process.env.WATCH_FOLDER_UZYTE_BELE },
    { name: 'Ceny', path: process.env.WATCH_FOLDER_CENY },
    { name: 'Zamówienia Szyb', path: process.env.WATCH_FOLDER_ZAMOWIENIA_SZYB },
    { name: 'Dostawy Szyb', path: process.env.WATCH_FOLDER_DOSTAWY_SZYB },
    { name: 'Okucia Zapotrzebowanie', path: process.env.WATCH_FOLDER_OKUCIA_ZAP },
  ];

  const results: Array<{ name: string; path: string | undefined; status: HealthStatus }> = [];
  let hasErrors = false;

  for (const folder of folders) {
    if (!folder.path) {
      results.push({ name: folder.name, path: folder.path, status: 'warning' });
      continue;
    }

    try {
      await fs.access(folder.path);
      results.push({ name: folder.name, path: folder.path, status: 'ok' });
    } catch {
      results.push({ name: folder.name, path: folder.path, status: 'error' });
      hasErrors = true;
    }
  }

  if (hasErrors) {
    return {
      status: 'error',
      message: 'Niektóre foldery sieciowe są niedostępne',
      details: { folders: results },
    };
  }

  const hasWarnings = results.some((r) => r.status === 'warning');
  if (hasWarnings) {
    return {
      status: 'warning',
      message: 'Niektóre foldery nie są skonfigurowane',
      details: { folders: results },
    };
  }

  return {
    status: 'ok',
    message: 'Wszystkie foldery dostępne',
    details: { folders: results },
  };
}

/**
 * Sprawdź status systemu importów (aktywne blokady)
 */
export async function checkLastImports(prisma: PrismaClient): Promise<HealthCheckResult> {
  try {
    // Pobierz aktywne blokady importów (import w toku)
    const activeLocks = await prisma.importLock.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      orderBy: { lockedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        folderPath: true,
        lockedAt: true,
        expiresAt: true,
      },
    });

    if (activeLocks.length > 0) {
      return {
        status: 'warning',
        message: `Import w toku (${activeLocks.length} aktywnych blokad)`,
        details: { activeLocks },
      };
    }

    return {
      status: 'ok',
      message: 'System importów gotowy',
      details: { activeLocks: [] },
    };
  } catch (error) {
    logger.error('Import check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Nie można sprawdzić importów',
    };
  }
}

/**
 * Sprawdź uptime aplikacji
 */
export function checkUptime(): HealthCheckResult {
  const uptimeSeconds = process.uptime();
  const uptimeHours = (uptimeSeconds / 3600).toFixed(2);

  return {
    status: 'ok',
    message: `Aplikacja działa od ${uptimeHours} godzin`,
    details: {
      uptimeSeconds: Math.floor(uptimeSeconds),
      uptimeFormatted: formatUptime(uptimeSeconds),
    },
  };
}

/**
 * Formatuj uptime w czytelny sposób
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '<1m';
}

/**
 * Sprawdź wszystkie systemy
 */
export async function checkAllSystems(prisma: PrismaClient) {
  const checks = {
    database: await checkDatabase(prisma),
    diskSpace: await checkDiskSpace(),
    networkFolders: await checkNetworkFolders(),
    lastImports: await checkLastImports(prisma),
    uptime: checkUptime(),
  };

  // Określ ogólny status
  const hasErrors = Object.values(checks).some((check) => check.status === 'error');
  const hasWarnings = Object.values(checks).some((check) => check.status === 'warning');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasErrors) {
    overallStatus = 'unhealthy';
  } else if (hasWarnings) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: config.environment,
    checks,
  };
}
