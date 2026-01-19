import type { PrismaClient } from '@prisma/client';
import { MojaPracaRepository } from '../repositories/MojaPracaRepository.js';
import { CsvParser } from './parsers/csv-parser.js';
import { logger } from '../utils/logger.js';
import type { ConflictResolutionInput } from '../validators/moja-praca.js';

// Role które mogą rozwiązywać konflikty wszystkich użytkowników
const ADMIN_ROLES = ['owner', 'admin', 'kierownik'];

// Typ dla konfliktu z dodanymi danymi
export interface ConflictWithDetails {
  id: number;
  orderNumber: string;
  baseOrderNumber: string;
  suffix: string;
  documentAuthor: string | null;
  filename: string;
  filepath: string;
  parsedData: string;
  existingWindowsCount: number | null;
  existingGlassCount: number | null;
  newWindowsCount: number | null;
  newGlassCount: number | null;
  systemSuggestion: string | null;
  status: string;
  createdAt: Date;
  baseOrder: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
    totalWindows: number | null;
    totalGlasses: number | null;
    createdAt: Date;
  };
}

// Typ dla odpowiedzi rozwiązania konfliktu
export interface ResolveConflictResult {
  success: boolean;
  message: string;
  orderId?: number;
  orderNumber?: string;
}

// Typ dla zbiorczego rozwiązania konfliktów
export interface BulkResolveResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  results: Array<{
    id: number;
    orderNumber: string;
    success: boolean;
    message: string;
  }>;
}

