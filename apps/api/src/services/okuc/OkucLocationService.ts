/**
 * OkucLocationService - Business logic layer for warehouse location management
 * Przeniesiono logike biznesowa z locationHandler.ts
 */

import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';
import type { CreateOkucLocationInput, UpdateOkucLocationInput } from '../../validators/okuc-location.js';

interface LocationWithCount {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  articlesCount: number;
}

export class OkucLocationService {
  /**
   * Pobierz liste wszystkich aktywnych lokalizacji (bez deletedAt)
   * Posortowane po sortOrder, potem po nazwie
   * Zawiera liczbe artykulow przypisanych do kazdej lokalizacji
   */
  async getAllLocations(): Promise<LocationWithCount[]> {
    const locations = await prisma.okucLocation.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    // Mapuj wyniki aby zwrocic articlesCount zamiast _count
    const result = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      sortOrder: loc.sortOrder,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
      articlesCount: loc._count.articles,
    }));

    logger.debug('Found locations', { count: result.length });
    return result;
  }

  /**
   * Pobierz lokalizacje po ID
   */
  async getLocationById(id: number) {
    const location = await prisma.okucLocation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundError('Location');
    }

    return {
      ...location,
      articlesCount: location._count.articles,
    };
  }

  /**
   * Stworz nowa lokalizacje
   */
  async createLocation(data: CreateOkucLocationInput) {
    const location = await prisma.okucLocation.create({
      data,
    });

    logger.info('Created location', { id: location.id, name: location.name });
    return location;
  }

  /**
   * Zaktualizuj lokalizacje
   */
  async updateLocation(id: number, data: UpdateOkucLocationInput) {
    // Sprawdz czy lokalizacja istnieje i nie jest usunieta
    const existing = await prisma.okucLocation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('Location');
    }

    const location = await prisma.okucLocation.update({
      where: { id },
      data,
    });

    logger.info('Updated location', { id, name: location.name });
    return location;
  }

  /**
   * Usun lokalizacje (soft delete)
   */
  async deleteLocation(id: number) {
    // Sprawdz czy lokalizacja istnieje i nie jest juz usunieta
    const existing = await prisma.okucLocation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('Location');
    }

    await prisma.okucLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info('Deleted location (soft)', { id, name: existing.name });
    return true;
  }

  /**
   * Zmien kolejnosc lokalizacji
   * Przyjmuje tablice IDs w nowej kolejnosci
   */
  async reorderLocations(ids: number[]) {
    // Aktualizuj sortOrder dla kazdej lokalizacji zgodnie z kolejnoscia w tablicy
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.okucLocation.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    logger.info('Reordered locations', { ids });

    // Zwroc zaktualizowana liste
    const locations = await prisma.okucLocation.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return locations;
  }
}
