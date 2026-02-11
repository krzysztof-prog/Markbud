/**
 * Production Report Repository - Database access layer
 * Obsługuje raporty miesięczne produkcji i ich pozycje
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

// Typy dla danych aktualizacji raportu
export interface ProductionReportUpdateData {
  atypicalWindows?: number;
  atypicalUnits?: number;
  atypicalSashes?: number;
  atypicalValuePln?: number;
  atypicalCurrency?: string;
  atypicalNotes?: string | null;
}

// Typy dla danych pozycji raportu
export interface ProductionReportItemData {
  overrideWindows?: number | null;
  overrideUnits?: number | null;
  overrideSashes?: number | null;
  overrideValuePln?: number | null;
  overrideValueEur?: number | null; // w centach
  rwOkucia?: boolean;
  rwProfile?: boolean;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
}

export class ProductionReportRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Znajdź raport dla danego roku i miesiąca
   * @param year Rok (np. 2026)
   * @param month Miesiąc (1-12)
   */
  async findByYearMonth(year: number, month: number) {
    return this.prisma.productionReport.findUnique({
      where: {
        year_month: { year, month },
      },
      include: {
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        reopenedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                valuePln: true,
                valueEur: true,
                totalWindows: true,
                totalSashes: true,
                productionDate: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Utwórz nowy pusty raport dla miesiąca
   * @param year Rok (np. 2026)
   * @param month Miesiąc (1-12)
   */
  async create(year: number, month: number) {
    return this.prisma.productionReport.create({
      data: {
        year,
        month,
        status: 'open',
      },
      include: {
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        reopenedBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });
  }

  /**
   * Znajdź raport lub utwórz nowy jeśli nie istnieje
   * @param year Rok (np. 2026)
   * @param month Miesiąc (1-12)
   */
  async findOrCreate(year: number, month: number) {
    // Najpierw sprawdź czy istnieje
    const existing = await this.findByYearMonth(year, month);
    if (existing) {
      return existing;
    }

    // Utwórz nowy raport
    return this.create(year, month);
  }

  /**
   * Aktualizuj raport (np. wartości nietypówek)
   * @param id ID raportu
   * @param data Dane do aktualizacji
   */
  async update(id: number, data: ProductionReportUpdateData) {
    return this.prisma.productionReport.update({
      where: { id },
      data,
      include: {
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        reopenedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                valuePln: true,
                valueEur: true,
                totalWindows: true,
                totalSashes: true,
                productionDate: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Pobierz zlecenia ukończone w danym miesiącu
   * Zwraca zlecenia z productionDate w zakresie miesiąca i statusem 'completed'
   * Include windows do obliczenia units (suma quantity)
   * @param year Rok (np. 2026)
   * @param month Miesiąc (1-12)
   */
  async getCompletedOrdersForMonth(year: number, month: number) {
    // Oblicz zakres dat dla miesiąca (month jest 1-indexed: 1 = styczeń)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.prisma.order.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
        archivedAt: null, // Wykluczamy zarchiwizowane
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        system: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        productionDate: true,
        completedAt: true,
        invoiceNumber: true,
        createdAt: true,
        specialType: true,
        // Wartości z materiałówki do obliczeń współczynników
        windowsNetValue: true,
        windowsMaterial: true,
        // Windows do obliczenia units
        windows: {
          select: {
            id: true,
            quantity: true,
          },
        },
        // Materials do obliczenia sumy glassQuantity i rozbicia materiałów
        materials: {
          select: {
            glassQuantity: true,
            glazing: true,
            fittings: true,
            parts: true,
          },
        },
        // Kolory profili - do oznaczenia zleceń z kolorem 999
        requirements: {
          select: {
            color: {
              select: { code: true },
            },
          },
          where: {
            colorId: { not: null },
          },
        },
        // Dostawy - pobieramy datę dostawy przez relację DeliveryOrder
        deliveryOrders: {
          select: {
            delivery: {
              select: {
                id: true,
                deliveryDate: true,
              },
            },
          },
          where: {
            delivery: {
              deletedAt: null, // Tylko aktywne dostawy
            },
          },
          take: 1, // Bierzemy pierwszą (najczęściej jest jedna)
          orderBy: {
            delivery: {
              deliveryDate: 'desc', // Najnowsza jeśli wiele
            },
          },
        },
      },
      orderBy: { productionDate: 'asc' },
    });
  }

  /**
   * Znajdź pozycję raportu dla zlecenia
   * @param reportId ID raportu
   * @param orderId ID zlecenia
   */
  async findReportItem(reportId: number, orderId: number) {
    return this.prisma.productionReportItem.findUnique({
      where: {
        reportId_orderId: { reportId, orderId },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            client: true,
            project: true,
            valuePln: true,
            valueEur: true,
            totalWindows: true,
            totalSashes: true,
            productionDate: true,
            invoiceNumber: true,
          },
        },
      },
    });
  }

  /**
   * Wstaw lub aktualizuj pozycję raportu
   * @param reportId ID raportu
   * @param orderId ID zlecenia
   * @param data Dane pozycji
   */
  async upsertReportItem(
    reportId: number,
    orderId: number,
    data: ProductionReportItemData
  ) {
    return this.prisma.productionReportItem.upsert({
      where: {
        reportId_orderId: { reportId, orderId },
      },
      create: {
        reportId,
        orderId,
        ...data,
      },
      update: data,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            client: true,
            project: true,
            valuePln: true,
            valueEur: true,
            totalWindows: true,
            totalSashes: true,
            productionDate: true,
            invoiceNumber: true,
          },
        },
      },
    });
  }

  /**
   * Aktualizuj dane faktury dla pozycji raportu
   * @param reportId ID raportu
   * @param orderId ID zlecenia
   * @param invoiceNumber Numer faktury
   * @param invoiceDate Data faktury (może być null)
   */
  async updateInvoice(
    reportId: number,
    orderId: number,
    invoiceNumber: string | null,
    invoiceDate: Date | null
  ) {
    return this.prisma.productionReportItem.upsert({
      where: {
        reportId_orderId: { reportId, orderId },
      },
      create: {
        reportId,
        orderId,
        invoiceNumber,
        invoiceDate,
      },
      update: {
        invoiceNumber,
        invoiceDate,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            client: true,
            project: true,
            valuePln: true,
            valueEur: true,
            totalWindows: true,
            totalSashes: true,
            productionDate: true,
            invoiceNumber: true,
          },
        },
      },
    });
  }

  /**
   * Zamknij miesiąc - blokuje edycję pozycji (oprócz FV)
   * @param id ID raportu
   * @param userId ID użytkownika zamykającego
   */
  async closeMonth(id: number, userId: number) {
    return this.prisma.productionReport.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedById: userId,
      },
      include: {
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        reopenedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                valuePln: true,
                valueEur: true,
                totalWindows: true,
                totalSashes: true,
                productionDate: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Odblokuj miesiąc - pozwala na ponowną edycję
   * Ustawia editedAfterClose=true jako znacznik że raport był edytowany po zamknięciu
   * @param id ID raportu
   * @param userId ID użytkownika otwierającego
   */
  async reopenMonth(id: number, userId: number) {
    return this.prisma.productionReport.update({
      where: { id },
      data: {
        status: 'open',
        editedAfterClose: true,
        reopenedAt: new Date(),
        reopenedById: userId,
      },
      include: {
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        reopenedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                valuePln: true,
                valueEur: true,
                totalWindows: true,
                totalSashes: true,
                productionDate: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Policz dni robocze w danym miesiącu
   * Zlicza dni z tabeli WorkingDay gdzie isWorking=true
   * @param year Rok (np. 2026)
   * @param month Miesiąc (1-12)
   */
  async getWorkingDaysCount(year: number, month: number): Promise<number> {
    // Oblicz zakres dat dla miesiąca (month jest 1-indexed)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const count = await this.prisma.workingDay.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        isWorking: true,
      },
    });

    return count;
  }
}

// Eksportuj instancję z domyślnym klientem Prisma
export const productionReportRepository = new ProductionReportRepository(prisma);
