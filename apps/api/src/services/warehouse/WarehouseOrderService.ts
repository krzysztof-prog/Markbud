import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  WarehouseOrderQuery,
  CreateWarehouseOrderInput,
  UpdateWarehouseOrderInput,
} from '../../validators/warehouse-orders.js';
import { NotFoundError } from '../../utils/errors.js';

// Select dla spójnych odpowiedzi
const warehouseOrderSelect = {
  id: true,
  profileId: true,
  colorId: true,
  orderedBeams: true,
  expectedDeliveryDate: true,
  status: true,
  notes: true,
  createdAt: true,
  profile: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
  color: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  },
} as const;

export class WarehouseOrderService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Pobiera wszystkie zamówienia magazynowe z opcjonalnym filtrowaniem
   */
  async findAll(query: WarehouseOrderQuery) {
    const where: Prisma.WarehouseOrderWhereInput = {};

    if (query.colorId) {
      where.colorId = query.colorId;
    }
    if (query.profileId) {
      where.profileId = query.profileId;
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.warehouseOrder.findMany({
      where,
      select: warehouseOrderSelect,
      orderBy: {
        expectedDeliveryDate: 'asc',
      },
    });
  }

  /**
   * Pobiera pojedyncze zamówienie po ID
   */
  async findById(id: number) {
    const order = await this.prisma.warehouseOrder.findUnique({
      where: { id },
      select: warehouseOrderSelect,
    });

    if (!order) {
      throw new NotFoundError('Zamówienie nie znalezione');
    }

    return order;
  }

  /**
   * Tworzy nowe zamówienie magazynowe
   */
  async create(data: CreateWarehouseOrderInput) {
    return this.prisma.warehouseOrder.create({
      data: {
        profileId: data.profileId,
        colorId: data.colorId,
        orderedBeams: data.orderedBeams,
        expectedDeliveryDate: new Date(data.expectedDeliveryDate),
        notes: data.notes || null,
        status: 'pending',
      },
      select: warehouseOrderSelect,
    });
  }

  /**
   * Aktualizuje zamówienie magazynowe
   * Obsługuje też automatyczną aktualizację stanu magazynu przy zmianie statusu
   */
  async update(id: number, data: UpdateWarehouseOrderInput) {
    // Pobierz istniejące zamówienie
    const existingOrder = await this.prisma.warehouseOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundError('Zamówienie nie znalezione');
    }

    // Wykonaj aktualizację w transakcji
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.WarehouseOrderUpdateInput = {};

      if (data.orderedBeams !== undefined) {
        updateData.orderedBeams = data.orderedBeams;
      }
      if (data.expectedDeliveryDate !== undefined) {
        updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      // Oblicz zmiany wpływające na magazyn
      await this.updateStockIfNeeded(tx, existingOrder, data);

      // Zaktualizuj zamówienie
      return tx.warehouseOrder.update({
        where: { id },
        data: updateData,
        select: warehouseOrderSelect,
      });
    });
  }

  /**
   * Usuwa zamówienie magazynowe
   * Jeśli było odebrane, odejmuje bele z magazynu
   */
  async delete(id: number) {
    const existingOrder = await this.prisma.warehouseOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundError('Zamówienie nie znalezione');
    }

    await this.prisma.$transaction(async (tx) => {
      // Jeśli zamówienie było odebrane, odejmij bele z magazynu
      if (existingOrder.status === 'received') {
        await this.adjustStock(
          tx,
          existingOrder.profileId,
          existingOrder.colorId,
          -existingOrder.orderedBeams
        );
      }

      // Usuń zamówienie
      await tx.warehouseOrder.delete({
        where: { id },
      });
    });
  }

  /**
   * Aktualizuje stan magazynu jeśli zmiana statusu tego wymaga
   */
  private async updateStockIfNeeded(
    tx: Prisma.TransactionClient,
    existingOrder: { profileId: number; colorId: number; orderedBeams: number; status: string },
    updateData: UpdateWarehouseOrderInput
  ) {
    const { status, orderedBeams } = updateData;

    const statusChanged = status !== undefined && status !== existingOrder.status;
    const beamsChanged = orderedBeams !== undefined && orderedBeams !== existingOrder.orderedBeams;
    const isCurrentlyReceived = existingOrder.status === 'received';
    const willBeReceived = status === 'received' || (status === undefined && isCurrentlyReceived);

    // Sprawdź czy potrzebna zmiana magazynu
    if (!(statusChanged || beamsChanged) || !(isCurrentlyReceived || willBeReceived)) {
      return;
    }

    const wasPreviouslyReceived = existingOrder.status === 'received';
    const isNowReceived = status === 'received' || (status === undefined && isCurrentlyReceived);

    let stockDelta = 0;

    // Zmiana statusu z 'received' na inny - ODEJMIJ stare bele
    if (wasPreviouslyReceived && !isNowReceived) {
      stockDelta -= existingOrder.orderedBeams;
    }
    // Zmiana statusu na 'received' - DODAJ nowe bele
    else if (!wasPreviouslyReceived && isNowReceived) {
      const newBeamsCount = orderedBeams !== undefined ? orderedBeams : existingOrder.orderedBeams;
      stockDelta += newBeamsCount;
    }
    // Status pozostaje 'received', ale zmienia się liczba bel
    else if (wasPreviouslyReceived && isNowReceived && beamsChanged) {
      stockDelta = orderedBeams! - existingOrder.orderedBeams;
    }

    if (stockDelta !== 0) {
      await this.adjustStock(
        tx,
        existingOrder.profileId,
        existingOrder.colorId,
        stockDelta
      );
    }
  }

  /**
   * Dostosowuje stan magazynu o podaną deltę
   */
  private async adjustStock(
    tx: Prisma.TransactionClient,
    profileId: number,
    colorId: number,
    delta: number
  ) {
    const warehouseStock = await tx.warehouseStock.findUnique({
      where: {
        profileId_colorId: { profileId, colorId },
      },
    });

    if (warehouseStock) {
      await tx.warehouseStock.update({
        where: { id: warehouseStock.id },
        data: {
          currentStockBeams: warehouseStock.currentStockBeams + delta,
        },
      });
    } else if (delta > 0) {
      // Utwórz nowy rekord tylko jeśli dodajemy bele
      await tx.warehouseStock.create({
        data: {
          profileId,
          colorId,
          currentStockBeams: delta,
        },
      });
    }
  }
}
