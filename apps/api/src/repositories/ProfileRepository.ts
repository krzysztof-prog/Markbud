/**
 * Profile Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';
import type { Profile } from '@prisma/client';

export class ProfileRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
    });
  }

  async findById(id: number) {
    return this.prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        name: true,
        description: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        profileColors: {
          select: {
            profileId: true,
            colorId: true,
            isVisible: true,
            color: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                hexColor: true,
              },
            },
          },
        },
      },
    });
  }

  async findByNumber(number: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { number },
    });
  }

  async create(data: { number: string; name: string; description?: string }): Promise<Profile> {
    return this.prisma.profile.create({
      data,
    });
  }

  async update(id: number, data: { name?: string; description?: string }): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.profile.delete({
      where: { id },
    });
  }

  async updateProfileOrders(profileOrders: { id: number; sortOrder: number }[]): Promise<void> {
    // Use transaction to update all profiles atomically
    await this.prisma.$transaction(
      profileOrders.map((order) =>
        this.prisma.profile.update({
          where: { id: order.id },
          data: { sortOrder: order.sortOrder },
        })
      )
    );
  }
}
