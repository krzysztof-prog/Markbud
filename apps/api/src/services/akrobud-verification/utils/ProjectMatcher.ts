/**
 * ProjectMatcher - Wyszukiwanie zleceń na podstawie numeru projektu
 *
 * Relacja: Projekt → Zlecenia (1:N)
 * Pole Order.project może zawierać wiele projektów rozdzielonych przecinkami
 * np. "D5873, D5874" lub "D3370, C9679, C9681"
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface MatchedOrder {
  id: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  status: string;
  deadline: Date | null;
  deliveryDate: Date | null;
}

export interface ProjectMatchResult {
  /** Numer projektu (np. "D3455") */
  projectNumber: string;
  /** Status dopasowania */
  matchStatus: 'found' | 'not_found';
  /** Znalezione zlecenia */
  matchedOrders: MatchedOrder[];
  /** Liczba znalezionych zleceń */
  orderCount: number;
}

export interface ProjectMatcherOptions {
  /** Filtruj tylko aktywne zlecenia (bez zarchiwizowanych) */
  excludeArchived?: boolean;
  /** Filtruj zlecenia po statusie */
  statusFilter?: string[];
}

/**
 * Wyszukuje zlecenia dla danego numeru projektu
 *
 * Używa LIKE '%projektNumber%' ponieważ:
 * - Jedno zlecenie może mieć wiele projektów: "D5873, D5874"
 * - Projekt może być w dowolnym miejscu listy
 */
export async function findOrdersByProject(
  prisma: PrismaClient,
  projectNumber: string,
  options: ProjectMatcherOptions = {}
): Promise<ProjectMatchResult> {
  const { excludeArchived = true, statusFilter } = options;

  // Normalizuj numer projektu
  const normalizedProject = projectNumber.toUpperCase().trim();

  // Buduj warunki WHERE
  const whereConditions: Prisma.OrderWhereInput = {
    // Szukaj projektu w polu project (może być lista rozdzielona przecinkami)
    project: {
      contains: normalizedProject,
    },
  };

  // Filtruj zarchiwizowane
  if (excludeArchived) {
    whereConditions.archivedAt = null;
  }

  // Filtruj po statusie
  if (statusFilter && statusFilter.length > 0) {
    whereConditions.status = {
      in: statusFilter,
    };
  }

  // Wykonaj zapytanie
  const orders = await prisma.order.findMany({
    where: whereConditions,
    select: {
      id: true,
      orderNumber: true,
      client: true,
      project: true,
      status: true,
      deadline: true,
      deliveryDate: true,
    },
    orderBy: {
      orderNumber: 'asc',
    },
  });

  // Filtruj dokładne dopasowania (aby "D345" nie pasowało do "D3455")
  const exactMatches = orders.filter((order) => {
    if (!order.project) return false;

    // Rozdziel projekty przecinkami i sprawdź każdy
    const projectList = order.project.split(/[,\s]+/).map((p) => p.trim().toUpperCase());
    return projectList.includes(normalizedProject);
  });

  return {
    projectNumber: normalizedProject,
    matchStatus: exactMatches.length > 0 ? 'found' : 'not_found',
    matchedOrders: exactMatches.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      client: order.client,
      project: order.project,
      status: order.status,
      deadline: order.deadline,
      deliveryDate: order.deliveryDate,
    })),
    orderCount: exactMatches.length,
  };
}

/**
 * Wyszukuje zlecenia dla wielu projektów jednocześnie
 * Optymalizacja: jedno zapytanie do bazy zamiast N
 */
