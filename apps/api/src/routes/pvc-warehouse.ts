/**
 * PVC Warehouse Routes
 *
 * API dla magazynu PVC/ALU - wszystkie profile i kolory
 * z możliwością filtrowania wg systemów (Living, BLOK, VLAK, CT70, FOCUSING)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';

// Query params schema dla głównego endpointu
const getStockQuerySchema = z.object({
  systems: z.string().optional(), // comma-separated: 'living,blok,vlak'
  colorId: z.coerce.number().optional(),
  search: z.string().optional(),
});

// Query params schema dla zapotrzebowania
const getDemandQuerySchema = z.object({
  systems: z.string().optional(),
  colorId: z.coerce.number().optional(),
});

// Query params schema dla RW
const getRwQuerySchema = z.object({
  systems: z.string().optional(),
  colorId: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
});

// Query params schema dla zamówień Schuco
const getOrdersQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
  search: z.string().optional(),
});

type SystemFilter = {
  isLiving?: boolean;
  isBlok?: boolean;
  isVlak?: boolean;
  isCt70?: boolean;
  isFocusing?: boolean;
};

/**
 * Parsuje string systemów na tablicę filtrów OR dla Prisma
 */
function parseSystemsFilter(systems: string | undefined): SystemFilter[] | undefined {
  if (!systems) return undefined;

  const systemList = systems.split(',').map((s) => s.trim().toLowerCase());
  const validSystems = ['living', 'blok', 'vlak', 'ct70', 'focusing'];
  const filtered = systemList.filter((s) => validSystems.includes(s));

  if (filtered.length === 0) return undefined;

  // Buduj OR warunki
  return filtered.map((system) => {
    switch (system) {
      case 'living':
        return { isLiving: true };
      case 'blok':
        return { isBlok: true };
      case 'vlak':
        return { isVlak: true };
      case 'ct70':
        return { isCt70: true };
      case 'focusing':
        return { isFocusing: true };
      default:
        return {};
    }
  });
}

