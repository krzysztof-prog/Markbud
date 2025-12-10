import { PrismaClient } from '@prisma/client';

export class GlassValidationService {
  constructor(private prisma: PrismaClient) {}

  async getDashboard() {
    // Get all unresolved validations for stats
    const allValidations = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
    });

    // Get recent issues with full details
    const recentIssues = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = {
      total: allValidations.length,
      errors: allValidations.filter((v) => v.severity === 'error').length,
      warnings: allValidations.filter((v) => v.severity === 'warning').length,
      info: allValidations.filter((v) => v.severity === 'info').length,
      byType: {} as Record<string, number>,
    };

    allValidations.forEach((v) => {
      stats.byType[v.validationType] = (stats.byType[v.validationType] || 0) + 1;
    });

    return {
      stats,
      recentIssues,
    };
  }

  async getByOrderNumber(orderNumber: string) {
    return this.prisma.glassOrderValidation.findMany({
      where: { orderNumber },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: number, resolvedBy: string, notes?: string) {
    return this.prisma.glassOrderValidation.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        details: notes ? JSON.stringify({ notes }) : undefined,
      },
    });
  }

  async findAll(filters?: { severity?: string; resolved?: boolean }) {
    return this.prisma.glassOrderValidation.findMany({
      where: {
        severity: filters?.severity,
        resolved: filters?.resolved,
      },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
