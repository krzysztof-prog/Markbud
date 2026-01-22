/**
 * Service dla modułu Steel (wzmocnienia stalowe)
 */
import { SteelRepository } from '../repositories/SteelRepository.js';
import type {
  CreateSteelInput,
  UpdateSteelInput,
  UpdateSteelOrdersInput,
  UpdateSteelStockInput,
} from '../validators/steel.js';
import { AppError } from '../utils/errors.js';

export class SteelService {
  constructor(private repository: SteelRepository) {}

  /**
   * Pobiera wszystkie stale
   */
  async getAll() {
    return this.repository.findAll();
  }

  /**
   * Pobiera stal po ID
   */
  async getById(id: number) {
    const steel = await this.repository.findById(id);
    if (!steel) {
      throw new AppError(`Nie znaleziono stali o ID ${id}`, 404);
    }
    return steel;
  }

  /**
   * Pobiera stal po numerze
   */
  async getByNumber(number: string) {
    return this.repository.findByNumber(number);
  }

  /**
   * Pobiera stal po numerze artykułu
   */
  async getByArticleNumber(articleNumber: string) {
    return this.repository.findByArticleNumber(articleNumber);
  }

  /**
   * Tworzy nową stal
   */
  async create(data: CreateSteelInput) {
    // Walidacja unikalności numeru
    const isNumberUnique = await this.repository.isNumberUnique(data.number);
    if (!isNumberUnique) {
      throw new AppError(`Stal o numerze "${data.number}" już istnieje`, 400);
    }

    // Walidacja unikalności numeru artykułu (jeśli podano)
    if (data.articleNumber) {
      const isArticleUnique = await this.repository.isArticleNumberUnique(
        data.articleNumber
      );
      if (!isArticleUnique) {
        throw new AppError(
          `Stal o numerze artykułu "${data.articleNumber}" już istnieje`,
          400
        );
      }
    }

    return this.repository.create(data);
  }

  /**
   * Aktualizuje stal
   */
  async update(id: number, data: UpdateSteelInput) {
    // Sprawdź czy stal istnieje
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError(`Nie znaleziono stali o ID ${id}`, 404);
    }

    // Walidacja unikalności numeru (jeśli zmieniany)
    if (data.number && data.number !== existing.number) {
      const isNumberUnique = await this.repository.isNumberUnique(data.number, id);
      if (!isNumberUnique) {
        throw new AppError(`Stal o numerze "${data.number}" już istnieje`, 400);
      }
    }

    // Walidacja unikalności numeru artykułu (jeśli zmieniany)
    if (data.articleNumber && data.articleNumber !== existing.articleNumber) {
      const isArticleUnique = await this.repository.isArticleNumberUnique(
        data.articleNumber,
        id
      );
      if (!isArticleUnique) {
        throw new AppError(
          `Stal o numerze artykułu "${data.articleNumber}" już istnieje`,
          400
        );
      }
    }

    return this.repository.update(id, data);
  }

  /**
   * Usuwa stal
   */
  async delete(id: number) {
    // Sprawdź czy stal istnieje
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError(`Nie znaleziono stali o ID ${id}`, 404);
    }

    // Sprawdź czy ma powiązania
    const hasRelations = await this.repository.hasRelations(id);
    if (hasRelations) {
      throw new AppError(
        'Nie można usunąć stali - ma powiązane zamówienia lub zapotrzebowanie',
        400
      );
    }

    return this.repository.delete(id);
  }

  /**
   * Aktualizuje kolejność stali
   */
  async updateOrders(data: UpdateSteelOrdersInput) {
    return this.repository.updateOrders(data.orders);
  }

  /**
   * Pobiera stan magazynowy dla stali
   */
  async getStock(steelId: number) {
    const stock = await this.repository.getStock(steelId);
    if (!stock) {
      throw new AppError(`Nie znaleziono stanu magazynowego dla stali ${steelId}`, 404);
    }
    return stock;
  }

  /**
   * Aktualizuje stan magazynowy
   */
  async updateStock(steelId: number, data: UpdateSteelStockInput, userId?: number) {
    // Sprawdź czy stal istnieje
    const existing = await this.repository.findById(steelId);
    if (!existing) {
      throw new AppError(`Nie znaleziono stali o ID ${steelId}`, 404);
    }

    return this.repository.updateStock(
      steelId,
      data.currentStockBeams,
      data.notes,
      userId
    );
  }

  /**
   * Pobiera wszystkie stale z ich stanem magazynowym (dla widoku magazynu)
   */
  async getAllWithStock() {
    return this.repository.findAllWithStock();
  }

  /**
   * Znajduje lub tworzy stal na podstawie numeru artykułu (dla importu CSV)
   */
  async findOrCreateByArticleNumber(
    articleNumber: string,
    steelNumber: string,
    defaultName?: string
  ) {
    // Najpierw szukaj po numerze artykułu
    let steel = await this.repository.findByArticleNumber(articleNumber);
    if (steel) {
      return steel;
    }

    // Potem po numerze stali
    steel = await this.repository.findByNumber(steelNumber);
    if (steel) {
      return steel;
    }

    // Jeśli nie znaleziono - utwórz nową
    return this.repository.create({
      number: steelNumber,
      articleNumber,
      name: defaultName || `Wzmocnienie ${steelNumber}`,
      sortOrder: 0,
    });
  }

  /**
   * Pobiera historię zmian stanu magazynowego stali
   */
  async getHistory(limit = 100) {
    return this.repository.getHistory(limit);
  }
}
