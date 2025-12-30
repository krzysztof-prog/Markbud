/**
 * Warehouse Service - Business logic layer
 */

import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { prisma } from '../index.js';

export class WarehouseService {
  constructor(private repository: WarehouseRepository) {}

  async getStock(profileId?: number, colorId?: number) {
    return this.repository.getStock(profileId, colorId);
  }

  async updateStock(id: number, currentStockBeams: number) {
    if (currentStockBeams < 0) {
      throw new ValidationError('Stan magazynu nie może być ujemny');
    }

    if (!Number.isFinite(currentStockBeams)) {
      throw new ValidationError('Stan magazynu musi być liczbą skończoną');
    }

    return prisma.$transaction(async (tx) => {
      // Odczytaj aktualny stan z wersją
      const current = await tx.warehouseStock.findUnique({
        where: { id },
        select: { currentStockBeams: true, version: true, profileId: true, colorId: true }
      });

      if (!current) {
        throw new NotFoundError('WarehouseStock');
      }

      // Aktualizuj z optimistic locking
      const updated = await tx.warehouseStock.updateMany({
        where: {
          id,
          version: current.version // Tylko jeśli wersja się nie zmieniła
        },
        data: {
          currentStockBeams,
          version: { increment: 1 }
        }
      });

      if (updated.count === 0) {
        throw new ConflictError('Stan magazynu został zmieniony przez inny proces. Odśwież dane i spróbuj ponownie.');
      }

      // Zapisz historię zmian
      await tx.warehouseHistory.create({
        data: {
          profileId: current.profileId,
          colorId: current.colorId,
          calculatedStock: current.currentStockBeams,
          actualStock: currentStockBeams,
          difference: currentStockBeams - current.currentStockBeams,
          previousStock: current.currentStockBeams,
          currentStock: currentStockBeams,
          changeType: 'manual_update',
          notes: `Aktualizacja stanu: ${current.currentStockBeams} → ${currentStockBeams}`,
          recordedById: null // TODO: Dodać userId z kontekstu
        }
      });

      // Zwróć zaktualizowany obiekt
      return tx.warehouseStock.findUnique({ where: { id } });
    });
  }
}