export class MojaPracaService {
  private repository: MojaPracaRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.repository = new MojaPracaRepository(prisma);
  }

  // ============================================
  // Konflikty
  // ============================================

  /**
   * Pobiera listę konfliktów dla użytkownika
   */
  async getConflicts(userId: number, status: 'pending' | 'resolved' | 'all' = 'pending') {
    const conflicts = await this.repository.getConflicts(userId, status);

    return conflicts.map((conflict) => ({
      ...conflict,
      createdAt: conflict.createdAt.toISOString(),
    }));
  }

  /**
   * Pobiera szczegóły konfliktu
   * Użytkownik może zobaczyć konflikty przypisane do siebie ORAZ konflikty bez właściciela
   */
  async getConflictDetail(conflictId: number, userId: number): Promise<ConflictWithDetails | null> {
    const conflict = await this.repository.getConflictById(conflictId);

    if (!conflict) {
      return null;
    }

    // Sprawdź czy konflikt należy do użytkownika LUB jest bez właściciela
    const isOwner = conflict.authorUserId === userId;
    const isUnassigned = conflict.authorUserId === null;

    if (!isOwner && !isUnassigned) {
      logger.warn(`User ${userId} tried to access conflict ${conflictId} owned by ${conflict.authorUserId}`);
      return null;
    }

    return conflict as ConflictWithDetails;
  }

  /**
   * Zlicza konflikty dla użytkownika
   */
  async countConflicts(userId: number) {
    return this.repository.countConflicts(userId);
  }

  /**
   * Rozwiązuje konflikt importu
   */
  async resolveConflict(
    conflictId: number,
    userId: number,
    input: ConflictResolutionInput
  ): Promise<ResolveConflictResult> {
    // Pobierz konflikt
    const conflict = await this.repository.getConflictById(conflictId);

    if (!conflict) {
      return {
        success: false,
        message: 'Konflikt nie został znaleziony',
      };
    }

    // Pobierz rolę użytkownika aby sprawdzić czy jest adminem
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    // Sprawdź czy konflikt należy do użytkownika LUB użytkownik jest adminem
    if (conflict.authorUserId !== userId && !isAdmin) {
      return {
        success: false,
        message: 'Nie masz uprawnień do tego konfliktu',
      };
    }

    // Sprawdź czy konflikt nie jest już rozwiązany
    if (conflict.status !== 'pending') {
      return {
        success: false,
        message: 'Konflikt już został rozwiązany',
      };
    }

    // Obsłuż różne akcje
    switch (input.action) {
      case 'cancel':
        return this.handleCancelConflict(conflict, userId);

      case 'keep_both':
        return this.handleKeepBothConflict(conflict, userId);

      case 'replace_base':
        return this.handleReplaceBaseConflict(conflict, userId);

      case 'replace_variant':
        return this.handleReplaceVariantConflict(conflict, userId, input.targetOrderNumber);

      default:
        return {
          success: false,
          message: 'Nieznana akcja',
        };
    }
  }

  /**
   * Rozwiązuje wiele konfliktów naraz (bulk)
   * Wykonuje sekwencyjnie, zbierając wyniki
   */
  async bulkResolveConflicts(
    userId: number,
    conflictIds: number[],
    action: 'replace_base' | 'replace_variant' | 'keep_both' | 'cancel'
  ): Promise<BulkResolveResult> {
    const results: BulkResolveResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;

    // Pobierz rolę użytkownika aby sprawdzić czy jest adminem
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    // Pobierz wszystkie konflikty aby mieć numery zleceń do raportowania
    const conflicts = await this.prisma.pendingImportConflict.findMany({
      where: {
        id: { in: conflictIds },
        status: 'pending',
      },
      select: {
        id: true,
        orderNumber: true,
        authorUserId: true,
      },
    });

    // Mapuj id -> orderNumber
    const conflictMap = new Map(conflicts.map((c) => [c.id, c]));

    for (const conflictId of conflictIds) {
      const conflict = conflictMap.get(conflictId);

      // Konflikt nie istnieje lub nie jest pending
      if (!conflict) {
        results.push({
          id: conflictId,
          orderNumber: 'nieznany',
          success: false,
          message: 'Konflikt nie istnieje lub został już rozwiązany',
        });
        failedCount++;
        continue;
      }

      // Sprawdź uprawnienia - admin może rozwiązywać wszystkie konflikty
      if (conflict.authorUserId !== userId && conflict.authorUserId !== null && !isAdmin) {
        results.push({
          id: conflictId,
          orderNumber: conflict.orderNumber,
          success: false,
          message: 'Brak uprawnień',
        });
        failedCount++;
        continue;
      }

      // Rozwiąż konflikt
      const result = await this.resolveConflict(conflictId, userId, { action });

      results.push({
        id: conflictId,
        orderNumber: conflict.orderNumber,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    logger.info(
      `Bulk resolve conflicts by user ${userId}: ${successCount} success, ${failedCount} failed`
    );

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      results,
    };
  }

  /**
   * Anuluje konflikt (nie importuje pliku)
   */
  private async handleCancelConflict(
    conflict: Awaited<ReturnType<MojaPracaRepository['getConflictById']>>,
    userId: number
  ): Promise<ResolveConflictResult> {
    await this.repository.resolveConflict(conflict!.id, {
      status: 'cancelled',
      resolution: 'cancelled',
      resolvedById: userId,
      resolvedAt: new Date(),
    });

    logger.info(`Conflict ${conflict!.id} cancelled by user ${userId}`);

    return {
      success: true,
      message: 'Import został anulowany',
    };
  }

  /**
   * Zachowuje oba - importuje jako nowy wariant
   */
  private async handleKeepBothConflict(
    conflict: Awaited<ReturnType<MojaPracaRepository['getConflictById']>>,
    userId: number
  ): Promise<ResolveConflictResult> {
    // Używamy CsvParser który deleguje do UzyteBeleParser
    // UzyteBeleParser poprawnie rozróżnia sekcje okien i szyb
    const csvParser = new CsvParser();

    try {
      // Importuj plik jako nowy wariant (nie zastępuj bazowego)
      const result = await csvParser.processUzyteBele(conflict!.filepath, 'add_new', false);

      // Oznacz konflikt jako rozwiązany
      await this.repository.resolveConflict(conflict!.id, {
        status: 'resolved',
        resolution: 'kept_both',
        resolvedById: userId,
        resolvedAt: new Date(),
      });

      logger.info(`Conflict ${conflict!.id} resolved with keep_both by user ${userId}, orderId: ${result.orderId}`);

      return {
        success: true,
        message: `Zaimportowano jako nowy wariant: ${conflict!.orderNumber}`,
        orderId: result.orderId,
        orderNumber: conflict!.orderNumber,
      };
    } catch (error) {
      logger.error(`Error resolving conflict ${conflict!.id} with keep_both:`, error);
      return {
        success: false,
        message: `Błąd importu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
      };
    }
  }

  /**
   * Zastępuje bazowe zlecenie nowymi danymi
   */
  private async handleReplaceBaseConflict(
    conflict: Awaited<ReturnType<MojaPracaRepository['getConflictById']>>,
    userId: number
  ): Promise<ResolveConflictResult> {
    // Używamy CsvParser który deleguje do UzyteBeleParser
    // UzyteBeleParser poprawnie rozróżnia sekcje okien i szyb
    const csvParser = new CsvParser();

    try {
      // Importuj plik, zastępując bazowe zlecenie
      const result = await csvParser.processUzyteBele(conflict!.filepath, 'overwrite', true);

      // Oznacz konflikt jako rozwiązany
      await this.repository.resolveConflict(conflict!.id, {
        status: 'resolved',
        resolution: 'replaced',
        resolvedById: userId,
        resolvedAt: new Date(),
      });

      logger.info(
        `Conflict ${conflict!.id} resolved with replace_base by user ${userId}, orderId: ${result.orderId}`
      );

      return {
        success: true,
        message: `Zastąpiono zlecenie bazowe: ${conflict!.baseOrderNumber}`,
        orderId: result.orderId,
        orderNumber: conflict!.baseOrderNumber,
      };
    } catch (error) {
      logger.error(`Error resolving conflict ${conflict!.id} with replace_base:`, error);
      return {
        success: false,
        message: `Błąd importu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
      };
    }
  }

  /**
   * Zastępuje konkretny wariant
   */
  private async handleReplaceVariantConflict(
    conflict: Awaited<ReturnType<MojaPracaRepository['getConflictById']>>,
    userId: number,
    targetOrderNumber?: string
  ): Promise<ResolveConflictResult> {
    if (!targetOrderNumber) {
      return {
        success: false,
        message: 'Nie podano numeru zlecenia do zastąpienia',
      };
    }

    // Na razie używamy tej samej logiki co replace_base
    // W przyszłości można rozbudować o wybór konkretnego wariantu
    // Używamy CsvParser który deleguje do UzyteBeleParser
    const csvParser = new CsvParser();

    try {
      const result = await csvParser.processUzyteBele(conflict!.filepath, 'overwrite', true);

      await this.repository.resolveConflict(conflict!.id, {
        status: 'resolved',
        resolution: 'replaced',
        resolvedById: userId,
        resolvedAt: new Date(),
      });

      logger.info(
        `Conflict ${conflict!.id} resolved with replace_variant by user ${userId}, orderId: ${result.orderId}`
      );

      return {
        success: true,
        message: `Zastąpiono wariant: ${targetOrderNumber}`,
        orderId: result.orderId,
        orderNumber: targetOrderNumber,
      };
    } catch (error) {
      logger.error(`Error resolving conflict ${conflict!.id} with replace_variant:`, error);
      return {
        success: false,
        message: `Błąd importu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
      };
    }
  }

  // ============================================
  // Zlecenia użytkownika
  // ============================================

  /**
   * Pobiera zlecenia użytkownika z danego dnia
   */
  async getOrdersForUser(userId: number, date: Date) {
    const orders = await this.repository.getOrdersForUserByDate(userId, date);

    return orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  // ============================================
  // Dostawy
  // ============================================

  /**
   * Pobiera dostawy zawierające zlecenia użytkownika
   */
  async getDeliveriesForUser(userId: number, date: Date) {
    const deliveries = await this.repository.getDeliveriesForUserByDate(userId, date);

    return deliveries.map((delivery) => ({
      id: delivery.id,
      deliveryDate: delivery.deliveryDate.toISOString(),
      deliveryNumber: delivery.deliveryNumber,
      status: delivery.status,
      notes: delivery.notes,
      // Filtruj tylko zlecenia użytkownika
      orders: delivery.deliveryOrders
        .filter((dOrder) => dOrder.order.documentAuthorUserId === userId)
        .map((dOrder) => ({
          position: dOrder.position,
          ...dOrder.order,
        })),
      // Łączna liczba zleceń w dostawie (dla kontekstu)
      totalOrdersInDelivery: delivery.deliveryOrders.length,
    }));
  }

  // ============================================
  // Zamówienia szyb
  // ============================================

  /**
   * Pobiera zamówienia szyb dla zleceń użytkownika
   */
  async getGlassOrdersForUser(userId: number, date: Date) {
    const glassOrders = await this.repository.getGlassOrdersSimple(userId, date);

    // Filtruj tylko te zamówienia, które mają pozycje
    return glassOrders
      .filter((go) => go.items.length > 0)
      .map((go) => ({
        id: go.id,
        glassOrderNumber: go.glassOrderNumber,
        orderDate: go.orderDate.toISOString(),
        supplier: go.supplier,
        status: go.status,
        items: go.items,
        itemsCount: go.items.length,
      }));
  }

  // ============================================
  // Podsumowanie dnia
  // ============================================

  /**
   * Pobiera podsumowanie dnia dla użytkownika
   */
  async getDaySummary(userId: number, date: Date) {
    const [conflicts, orders, deliveries, glassOrders] = await Promise.all([
      this.countConflicts(userId),
      this.getOrdersForUser(userId, date),
      this.getDeliveriesForUser(userId, date),
      this.getGlassOrdersForUser(userId, date),
    ]);

    return {
      date: date.toISOString().split('T')[0],
      conflicts,
      ordersCount: orders.length,
      deliveriesCount: deliveries.length,
      glassOrdersCount: glassOrders.length,
    };
  }
}
