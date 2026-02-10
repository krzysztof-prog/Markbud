/**
 * PVC Warehouse Routes
 *
 * API dla magazynu PVC/ALU - wszystkie profile i kolory
 * z możliwością filtrowania wg systemów (Living, BLOK, VLAK, CT70, FOCUSING)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { formatDateWarsaw } from '../utils/date-helpers.js';
import { articleNumberParser } from '../services/parsers/ArticleNumberParser.js';

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

      // Buduj where dla profili (system + search)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileWhere: any = {};
      if (systemsFilter && systemsFilter.length > 0) {
        profileWhere.OR = systemsFilter;
      }
      if (query.search) {
        const searchConditions = [
          { number: { contains: query.search } },
          { name: { contains: query.search } },
        ];
        if (profileWhere.OR) {
          profileWhere.AND = [{ OR: searchConditions }];
        } else {
          profileWhere.OR = searchConditions;
        }
      }
      const hasProfileWhere = Object.keys(profileWhere).length > 0;

      // 8 równoczesnych zapytań do bazy
      const [
        sidebarColors,
        allProfiles,
        warehouseStocks,
        schucoItems,
        rwRequirements,
        demandRequirements,
        privateColors,
        palletConfigs,
      ] = await Promise.all([
        // 1. Kolory do sidebara
        prisma.color.findMany({
          orderBy: { code: 'asc' },
          select: { id: true, code: true, name: true, hexColor: true, type: true },
        }),

        // 2. Wszystkie profile PVC (z filtrem systemów)
        prisma.profile.findMany({
          where: hasProfileWhere ? profileWhere : undefined,
          select: {
            id: true, number: true, name: true, articleNumber: true,
            isLiving: true, isBlok: true, isVlak: true, isCt70: true, isFocusing: true,
          },
        }),

        // 3. Stany magazynowe (remanent + data remanentu)
        prisma.warehouseStock.findMany({
          where: {
            deletedAt: null,
            ...(query.colorId ? { colorId: query.colorId } : {}),
          },
          select: {
            profileId: true, colorId: true, currentStockBeams: true, remanentDate: true,
            color: { select: { id: true, code: true, name: true, hexColor: true } },
          },
        }),

        // 4. Pozycje zamówień Schuco (dostawy + zamówione) + numer zamówienia + jednostka + status
        prisma.schucoOrderItem.findMany({
          where: {
            schucoDelivery: {
              shippingStatus: { not: 'Zlecenie anulowane' },
              archivedAt: null,
            },
          },
          select: {
            articleNumber: true, shippedQty: true, orderedQty: true, createdAt: true,
            unit: true,
            schucoDelivery: { select: { orderNumber: true, shippingStatus: true, deliveryDate: true } },
          },
        }),

        // 5. RW - OrderRequirement ze zleceń ukończonych + numer zlecenia
        // Używamy productionDate z fallback na completedAt (dla starszych zleceń)
        prisma.orderRequirement.findMany({
          where: { order: { status: 'completed' } },
          select: {
            profileId: true, colorId: true, privateColorId: true, beamsCount: true, meters: true,
            order: { select: { orderNumber: true, productionDate: true, completedAt: true, updatedAt: true } },
          },
        }),

        // 6. Zapotrzebowanie - OrderRequirement z aktywnych zleceń (BEZ filtra daty) + numer zlecenia
        prisma.orderRequirement.findMany({
          where: { order: { status: { in: ['new', 'in_progress'] } } },
          select: {
            profileId: true, colorId: true, privateColorId: true, beamsCount: true, meters: true,
            order: { select: { orderNumber: true } },
          },
        }),

        // 7. Prywatne kolory (lookup)
        prisma.privateColor.findMany({
          select: { id: true, code: true, name: true },
        }),

        // 8. Przeliczniki palet na bele (profileId -> beamsPerPallet)
        prisma.profilePalletConfig.findMany({
          select: { profileId: true, beamsPerPallet: true },
        }),
      ]);

      // --- Buduj mapy lookup ---
      const profileByNumber = new Map(allProfiles.map((p) => [p.number, p]));
      const validProfileIds = new Set(allProfiles.map((p) => p.id));

      // Mapa kolorów po code (z sidebara - pełna lista kolorów)
      const colorByCode = new Map(sidebarColors.map((c) => [c.code, c]));
      const colorById = new Map(sidebarColors.map((c) => [c.id, c]));

      const privateColorById = new Map(privateColors.map((pc) => [pc.id, pc]));

      // Mapa przeliczników palet: profileId -> beamsPerPallet
      const palletConfigMap = new Map(palletConfigs.map((pc) => [pc.profileId, pc.beamsPerPallet]));

      // Mapa daty remanentu: "profileId-colorId" -> Date
      // Używamy remanentDate (ustawiane ręcznie podczas inwentaryzacji)
      const remanentDateMap = new Map<string, Date>();
      for (const ws of warehouseStocks) {
        if (ws.remanentDate) {
          remanentDateMap.set(`${ws.profileId}-${ws.colorId}`, ws.remanentDate);
        }
      }

      // --- Typ wiersza agregacji ---
      interface AggDetailItem {
        label: string;   // np. numer zlecenia lub numer dostawy
        beams: number;
      }

      interface AggRow {
        profileId: number;
        colorId: number | null;
        privateColorId: number | null;
        initialStockBeams: number;
        deliveriesBeams: number;
        rwBeams: number;
        rwMeters: number;
        orderedBeams: number;
        demandBeams: number;
        demandMeters: number;
        // Nieprzeliczone palety (brak przelicznika w konfiguracji)
        palletDeliveriesRaw: number;
        palletOrderedRaw: number;
        // Szczegóły do tooltipów
        deliveriesDetails: AggDetailItem[];
        rwDetails: AggDetailItem[];
        demandDetails: AggDetailItem[];
      }

      // Mapa agregacji: klucz -> AggRow
      const aggMap = new Map<string, AggRow>();

      function getAggKey(profileId: number, colorId: number | null, privateColorId: number | null): string {
        if (privateColorId != null) return `${profileId}-p${privateColorId}`;
        return `${profileId}-c${colorId}`;
      }

      function getOrCreate(profileId: number, colorId: number | null, privateColorId: number | null): AggRow {
        const key = getAggKey(profileId, colorId, privateColorId);
        let row = aggMap.get(key);
        if (!row) {
          row = {
            profileId, colorId, privateColorId,
            initialStockBeams: 0, deliveriesBeams: 0, rwBeams: 0, rwMeters: 0,
            orderedBeams: 0, demandBeams: 0, demandMeters: 0,
            palletDeliveriesRaw: 0, palletOrderedRaw: 0,
            deliveriesDetails: [], rwDetails: [], demandDetails: [],
          };
          aggMap.set(key, row);
        }
        return row;
      }

      // --- 1. WarehouseStock -> initial stock ---
      for (const ws of warehouseStocks) {
        if (!validProfileIds.has(ws.profileId)) continue;
        const row = getOrCreate(ws.profileId, ws.colorId, null);
        row.initialStockBeams = ws.currentStockBeams;
      }

      // --- 2. Schuco items -> dostawy + zamówione ---
      for (const item of schucoItems) {
        if (!item.articleNumber) continue;
        // Pomijaj stal
        if (articleNumberParser.isSteel(item.articleNumber)) continue;
        // Sprawdź format (8 cyfr, opcjonalnie "p")
        const cleaned = item.articleNumber.replace(/p$/i, '').trim();
        if (!/^\d{8}$/.test(cleaned)) continue;

        const parsed = articleNumberParser.parse(item.articleNumber);
        const profile = profileByNumber.get(parsed.profileNumber);
        if (!profile) continue;
        if (!validProfileIds.has(profile.id)) continue;

        const color = colorByCode.get(parsed.colorCode);
        if (!color) continue;

        // Filtr koloru z query
        if (query.colorId && color.id !== query.colorId) continue;

        // Sprawdź datę remanentu - używaj daty dostawy (nie daty utworzenia rekordu)
        const remanentDate = remanentDateMap.get(`${profile.id}-${color.id}`);
        const deliveryDate = item.schucoDelivery?.deliveryDate;
        if (remanentDate && deliveryDate && deliveryDate < remanentDate) continue;

        const row = getOrCreate(profile.id, color.id, null);
        const isPallet = item.unit?.toLowerCase().includes('palet') ?? false;
        const beamsPerPallet = palletConfigMap.get(profile.id);
        const isFullyDelivered = item.schucoDelivery?.shippingStatus === 'Całkowicie dostarczone';

        // Dostawy - tylko pozycje ze statusem "Całkowicie dostarczone"
        if (isFullyDelivered && item.shippedQty > 0) {
          if (isPallet && beamsPerPallet) {
            // Przelicz palety na bele
            const beams = item.shippedQty * beamsPerPallet;
            row.deliveriesBeams += beams;
            row.deliveriesDetails.push({
              label: `${item.schucoDelivery?.orderNumber ?? item.articleNumber} (${item.shippedQty} pal × ${beamsPerPallet})`,
              beams,
            });
          } else if (isPallet && !beamsPerPallet) {
            // Brak przelicznika - zachowaj jako surowe palety
            row.palletDeliveriesRaw += item.shippedQty;
            row.deliveriesDetails.push({
              label: `${item.schucoDelivery?.orderNumber ?? item.articleNumber} (${item.shippedQty} pal - brak przelicznika)`,
              beams: 0,
            });
          } else {
            // Jednostka to sztuki/bele - bez przeliczania
            row.deliveriesBeams += item.shippedQty;
            row.deliveriesDetails.push({
              label: item.schucoDelivery?.orderNumber ?? item.articleNumber,
              beams: item.shippedQty,
            });
          }
        }

        // Zamówione - wszystkie (anulowane już odfiltrowane w query)
        if (isPallet && beamsPerPallet) {
          row.orderedBeams += item.orderedQty * beamsPerPallet;
        } else if (isPallet && !beamsPerPallet) {
          row.palletOrderedRaw += item.orderedQty;
        } else {
          row.orderedBeams += item.orderedQty;
        }
      }

      // --- 3. RW (ukończone zlecenia) ---
      for (const req of rwRequirements) {
        if (!validProfileIds.has(req.profileId)) continue;

        // Filtr koloru z query (dla standardowych kolorów)
        if (query.colorId && req.colorId !== query.colorId && req.privateColorId != null) continue;
        if (query.colorId && req.colorId !== null && req.colorId !== query.colorId) continue;

        // Używamy productionDate z fallback na completedAt (dla starszych zleceń)
        const orderDate = req.order.productionDate ?? req.order.completedAt ?? req.order.updatedAt;

        // Sprawdź datę remanentu (tylko dla standardowych kolorów)
        if (req.colorId != null) {
          const remanentDate = remanentDateMap.get(`${req.profileId}-${req.colorId}`);
          if (remanentDate && orderDate < remanentDate) continue;
        }
        // Prywatne kolory: brak remanent -> brak filtra daty

        const row = getOrCreate(req.profileId, req.colorId, req.privateColorId);
        row.rwBeams += req.beamsCount;
        row.rwMeters += req.meters;
        row.rwDetails.push({
          label: req.order.orderNumber,
          beams: req.beamsCount,
        });
      }

      // --- 4. Zapotrzebowanie (aktywne zlecenia, BEZ filtra daty) ---
      for (const req of demandRequirements) {
        if (!validProfileIds.has(req.profileId)) continue;

        // Filtr koloru z query
        if (query.colorId && req.colorId !== query.colorId && req.privateColorId != null) continue;
        if (query.colorId && req.colorId !== null && req.colorId !== query.colorId) continue;

        const row = getOrCreate(req.profileId, req.colorId, req.privateColorId);
        row.demandBeams += req.beamsCount;
        row.demandMeters += req.meters;
        row.demandDetails.push({
          label: req.order.orderNumber,
          beams: req.beamsCount,
        });
      }

      // --- Buduj odpowiedź: pogrupowane wg profilu ---
      // Grupuj wiersze wg profileId
      const profileRowsMap = new Map<number, AggRow[]>();
      for (const row of aggMap.values()) {
        const existing = profileRowsMap.get(row.profileId);
        if (existing) {
          existing.push(row);
        } else {
          profileRowsMap.set(row.profileId, [row]);
        }
      }

      // Buduj profiles array
      const profilesWithStock = allProfiles
        .filter((p) => profileRowsMap.has(p.id))
        .map((profile) => {
          const rows = profileRowsMap.get(profile.id) || [];
          return {
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
            stocks: rows.map((row) => {
              // Bele z metrów (reszty): zaokrąglenie w górę do pełnej beli
              const rwBeamsFromMeters = Math.ceil(row.rwMeters / 6);
              const rwBeamsTotal = row.rwBeams + rwBeamsFromMeters;
              const currentStockBeams = row.initialStockBeams + row.deliveriesBeams - rwBeamsTotal;
              const demandBeamsFromMeters = Math.ceil(row.demandMeters / 6);
              const demandBeamsTotal = row.demandBeams + demandBeamsFromMeters;
              const afterDemandBeams = currentStockBeams - demandBeamsTotal;
              const color = row.colorId != null ? colorById.get(row.colorId) : null;
              const pc = row.privateColorId != null ? privateColorById.get(row.privateColorId) : null;

              // Agreguj szczegóły dostaw wg numeru zamówienia (mogą być duplikaty)
              const deliveriesAgg = new Map<string, number>();
              for (const d of row.deliveriesDetails) {
                deliveriesAgg.set(d.label, (deliveriesAgg.get(d.label) ?? 0) + d.beams);
              }
              const deliveriesDetails = Array.from(deliveriesAgg.entries()).map(([label, beams]) => ({ label, beams }));

              // Agreguj szczegóły RW wg numeru zlecenia
              const rwAgg = new Map<string, number>();
              for (const d of row.rwDetails) {
                rwAgg.set(d.label, (rwAgg.get(d.label) ?? 0) + d.beams);
              }
              const rwDetails = Array.from(rwAgg.entries()).map(([label, beams]) => ({ label, beams }));

              // Agreguj szczegóły zapotrzebowania wg numeru zlecenia
              const demandAgg = new Map<string, number>();
              for (const d of row.demandDetails) {
                demandAgg.set(d.label, (demandAgg.get(d.label) ?? 0) + d.beams);
              }
              const demandDetails = Array.from(demandAgg.entries()).map(([label, beams]) => ({ label, beams }));

              return {
                colorId: row.colorId,
                color: color ? { id: color.id, code: color.code, name: color.name, hexColor: color.hexColor } : null,
                privateColorId: row.privateColorId,
                privateColorName: pc?.name ?? null,
                initialStockBeams: row.initialStockBeams,
                deliveriesBeams: row.deliveriesBeams,
                deliveriesDetails,
                rwBeams: rwBeamsTotal,
                rwDetails,
                currentStockBeams,
                orderedBeams: row.orderedBeams,
                demandBeams: demandBeamsTotal,
                demandDetails,
                afterDemandBeams,
                palletDeliveriesRaw: row.palletDeliveriesRaw,
                palletOrderedRaw: row.palletOrderedRaw,
                hasUnconvertedPallets: row.palletDeliveriesRaw > 0 || row.palletOrderedRaw > 0,
              };
            }),
          };
        })
        .sort((a, b) => a.number.localeCompare(b.number));

      // Oblicz totale
      let totalCurrentBeams = 0;
      let totalProfiles = 0;
      let totalPositions = 0;
      for (const profile of profilesWithStock) {
        if (profile.stocks.length > 0) {
          totalProfiles++;
          totalPositions += profile.stocks.length;
          for (const stock of profile.stocks) {
            totalCurrentBeams += stock.currentStockBeams;
          }
        }
      }

      // Oblicz datę ostatniego remanentu (najstarsza remanentDate z warehouseStocks)
      let oldestRemanentDate: Date | null = null;
      for (const ws of warehouseStocks) {
        if (ws.remanentDate && (!oldestRemanentDate || ws.remanentDate < oldestRemanentDate)) {
          oldestRemanentDate = ws.remanentDate;
        }
      }

      return reply.send({
        profiles: profilesWithStock,
        colors: sidebarColors,
        totals: {
          totalBeams: totalCurrentBeams,
          totalProfiles,
          totalPositions,
        },
        remanentDate: oldestRemanentDate?.toISOString() ?? null,
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
          meters: true,
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
          totalMeters: number;
          orders: Array<{ id: number; number: string; beams: number }>;
        }
      >();

      for (const req of filteredRequirements) {
        const key = `${req.profileId}-${req.colorId}`;
        const existing = demandMap.get(key);
        const order = orderMap.get(req.orderId);

        if (existing && order) {
          existing.totalBeams += req.beamsCount;
          existing.totalMeters += req.meters;
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
              totalMeters: req.meters,
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

      // Dodaj bele z metrów: ceil(totalMeters / 6) per profil+kolor
      const demand = Array.from(demandMap.values()).map((item) => {
        const beamsFromMeters = Math.ceil(item.totalMeters / 6);
        return {
          ...item,
          totalBeams: item.totalBeams + beamsFromMeters,
        };
      });

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

      // Pobierz RW z OrderRequirement - profile ze zleceń z datą produkcji w danym miesiącu
      // Używamy productionDate - data ustawiana przy kończeniu zlecenia
      const requirements = await prisma.orderRequirement.findMany({
        where: {
          order: {
            // Zlecenie ukończone (status = completed)
            status: 'completed',
            // productionDate w zakresie miesiąca
            productionDate: {
              gte: startDate,
              lte: endDate,
            },
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
              productionDate: true,
            },
          },
        },
        orderBy: { order: { productionDate: 'desc' } },
      });

      // Grupuj wg profilu i koloru
      const rwMap = new Map<
        string,
        {
          profile: (typeof requirements)[0]['profile'];
          color: (typeof requirements)[0]['color'] | null;
          privateColor: (typeof requirements)[0]['privateColor'] | null;
          totalBeams: number;
          totalMeters: number;
          orders: Array<{
            id: number;
            number: string;
            beams: number;
            productionDate: Date | null;
          }>;
        }
      >();

      for (const req of requirements) {
        const colorKey = req.colorId ?? `private-${req.privateColorId}`;
        const key = `${req.profileId}-${colorKey}`;
        const existing = rwMap.get(key);

        if (existing) {
          existing.totalBeams += req.beamsCount;
          existing.totalMeters += req.meters;
          existing.orders.push({
            id: req.order.id,
            number: req.order.orderNumber,
            beams: req.beamsCount,
            productionDate: req.order.productionDate,
          });
        } else {
          rwMap.set(key, {
            profile: req.profile,
            color: req.color,
            privateColor: req.privateColor,
            totalBeams: req.beamsCount,
            totalMeters: req.meters,
            orders: [
              {
                id: req.order.id,
                number: req.order.orderNumber,
                beams: req.beamsCount,
                productionDate: req.order.productionDate,
              },
            ],
          });
        }
      }

      // Dodaj bele z metrów: ceil(totalMeters / 6) per profil+kolor
      const rw = Array.from(rwMap.values()).map((item) => {
        const beamsFromMeters = Math.ceil(item.totalMeters / 6);
        return {
          ...item,
          totalBeams: item.totalBeams + beamsFromMeters,
        };
      });

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

      // Pobierz pozycje zamówień Schuco z deliveryDate w danym miesiącu
      // Tylko artykuły które zostały faktycznie dostarczone (shippedQty > 0)
      const items = await prisma.schucoOrderItem.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
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

        const weekKey = formatDateWarsaw(monday);
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
