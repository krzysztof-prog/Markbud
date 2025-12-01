/**
 * Warehouse Service - Business logic layer
 */

import { WarehouseRepository } from '../repositories/WarehouseRepository.js';

export class WarehouseService {
  constructor(private repository: WarehouseRepository) {}

  async getStock(profileId?: number, colorId?: number) {
    return this.repository.getStock(profileId, colorId);
  }

  async updateStock(id: number, currentStockBeams: number) {
    return this.repository.updateStock(id, currentStockBeams);
  }
}