export async function pvcWarehouseRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/pvc-warehouse
   * Pobiera stan magazynowy profili z filtrami
   */
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof getStockQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = getStockQuerySchema.parse(request.query);
      const systemsFilter = parseSystemsFilter(query.systems);

      // Pobierz wszystkie kolory (dla sidebara)
      const colors = await prisma.color.findMany({
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          hexColor: true,
          type: true,
        },
      });

      // Buduj where dla profili
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileWhere: any = {};

      // Filtr systemów
      if (systemsFilter && systemsFilter.length > 0) {
        profileWhere.OR = systemsFilter;
      }

      // Filtr wyszukiwania
      if (query.search) {
        const searchTerm = query.search;
        const searchConditions = [
          { number: { contains: searchTerm } },
          { name: { contains: searchTerm } },
        ];

        if (profileWhere.OR) {
          // Mamy już systemsFilter - dodaj AND
          profileWhere.AND = [{ OR: searchConditions }];
        } else {
          profileWhere.OR = searchConditions;
        }
      }

      // Pobierz profile z WarehouseStock
      const profiles = await prisma.profile.findMany({
        where: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
        orderBy: { number: 'asc' },
        include: {
          warehouseStock: query.colorId
            ? {
                where: { colorId: query.colorId },
                include: {
                  color: {
                    select: { id: true, code: true, name: true, hexColor: true },
                  },
                },
              }
            : {
                include: {
                  color: {
                    select: { id: true, code: true, name: true, hexColor: true },
                  },
                },
              },
        },
      });

      // Mapuj dane do formatu odpowiedzi
      const profilesWithStock = profiles.map((profile) => ({
        id: profile.id,
        number: profile.number,
        name: profile.name,
        articleNumber: profile.articleNumber,
        systems: {
          isLiving: profile.isLiving,
          isBlok: profile.isBlok,
          isVlak: profile.isVlak,
          isCt70: profile.isCt70,
          isFocusing: profile.isFocusing,
        },
        stocks: profile.warehouseStock.map((stock) => ({
          id: stock.id,
          colorId: stock.colorId,
          color: stock.color,
          initialStockBeams: stock.initialStockBeams,
          currentStockBeams: stock.currentStockBeams,
          difference: stock.currentStockBeams - stock.initialStockBeams,
        })),
      }));

      // Oblicz totale
      let totalBeams = 0;
      let totalProfiles = 0;
      for (const profile of profilesWithStock) {
        if (profile.stocks.length > 0) {
          totalProfiles++;
          for (const stock of profile.stocks) {
            totalBeams += stock.currentStockBeams;
          }
        }
      }

      return reply.send({
        profiles: profilesWithStock,
        colors,
        totals: {
          totalBeams,
          totalProfiles,
          totalPositions: profilesWithStock.reduce((acc, p) => acc + p.stocks.length, 0),
        },
      });
    }
  );

  /**
   * GET /api/pvc-warehouse/demand
   * Pobiera zapotrzebowanie na profile (z OrderRequirement)
   */
  fastify.get(
    '/demand',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof getDemandQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = getDemandQuerySchema.parse(request.query);
      const systemsFilter = parseSystemsFilter(query.systems);

      // Buduj where dla profili
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileWhere: any = systemsFilter && systemsFilter.length > 0 ? { OR: systemsFilter } : {};

      // Pobierz zapotrzebowanie z aktywnych zleceń - bez filtra profile w where
      // (filtrujemy później, bo Prisma ma problem z nested filters)
      const requirements = await prisma.orderRequirement.findMany({
        where: {
          order: {
            status: { in: ['new', 'in_progress'] },
          },
          ...(query.colorId ? { colorId: query.colorId } : {}),
        },
        select: {
          id: true,
          profileId: true,
          colorId: true,
          beamsCount: true,
          orderId: true,
        },
      });

      // Pobierz powiązane profile
      const profileIds = [...new Set(requirements.map((r) => r.profileId))];
      const profiles = await prisma.profile.findMany({
        where: {
          id: { in: profileIds },
          ...(Object.keys(profileWhere).length > 0 ? profileWhere : {}),
        },
        select: {
          id: true,
          number: true,
          name: true,
          isLiving: true,
          isBlok: true,
          isVlak: true,
          isCt70: true,
          isFocusing: true,
        },
      });
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const validProfileIds = new Set(profiles.map((p) => p.id));

      // Pobierz powiązane kolory
      const colorIds = [...new Set(requirements.map((r) => r.colorId).filter((id): id is number => id !== null))];
      const colors = await prisma.color.findMany({
        where: { id: { in: colorIds } },
        select: { id: true, code: true, name: true, hexColor: true },
      });
      const colorMap = new Map(colors.map((c) => [c.id, c]));

      // Pobierz powiązane zlecenia
      const orderIds = [...new Set(requirements.map((r) => r.orderId))];
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, status: true },
      });
      const orderMap = new Map(orders.map((o) => [o.id, o]));

      // Filtruj requirements tylko dla valid profiles (po system filter)
      const filteredRequirements = requirements.filter((r) => validProfileIds.has(r.profileId));

      // Grupuj zapotrzebowanie wg profilu i koloru
      const demandMap = new Map<
        string,
        {
          profile: typeof profiles[0];
          color: typeof colors[0] | null;
          totalBeams: number;
          orders: Array<{ id: number; number: string; beams: number }>;
        }
      >();

      for (const req of filteredRequirements) {
        const key = `${req.profileId}-${req.colorId}`;
        const existing = demandMap.get(key);
        const order = orderMap.get(req.orderId);

        if (existing && order) {
          existing.totalBeams += req.beamsCount;
          existing.orders.push({
            id: order.id,
            number: order.orderNumber,
            beams: req.beamsCount,
          });
        } else if (order) {
          const profile = profileMap.get(req.profileId);
          const color = req.colorId ? colorMap.get(req.colorId) : null;
          if (profile) {
            demandMap.set(key, {
              profile,
              color: color || null,
              totalBeams: req.beamsCount,
              orders: [
                {
                  id: order.id,
                  number: order.orderNumber,
                  beams: req.beamsCount,
                },
              ],
            });
          }
        }
      }

      const demand = Array.from(demandMap.values());

      // Oblicz totale
      const totalBeams = demand.reduce((acc, d) => acc + d.totalBeams, 0);
      const uniqueOrderIds = new Set(filteredRequirements.map((r) => r.orderId));

      return reply.send({
        demand,
        totals: {
          totalBeams,
          totalPositions: demand.length,
          totalOrders: uniqueOrderIds.size,
        },
      });
    }
  );

  /**
   * GET /api/pvc-warehouse/rw
   * Pobiera RW (zużycie wewnętrzne) - profile ze zleceń ukończonych w danym miesiącu
   */
  fastify.get(
    '/rw',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof getRwQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = getRwQuerySchema.parse(request.query);
      const systemsFilter = parseSystemsFilter(query.systems);

      // Domyślnie aktualny miesiąc
      const now = new Date();
      const month = query.month ?? now.getMonth() + 1;
      const year = query.year ?? now.getFullYear();

      // Oblicz zakres dat dla miesiąca
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Buduj where dla profili
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileWhere: any = systemsFilter && systemsFilter.length > 0 ? { OR: systemsFilter } : {};

      // Pobierz RW z OrderRequirement - profile ze zleceń ukończonych w danym miesiącu
      // Preferujemy completedAt, ale używamy updatedAt jako fallback dla starych rekordów
      const requirements = await prisma.orderRequirement.findMany({
        where: {
          order: {
            // Zlecenie ukończone (status = completed)
            status: 'completed',
            // completedAt w zakresie LUB (completedAt jest null i updatedAt w zakresie)
            OR: [
              {
                completedAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                completedAt: null,
                updatedAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            ],
          },
          profile: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
          ...(query.colorId ? { colorId: query.colorId } : {}),
        },
        include: {
          profile: {
            select: {
              id: true,
              number: true,
              name: true,
              isLiving: true,
              isBlok: true,
              isVlak: true,
              isCt70: true,
              isFocusing: true,
            },
          },
          color: {
            select: { id: true, code: true, name: true, hexColor: true },
          },
          privateColor: {
            select: { id: true, name: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              completedAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { order: { updatedAt: 'desc' } },
      });

      // Grupuj wg profilu i koloru
      const rwMap = new Map<
        string,
        {
          profile: (typeof requirements)[0]['profile'];
          color: (typeof requirements)[0]['color'] | null;
          privateColor: (typeof requirements)[0]['privateColor'] | null;
          totalBeams: number;
          orders: Array<{
            id: number;
            number: string;
            beams: number;
            completedAt: Date | null;
          }>;
        }
      >();

      for (const req of requirements) {
        const colorKey = req.colorId ?? `private-${req.privateColorId}`;
        const key = `${req.profileId}-${colorKey}`;
        const existing = rwMap.get(key);

        if (existing) {
          existing.totalBeams += req.beamsCount;
          existing.orders.push({
            id: req.order.id,
            number: req.order.orderNumber,
            beams: req.beamsCount,
            completedAt: req.order.completedAt,
          });
        } else {
          rwMap.set(key, {
            profile: req.profile,
            color: req.color,
            privateColor: req.privateColor,
            totalBeams: req.beamsCount,
            orders: [
              {
                id: req.order.id,
                number: req.order.orderNumber,
                beams: req.beamsCount,
                completedAt: req.order.completedAt,
              },
            ],
          });
        }
      }

      const rw = Array.from(rwMap.values());

      // Oblicz totale
      const totalBeams = rw.reduce((acc, r) => acc + r.totalBeams, 0);
      const uniqueOrderIds = new Set(requirements.map((r) => r.orderId));

      return reply.send({
        rw,
        period: {
          month,
          year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totals: {
          totalBeams,
          totalPositions: rw.length,
          totalOrders: uniqueOrderIds.size,
        },
      });
    }
  );

  /**
   * GET /api/pvc-warehouse/colors
   * Pobiera wszystkie kolory (dla sidebara)
   */
  fastify.get('/colors', async (_request: FastifyRequest, reply: FastifyReply) => {
    const colors = await prisma.color.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        hexColor: true,
        type: true,
      },
    });

    return reply.send({ colors });
  });

  /**
   * GET /api/pvc-warehouse/systems
   * Pobiera statystyki systemów (ile profili w każdym)
   */
  fastify.get('/systems', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [living, blok, vlak, ct70, focusing, total] = await Promise.all([
      prisma.profile.count({ where: { isLiving: true } }),
      prisma.profile.count({ where: { isBlok: true } }),
      prisma.profile.count({ where: { isVlak: true } }),
      prisma.profile.count({ where: { isCt70: true } }),
      prisma.profile.count({ where: { isFocusing: true } }),
      prisma.profile.count(),
    ]);

    return reply.send({
      systems: {
        living: { name: 'Living', count: living },
        blok: { name: 'BLOK', count: blok },
        vlak: { name: 'VLAK', count: vlak },
        ct70: { name: 'CT70', count: ct70 },
        focusing: { name: 'FOCUSING', count: focusing },
      },
      totalProfiles: total,
    });
  });

  /**
   * GET /api/pvc-warehouse/orders
   * Pobiera zamówione profile z Schuco dla danego miesiąca
   * Źródło: SchucoOrderItem.deliveryDate
   */
  fastify.get(
    '/orders',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof getOrdersQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = getOrdersQuerySchema.parse(request.query);

      // Domyślnie aktualny miesiąc
      const now = new Date();
      const month = query.month ?? now.getMonth() + 1;
      const year = query.year ?? now.getFullYear();

      // Oblicz zakres dat dla miesiąca
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Pobierz pozycje zamówień Schuco które FAKTYCZNIE zostały wysłane (shippedQty > 0)
      // w danym miesiącu (wg deliveryDate)
      const items = await prisma.schucoOrderItem.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
          // Tylko pozycje które zostały wysłane
          shippedQty: { gt: 0 },
          ...(query.search
            ? {
                OR: [
                  { articleNumber: { contains: query.search } },
                  { articleDescription: { contains: query.search } },
                ],
              }
            : {}),
        },
        include: {
          schucoDelivery: {
            select: {
              id: true,
              orderNumber: true,
              orderName: true,
              projectNumber: true,
              shippingStatus: true,
              orderDate: true,
            },
          },
        },
        orderBy: [{ deliveryDate: 'asc' }, { position: 'asc' }],
      });

      // Grupuj wg tygodnia dostawy
      const weeklyGroups = new Map<
        string,
        {
          weekStart: Date;
          weekLabel: string;
          items: typeof items;
          totalOrdered: number;
          totalShipped: number;
        }
      >();

      for (const item of items) {
        if (!item.deliveryDate) continue;

        // Oblicz poniedziałek tygodnia
        const date = new Date(item.deliveryDate);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const weekKey = monday.toISOString().split('T')[0];
        const weekNum = getWeekNumber(monday);
        const weekLabel = `Tydzień ${weekNum} (${formatDate(monday)})`;

        const existing = weeklyGroups.get(weekKey);
        if (existing) {
          existing.items.push(item);
          existing.totalOrdered += item.orderedQty;
          existing.totalShipped += item.shippedQty;
        } else {
          weeklyGroups.set(weekKey, {
            weekStart: monday,
            weekLabel,
            items: [item],
            totalOrdered: item.orderedQty,
            totalShipped: item.shippedQty,
          });
        }
      }

      // Konwertuj do tablicy i posortuj
      const weeks = Array.from(weeklyGroups.values()).sort(
        (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
      );

      // Oblicz totale
      const totalOrdered = items.reduce((acc, item) => acc + item.orderedQty, 0);
      const totalShipped = items.reduce((acc, item) => acc + item.shippedQty, 0);
      const uniqueOrders = new Set(items.map((item) => item.schucoDeliveryId));

      return reply.send({
        weeks,
        items, // Płaska lista dla szczegółów
        period: {
          month,
          year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totals: {
          totalItems: items.length,
          totalOrdered,
          totalShipped,
          totalOrders: uniqueOrders.size,
        },
      });
    }
  );
}

/**
 * Oblicza numer tygodnia ISO
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Formatuje datę do postaci DD.MM
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}