export async function findOrdersByProjects(
  prisma: PrismaClient,
  projectNumbers: string[],
  options: ProjectMatcherOptions = {}
): Promise<Map<string, ProjectMatchResult>> {
  const { excludeArchived = true, statusFilter } = options;

  // Normalizuj numery projektów
  const normalizedProjects = projectNumbers.map((p) => p.toUpperCase().trim());
  const uniqueProjects = [...new Set(normalizedProjects)];

  if (uniqueProjects.length === 0) {
    return new Map();
  }

  // Buduj warunki WHERE - szukaj wszystkich projektów naraz
  const whereConditions: Prisma.OrderWhereInput = {
    OR: uniqueProjects.map((project) => ({
      project: {
        contains: project,
      },
    })),
  };

  // Filtruj zarchiwizowane
  if (excludeArchived) {
    whereConditions.archivedAt = null;
  }

  // Filtruj po statusie
  if (statusFilter && statusFilter.length > 0) {
    whereConditions.status = {
      in: statusFilter,
    };
  }

  // Wykonaj zapytanie
  const orders = await prisma.order.findMany({
    where: whereConditions,
    select: {
      id: true,
      orderNumber: true,
      client: true,
      project: true,
      status: true,
      deadline: true,
      deliveryDate: true,
    },
    orderBy: {
      orderNumber: 'asc',
    },
  });

  // Grupuj wyniki po projektach
  const results = new Map<string, ProjectMatchResult>();

  // Inicjalizuj wyniki dla wszystkich projektów
  for (const project of uniqueProjects) {
    results.set(project, {
      projectNumber: project,
      matchStatus: 'not_found',
      matchedOrders: [],
      orderCount: 0,
    });
  }

  // Przypisz zlecenia do projektów
  for (const order of orders) {
    if (!order.project) continue;

    // Rozdziel projekty w zleceniu
    const orderProjects = order.project.split(/[,\s]+/).map((p) => p.trim().toUpperCase());

    // Sprawdź które szukane projekty pasują
    for (const searchedProject of uniqueProjects) {
      if (orderProjects.includes(searchedProject)) {
        const result = results.get(searchedProject)!;
        result.matchedOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          client: order.client,
          project: order.project,
          status: order.status,
          deadline: order.deadline,
          deliveryDate: order.deliveryDate,
        });
        result.orderCount = result.matchedOrders.length;
        result.matchStatus = 'found';
      }
    }
  }

  return results;
}

/**
 * Sprawdza ile zleceń projektu jest w dostawie
 */
export interface ProjectDeliveryStatus {
  projectNumber: string;
  /** Wszystkie zlecenia projektu */
  allOrders: MatchedOrder[];
  /** Zlecenia które są w dostawie */
  ordersInDelivery: MatchedOrder[];
  /** Zlecenia które NIE są w dostawie */
  ordersNotInDelivery: MatchedOrder[];
  /** Status: all | partial | none | not_found */
  deliveryStatus: 'all' | 'partial' | 'none' | 'not_found';
  /** Tekst statusu: "2/3 zleceń w dostawie" */
  statusText: string;
}

export async function checkProjectDeliveryStatus(
  prisma: PrismaClient,
  projectNumber: string,
  deliveryOrderIds: Set<number>,
  options: ProjectMatcherOptions = {}
): Promise<ProjectDeliveryStatus> {
  // Znajdź wszystkie zlecenia projektu
  const matchResult = await findOrdersByProject(prisma, projectNumber, options);

  if (matchResult.matchStatus === 'not_found') {
    return {
      projectNumber: matchResult.projectNumber,
      allOrders: [],
      ordersInDelivery: [],
      ordersNotInDelivery: [],
      deliveryStatus: 'not_found',
      statusText: 'Brak zleceń w systemie',
    };
  }

  // Podziel zlecenia na te w dostawie i poza
  const ordersInDelivery: MatchedOrder[] = [];
  const ordersNotInDelivery: MatchedOrder[] = [];

  for (const order of matchResult.matchedOrders) {
    if (deliveryOrderIds.has(order.id)) {
      ordersInDelivery.push(order);
    } else {
      ordersNotInDelivery.push(order);
    }
  }

  // Określ status
  let deliveryStatus: 'all' | 'partial' | 'none';
  let statusText: string;

  if (ordersInDelivery.length === matchResult.matchedOrders.length) {
    deliveryStatus = 'all';
    statusText = `${ordersInDelivery.length}/${matchResult.matchedOrders.length} zleceń w dostawie`;
  } else if (ordersInDelivery.length > 0) {
    deliveryStatus = 'partial';
    statusText = `${ordersInDelivery.length}/${matchResult.matchedOrders.length} zleceń w dostawie`;
  } else {
    deliveryStatus = 'none';
    statusText = `0/${matchResult.matchedOrders.length} zleceń w dostawie`;
  }

  return {
    projectNumber: matchResult.projectNumber,
    allOrders: matchResult.matchedOrders,
    ordersInDelivery,
    ordersNotInDelivery,
    deliveryStatus,
    statusText,
  };
}
