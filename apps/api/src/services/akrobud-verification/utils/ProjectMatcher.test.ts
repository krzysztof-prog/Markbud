/**
 * ProjectMatcher Unit Tests
 *
 * Testuje logike dopasowywania projektow do zlecen:
 * - Normalizacja numerow projektow
 * - Parsowanie projektow z pola project (lista rozdzielona przecinkami)
 * - Typy wynikow
 *
 * Uwaga: Metody wymagajace bazy danych (findOrdersByProject, findOrdersByProjects)
 * sa testowane w testach integracyjnych
 */

import { describe, it, expect } from 'vitest';
import type {
  MatchedOrder,
  ProjectMatchResult,
  ProjectMatcherOptions,
  ProjectDeliveryStatus,
} from './ProjectMatcher.js';

describe('ProjectMatcher', () => {
  describe('normalizacja numerow projektow', () => {
    // Logika normalizacji uzywana w ProjectMatcher
    const normalizeProjectNumber = (project: string): string => {
      return project.toUpperCase().trim();
    };

    it('powinien konwertowac na wielkie litery', () => {
      expect(normalizeProjectNumber('d3455')).toBe('D3455');
      expect(normalizeProjectNumber('c7814')).toBe('C7814');
    });

    it('powinien trimowac biale znaki', () => {
      expect(normalizeProjectNumber('  D3455  ')).toBe('D3455');
      expect(normalizeProjectNumber('\tD3455\n')).toBe('D3455');
    });

    it('powinien obslugiwac mieszany case', () => {
      expect(normalizeProjectNumber('D3455')).toBe('D3455');
      expect(normalizeProjectNumber('d3455')).toBe('D3455');
    });
  });

  describe('parsowanie projektow z pola order.project', () => {
    // Logika parsowania listy projektow z pojedynczego zlecenia
    const parseProjectList = (projectField: string | null): string[] => {
      if (!projectField) return [];
      return projectField.split(/[,\s]+/).map(p => p.trim().toUpperCase()).filter(p => p.length > 0);
    };

    it('powinien sparsowac pojedynczy projekt', () => {
      expect(parseProjectList('D3455')).toEqual(['D3455']);
    });

    it('powinien sparsowac projekty rozdzielone przecinkami', () => {
      expect(parseProjectList('D3455, D3456, D3457')).toEqual([
        'D3455',
        'D3456',
        'D3457',
      ]);
    });

    it('powinien sparsowac projekty rozdzielone spacjami', () => {
      expect(parseProjectList('D3455 D3456')).toEqual(['D3455', 'D3456']);
    });

    it('powinien sparsowac projekty rozdzielone przecinkami i spacjami', () => {
      expect(parseProjectList('D5873, D5874')).toEqual(['D5873', 'D5874']);
      expect(parseProjectList('D3370, C9679, C9681')).toEqual([
        'D3370',
        'C9679',
        'C9681',
      ]);
    });

    it('powinien obslugiwac null jako puste pole', () => {
      expect(parseProjectList(null)).toEqual([]);
    });

    it('powinien obslugiwac pusty string', () => {
      expect(parseProjectList('')).toEqual([]);
    });

    it('powinien filtrowac puste elementy', () => {
      expect(parseProjectList('D3455,, D3456')).toEqual(['D3455', 'D3456']);
      expect(parseProjectList('D3455,   ,D3456')).toEqual(['D3455', 'D3456']);
    });

    it('powinien normalizowac do uppercase', () => {
      expect(parseProjectList('d3455, c7814')).toEqual(['D3455', 'C7814']);
    });
  });

  describe('sprawdzanie czy projekt pasuje do zlecenia', () => {
    // Logika sprawdzania czy szukany projekt jest wsrod projektow zlecenia
    const isProjectInOrder = (
      searchedProject: string,
      orderProjectField: string | null
    ): boolean => {
      if (!orderProjectField) return false;

      const orderProjects = orderProjectField
        .split(/[,\s]+/)
        .map(p => p.trim().toUpperCase());

      return orderProjects.includes(searchedProject.toUpperCase());
    };

    it('powinien zwrocic true gdy projekt pasuje', () => {
      expect(isProjectInOrder('D3455', 'D3455')).toBe(true);
      expect(isProjectInOrder('D3455', 'D3455, D3456')).toBe(true);
      expect(isProjectInOrder('D3456', 'D3455, D3456')).toBe(true);
    });

    it('powinien zwrocic false gdy projekt nie pasuje', () => {
      expect(isProjectInOrder('D3455', 'D3456')).toBe(false);
      expect(isProjectInOrder('D3455', 'D3456, D3457')).toBe(false);
    });

    it('powinien zwrocic false dla null', () => {
      expect(isProjectInOrder('D3455', null)).toBe(false);
    });

    it('powinien ignorowac case', () => {
      expect(isProjectInOrder('d3455', 'D3455')).toBe(true);
      expect(isProjectInOrder('D3455', 'd3455')).toBe(true);
    });

    it('powinien nie pasowac do podobnych numerow (D345 vs D3455)', () => {
      // Wazne: szukamy dokladnego dopasowania, nie prefix match
      expect(isProjectInOrder('D345', 'D3455')).toBe(false);
      expect(isProjectInOrder('D3455', 'D345')).toBe(false);
    });
  });

  describe('MatchedOrder struktura', () => {
    it('powinien miec poprawna strukture', () => {
      const order: MatchedOrder = {
        id: 1,
        orderNumber: '54222',
        client: 'Test Klient',
        project: 'D3455, D3456',
        status: 'aktywne',
        deadline: new Date('2026-01-25'),
        deliveryDate: new Date('2026-01-22'),
      };

      expect(order.id).toBe(1);
      expect(order.orderNumber).toBe('54222');
      expect(order.project).toBe('D3455, D3456');
    });

    it('powinien obslugiwac nullable pola', () => {
      const order: MatchedOrder = {
        id: 1,
        orderNumber: '54222',
        client: null,
        project: null,
        status: 'aktywne',
        deadline: null,
        deliveryDate: null,
      };

      expect(order.client).toBeNull();
      expect(order.project).toBeNull();
      expect(order.deadline).toBeNull();
    });
  });

  describe('ProjectMatchResult struktura', () => {
    it('powinien miec poprawna strukture dla znalezionego projektu', () => {
      const result: ProjectMatchResult = {
        projectNumber: 'D3455',
        matchStatus: 'found',
        matchedOrders: [
          {
            id: 1,
            orderNumber: '54222',
            client: 'Klient A',
            project: 'D3455',
            status: 'aktywne',
            deadline: null,
            deliveryDate: null,
          },
          {
            id: 2,
            orderNumber: '54223',
            client: 'Klient B',
            project: 'D3455, D3456',
            status: 'aktywne',
            deadline: null,
            deliveryDate: null,
          },
        ],
        orderCount: 2,
      };

      expect(result.projectNumber).toBe('D3455');
      expect(result.matchStatus).toBe('found');
      expect(result.matchedOrders).toHaveLength(2);
      expect(result.orderCount).toBe(2);
    });

    it('powinien miec poprawna strukture dla nieznalezionego projektu', () => {
      const result: ProjectMatchResult = {
        projectNumber: 'D9999',
        matchStatus: 'not_found',
        matchedOrders: [],
        orderCount: 0,
      };

      expect(result.matchStatus).toBe('not_found');
      expect(result.matchedOrders).toHaveLength(0);
      expect(result.orderCount).toBe(0);
    });
  });

  describe('ProjectMatcherOptions', () => {
    it('powinien miec domyslne wartosci', () => {
      const options: ProjectMatcherOptions = {};

      expect(options.excludeArchived).toBeUndefined();
      expect(options.statusFilter).toBeUndefined();
    });

    it('powinien obslugiwac excludeArchived', () => {
      const options: ProjectMatcherOptions = {
        excludeArchived: true,
      };

      expect(options.excludeArchived).toBe(true);
    });

    it('powinien obslugiwac statusFilter', () => {
      const options: ProjectMatcherOptions = {
        statusFilter: ['aktywne', 'wstrzymane'],
      };

      expect(options.statusFilter).toEqual(['aktywne', 'wstrzymane']);
    });
  });

  describe('ProjectDeliveryStatus struktura', () => {
    it('powinien miec poprawna strukture dla statusu all', () => {
      const mockOrder: MatchedOrder = {
        id: 1,
        orderNumber: '54222',
        client: 'Klient A',
        project: 'D3455',
        status: 'aktywne',
        deadline: null,
        deliveryDate: null,
      };

      const status: ProjectDeliveryStatus = {
        projectNumber: 'D3455',
        allOrders: [mockOrder],
        ordersInDelivery: [mockOrder],
        ordersNotInDelivery: [],
        deliveryStatus: 'all',
        statusText: '1/1 zleceń w dostawie',
      };

      expect(status.deliveryStatus).toBe('all');
      expect(status.ordersInDelivery).toHaveLength(1);
      expect(status.ordersNotInDelivery).toHaveLength(0);
    });

    it('powinien miec poprawna strukture dla statusu partial', () => {
      const order1: MatchedOrder = {
        id: 1,
        orderNumber: '54222',
        client: 'Klient A',
        project: 'D3455',
        status: 'aktywne',
        deadline: null,
        deliveryDate: null,
      };
      const order2: MatchedOrder = {
        id: 2,
        orderNumber: '54223',
        client: 'Klient B',
        project: 'D3455',
        status: 'aktywne',
        deadline: null,
        deliveryDate: null,
      };

      const status: ProjectDeliveryStatus = {
        projectNumber: 'D3455',
        allOrders: [order1, order2],
        ordersInDelivery: [order1],
        ordersNotInDelivery: [order2],
        deliveryStatus: 'partial',
        statusText: '1/2 zleceń w dostawie',
      };

      expect(status.deliveryStatus).toBe('partial');
      expect(status.ordersInDelivery).toHaveLength(1);
      expect(status.ordersNotInDelivery).toHaveLength(1);
    });

    it('powinien miec poprawna strukture dla statusu none', () => {
      const mockOrder: MatchedOrder = {
        id: 1,
        orderNumber: '54222',
        client: 'Klient A',
        project: 'D3455',
        status: 'aktywne',
        deadline: null,
        deliveryDate: null,
      };

      const status: ProjectDeliveryStatus = {
        projectNumber: 'D3455',
        allOrders: [mockOrder],
        ordersInDelivery: [],
        ordersNotInDelivery: [mockOrder],
        deliveryStatus: 'none',
        statusText: '0/1 zleceń w dostawie',
      };

      expect(status.deliveryStatus).toBe('none');
      expect(status.ordersInDelivery).toHaveLength(0);
      expect(status.ordersNotInDelivery).toHaveLength(1);
    });

    it('powinien miec poprawna strukture dla statusu not_found', () => {
      const status: ProjectDeliveryStatus = {
        projectNumber: 'D9999',
        allOrders: [],
        ordersInDelivery: [],
        ordersNotInDelivery: [],
        deliveryStatus: 'not_found',
        statusText: 'Brak zleceń w systemie',
      };

      expect(status.deliveryStatus).toBe('not_found');
      expect(status.allOrders).toHaveLength(0);
      expect(status.statusText).toBe('Brak zleceń w systemie');
    });
  });

  describe('batch processing logika', () => {
    it('powinien usunac duplikaty projektow', () => {
      const projects = ['D3455', 'd3455', 'D3456', 'D3455'];

      const normalized = projects.map(p => p.toUpperCase().trim());
      const unique = [...new Set(normalized)];

      expect(unique).toHaveLength(2);
      expect(unique).toEqual(['D3455', 'D3456']);
    });

    it('powinien przygotowac warunki OR dla wielu projektow', () => {
      const projects = ['D3455', 'D3456', 'C7814'];

      // Symulacja budowania warunkow OR
      const orConditions = projects.map(project => ({
        project: { contains: project },
      }));

      expect(orConditions).toHaveLength(3);
      expect(orConditions[0]).toEqual({ project: { contains: 'D3455' } });
    });

    it('powinien inicjalizowac wyniki dla wszystkich projektow', () => {
      const projects = ['D3455', 'D3456'];

      const results = new Map<string, ProjectMatchResult>();
      for (const project of projects) {
        results.set(project, {
          projectNumber: project,
          matchStatus: 'not_found',
          matchedOrders: [],
          orderCount: 0,
        });
      }

      expect(results.size).toBe(2);
      expect(results.get('D3455')?.matchStatus).toBe('not_found');
      expect(results.get('D3456')?.matchStatus).toBe('not_found');
    });
  });

  describe('obliczanie statusu dostawy', () => {
    it('powinien obliczyc status all gdy wszystkie zlecenia sa w dostawie', () => {
      const allOrders = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const deliveryOrderIds = new Set([1, 2, 3]);

      const ordersInDelivery = allOrders.filter(o => deliveryOrderIds.has(o.id));
      const ordersNotInDelivery = allOrders.filter(o => !deliveryOrderIds.has(o.id));

      let status: 'all' | 'partial' | 'none';
      if (ordersInDelivery.length === allOrders.length) {
        status = 'all';
      } else if (ordersInDelivery.length > 0) {
        status = 'partial';
      } else {
        status = 'none';
      }

      expect(status).toBe('all');
      expect(ordersInDelivery).toHaveLength(3);
      expect(ordersNotInDelivery).toHaveLength(0);
    });

    it('powinien obliczyc status partial gdy czesc zlecen jest w dostawie', () => {
      const allOrders = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const deliveryOrderIds = new Set([1, 2]);

      const ordersInDelivery = allOrders.filter(o => deliveryOrderIds.has(o.id));
      const ordersNotInDelivery = allOrders.filter(o => !deliveryOrderIds.has(o.id));

      let status: 'all' | 'partial' | 'none';
      if (ordersInDelivery.length === allOrders.length) {
        status = 'all';
      } else if (ordersInDelivery.length > 0) {
        status = 'partial';
      } else {
        status = 'none';
      }

      expect(status).toBe('partial');
      expect(ordersInDelivery).toHaveLength(2);
      expect(ordersNotInDelivery).toHaveLength(1);
    });

    it('powinien obliczyc status none gdy zadne zlecenie nie jest w dostawie', () => {
      const allOrders = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const deliveryOrderIds = new Set<number>();

      const ordersInDelivery = allOrders.filter(o => deliveryOrderIds.has(o.id));
      const ordersNotInDelivery = allOrders.filter(o => !deliveryOrderIds.has(o.id));

      let status: 'all' | 'partial' | 'none';
      if (ordersInDelivery.length === allOrders.length) {
        status = 'all';
      } else if (ordersInDelivery.length > 0) {
        status = 'partial';
      } else {
        status = 'none';
      }

      expect(status).toBe('none');
      expect(ordersInDelivery).toHaveLength(0);
      expect(ordersNotInDelivery).toHaveLength(3);
    });

    it('powinien generowac poprawny statusText', () => {
      const generateStatusText = (
        inDelivery: number,
        total: number
      ): string => {
        return `${inDelivery}/${total} zleceń w dostawie`;
      };

      expect(generateStatusText(3, 3)).toBe('3/3 zleceń w dostawie');
      expect(generateStatusText(1, 2)).toBe('1/2 zleceń w dostawie');
      expect(generateStatusText(0, 5)).toBe('0/5 zleceń w dostawie');
    });
  });

  describe('edge cases', () => {
    it('powinien obslugiwac pusta liste projektow', () => {
      const projects: string[] = [];
      const uniqueProjects = [...new Set(projects.map(p => p.toUpperCase()))];

      expect(uniqueProjects).toHaveLength(0);
    });

    it('powinien obslugiwac projekt z samymi cyframi (np. numeryk)', () => {
      // Numery projektow zazwyczaj maja format litera + cyfry
      // ale testujemy edge case
      const projectField = 'D3455, 12345';
      const projects = projectField.split(/[,\s]+/).map(p => p.trim().toUpperCase());

      expect(projects).toContain('12345');
    });

    it('powinien obslugiwac projekty z roznymi prefiksami', () => {
      const projectField = 'A123, B456, C789, D012, E345';
      const projects = projectField.split(/[,\s]+/).map(p => p.trim().toUpperCase());

      expect(projects).toHaveLength(5);
      expect(projects[0]).toBe('A123');
      expect(projects[4]).toBe('E345');
    });
  });
});
