/**
 * VersionComparator Unit Tests
 *
 * Testuje logike porownywania wersji list weryfikacyjnych:
 * - Wykrywanie dodanych projektow
 * - Wykrywanie usunietych projektow
 * - Wykrywanie projektow bez zmian
 * - Edge cases (pierwsza wersja, identyczne listy, puste listy)
 */

import { describe, it, expect } from 'vitest';
import {
  compareListVersions,
  areListsIdentical,
  formatVersionDiffSummary,
  type VersionDiff,
} from './VersionComparator.js';

describe('VersionComparator', () => {
  describe('compareListVersions', () => {
    describe('podstawowe porownania', () => {
      it('powinien wykryc dodane projekty', () => {
        const oldList = {
          version: 1,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };
        const newList = {
          version: 2,
          items: [
            { projectNumber: 'D3455' },
            { projectNumber: 'D3456' },
            { projectNumber: 'D3457' },
          ],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual(['D3457']);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toContain('D3455');
        expect(diff.unchangedProjects).toContain('D3456');
        expect(diff.summary.added).toBe(1);
        expect(diff.summary.removed).toBe(0);
        expect(diff.summary.unchanged).toBe(2);
      });

      it('powinien wykryc usuniete projekty', () => {
        const oldList = {
          version: 1,
          items: [
            { projectNumber: 'D3455' },
            { projectNumber: 'D3456' },
            { projectNumber: 'D3457' },
          ],
        };
        const newList = {
          version: 2,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toEqual(['D3457']);
        expect(diff.unchangedProjects).toContain('D3455');
        expect(diff.unchangedProjects).toContain('D3456');
        expect(diff.summary.added).toBe(0);
        expect(diff.summary.removed).toBe(1);
        expect(diff.summary.unchanged).toBe(2);
      });

      it('powinien wykryc dodane i usuniete projekty jednoczesnie', () => {
        const oldList = {
          version: 1,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };
        const newList = {
          version: 2,
          items: [{ projectNumber: 'D3456' }, { projectNumber: 'D3457' }],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual(['D3457']);
        expect(diff.removedProjects).toEqual(['D3455']);
        expect(diff.unchangedProjects).toEqual(['D3456']);
        expect(diff.summary.added).toBe(1);
        expect(diff.summary.removed).toBe(1);
        expect(diff.summary.unchanged).toBe(1);
      });

      it('powinien zwrocic poprawne numery wersji', () => {
        const oldList = { version: 3, items: [{ projectNumber: 'D3455' }] };
        const newList = { version: 5, items: [{ projectNumber: 'D3455' }] };

        const diff = compareListVersions(oldList, newList);

        expect(diff.oldVersion).toBe(3);
        expect(diff.newVersion).toBe(5);
      });
    });

    describe('brak poprzedniej wersji (pierwsza wersja)', () => {
      it('powinien obslugiwac null jako stara liste (pierwsza wersja)', () => {
        const newList = {
          version: 1,
          items: [
            { projectNumber: 'D3455' },
            { projectNumber: 'D3456' },
            { projectNumber: 'D3457' },
          ],
        };

        const diff = compareListVersions(null, newList);

        expect(diff.oldVersion).toBe(0);
        expect(diff.newVersion).toBe(1);
        expect(diff.addedProjects).toHaveLength(3);
        expect(diff.addedProjects).toContain('D3455');
        expect(diff.addedProjects).toContain('D3456');
        expect(diff.addedProjects).toContain('D3457');
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toEqual([]);
        expect(diff.summary.added).toBe(3);
        expect(diff.summary.removed).toBe(0);
        expect(diff.summary.unchanged).toBe(0);
      });

      it('powinien obslugiwac pierwsza wersje z pustymi items', () => {
        const newList = {
          version: 1,
          items: [],
        };

        const diff = compareListVersions(null, newList);

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toEqual([]);
        expect(diff.summary.added).toBe(0);
      });
    });

    describe('identyczne wersje', () => {
      it('powinien zwrocic puste tablice dla identycznych list', () => {
        const list = {
          version: 1,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };

        const diff = compareListVersions(list, {
          ...list,
          version: 2,
        });

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toHaveLength(2);
        expect(diff.summary.added).toBe(0);
        expect(diff.summary.removed).toBe(0);
        expect(diff.summary.unchanged).toBe(2);
      });

      it('powinien ignorowac kolejnosc projektow', () => {
        const oldList = {
          version: 1,
          items: [
            { projectNumber: 'D3455' },
            { projectNumber: 'D3456' },
            { projectNumber: 'D3457' },
          ],
        };
        const newList = {
          version: 2,
          items: [
            { projectNumber: 'D3457' },
            { projectNumber: 'D3455' },
            { projectNumber: 'D3456' },
          ],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('powinien obslugiwac puste listy', () => {
        const oldList = { version: 1, items: [] };
        const newList = { version: 2, items: [] };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toEqual([]);
      });

      it('powinien obslugiwac przejscie z pełnej listy do pustej', () => {
        const oldList = {
          version: 1,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };
        const newList = { version: 2, items: [] };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual([]);
        expect(diff.removedProjects).toHaveLength(2);
        expect(diff.unchangedProjects).toEqual([]);
        expect(diff.summary.removed).toBe(2);
      });

      it('powinien obslugiwac przejscie z pustej listy do pelnej', () => {
        const oldList = { version: 1, items: [] };
        const newList = {
          version: 2,
          items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toHaveLength(2);
        expect(diff.removedProjects).toEqual([]);
        expect(diff.unchangedProjects).toEqual([]);
        expect(diff.summary.added).toBe(2);
      });

      it('powinien obslugiwac duza liczbe projektow', () => {
        const projects = Array.from({ length: 100 }, (_, i) => ({
          projectNumber: `D${1000 + i}`,
        }));

        const oldList = { version: 1, items: projects.slice(0, 50) };
        const newList = { version: 2, items: projects.slice(25, 75) };

        const diff = compareListVersions(oldList, newList);

        // 25 wspolnych (D1025-D1049)
        expect(diff.unchangedProjects).toHaveLength(25);
        // 25 usunietych (D1000-D1024)
        expect(diff.removedProjects).toHaveLength(25);
        // 25 dodanych (D1050-D1074)
        expect(diff.addedProjects).toHaveLength(25);
      });

      it('powinien zachowac oryginalne projectNumbers bez modyfikacji', () => {
        const oldList = {
          version: 1,
          items: [{ projectNumber: 'D3455' }],
        };
        const newList = {
          version: 2,
          items: [{ projectNumber: 'C7814' }],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toContain('C7814');
        expect(diff.removedProjects).toContain('D3455');
      });
    });

    describe('rozne formaty numerow projektow', () => {
      it('powinien obslugiwac projekty z roznych prefixow', () => {
        const oldList = {
          version: 1,
          items: [
            { projectNumber: 'A123' },
            { projectNumber: 'B456' },
            { projectNumber: 'C789' },
          ],
        };
        const newList = {
          version: 2,
          items: [
            { projectNumber: 'B456' },
            { projectNumber: 'D012' },
            { projectNumber: 'E345' },
          ],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual(['D012', 'E345']);
        expect(diff.removedProjects).toEqual(['A123', 'C789']);
        expect(diff.unchangedProjects).toEqual(['B456']);
      });

      it('powinien traktowac projekty case-sensitive', () => {
        const oldList = {
          version: 1,
          items: [{ projectNumber: 'D3455' }],
        };
        const newList = {
          version: 2,
          items: [{ projectNumber: 'd3455' }],
        };

        const diff = compareListVersions(oldList, newList);

        // Zakladamy case-sensitive porownanie
        expect(diff.addedProjects).toEqual(['d3455']);
        expect(diff.removedProjects).toEqual(['D3455']);
      });

      it('powinien obslugiwac projekty z roznymi dlugosciami numerow', () => {
        const oldList = {
          version: 1,
          items: [
            { projectNumber: 'D123' },
            { projectNumber: 'D1234' },
            { projectNumber: 'D12345' },
          ],
        };
        const newList = {
          version: 2,
          items: [
            { projectNumber: 'D1234' },
            { projectNumber: 'D123456' },
          ],
        };

        const diff = compareListVersions(oldList, newList);

        expect(diff.addedProjects).toEqual(['D123456']);
        expect(diff.removedProjects).toContain('D123');
        expect(diff.removedProjects).toContain('D12345');
        expect(diff.unchangedProjects).toEqual(['D1234']);
      });
    });
  });

  describe('areListsIdentical', () => {
    it('powinien zwrocic true dla identycznych list', () => {
      const list1 = {
        version: 1,
        items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
      };
      const list2 = {
        version: 2,
        items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
      };

      expect(areListsIdentical(list1, list2)).toBe(true);
    });

    it('powinien zwrocic true dla identycznych list w roznej kolejnosci', () => {
      const list1 = {
        version: 1,
        items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
      };
      const list2 = {
        version: 2,
        items: [{ projectNumber: 'D3456' }, { projectNumber: 'D3455' }],
      };

      expect(areListsIdentical(list1, list2)).toBe(true);
    });

    it('powinien zwrocic false dla list z roznymi projektami', () => {
      const list1 = {
        version: 1,
        items: [{ projectNumber: 'D3455' }],
      };
      const list2 = {
        version: 2,
        items: [{ projectNumber: 'D3456' }],
      };

      expect(areListsIdentical(list1, list2)).toBe(false);
    });

    it('powinien zwrocic false gdy nowa lista ma wiecej projektow', () => {
      const list1 = {
        version: 1,
        items: [{ projectNumber: 'D3455' }],
      };
      const list2 = {
        version: 2,
        items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
      };

      expect(areListsIdentical(list1, list2)).toBe(false);
    });

    it('powinien zwrocic false gdy stara lista ma wiecej projektow', () => {
      const list1 = {
        version: 1,
        items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }],
      };
      const list2 = {
        version: 2,
        items: [{ projectNumber: 'D3455' }],
      };

      expect(areListsIdentical(list1, list2)).toBe(false);
    });

    it('powinien zwrocic true dla dwoch pustych list', () => {
      const list1 = { version: 1, items: [] };
      const list2 = { version: 2, items: [] };

      expect(areListsIdentical(list1, list2)).toBe(true);
    });
  });

  describe('formatVersionDiffSummary', () => {
    it('powinien sformatowac standardowa roznice', () => {
      const diff: VersionDiff = {
        oldVersion: 1,
        newVersion: 2,
        addedProjects: ['D3457'],
        removedProjects: ['D3455'],
        unchangedProjects: ['D3456'],
        summary: { added: 1, removed: 1, unchanged: 1 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('Wersja 1 → 2');
      expect(summary).toContain('+1 dodane');
      expect(summary).toContain('-1 usunięte');
      expect(summary).toContain('1 bez zmian');
    });

    it('powinien sformatowac pierwsza wersje', () => {
      const diff: VersionDiff = {
        oldVersion: 0,
        newVersion: 1,
        addedProjects: ['D3455', 'D3456'],
        removedProjects: [],
        unchangedProjects: [],
        summary: { added: 2, removed: 0, unchanged: 0 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('Wersja 1 (pierwsza)');
      expect(summary).toContain('+2 dodane');
      expect(summary).not.toContain('usunięte');
    });

    it('powinien sformatowac roznice bez zmian', () => {
      const diff: VersionDiff = {
        oldVersion: 1,
        newVersion: 2,
        addedProjects: [],
        removedProjects: [],
        unchangedProjects: ['D3455', 'D3456'],
        summary: { added: 0, removed: 0, unchanged: 2 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('Wersja 1 → 2');
      expect(summary).toContain('2 bez zmian');
      expect(summary).not.toContain('dodane');
      expect(summary).not.toContain('usunięte');
    });

    it('powinien sformatowac puste listy jako brak zmian', () => {
      const diff: VersionDiff = {
        oldVersion: 1,
        newVersion: 2,
        addedProjects: [],
        removedProjects: [],
        unchangedProjects: [],
        summary: { added: 0, removed: 0, unchanged: 0 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('brak zmian');
    });

    it('powinien sformatowac tylko dodane projekty', () => {
      const diff: VersionDiff = {
        oldVersion: 1,
        newVersion: 2,
        addedProjects: ['D3457', 'D3458', 'D3459'],
        removedProjects: [],
        unchangedProjects: ['D3455', 'D3456'],
        summary: { added: 3, removed: 0, unchanged: 2 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('+3 dodane');
      expect(summary).toContain('2 bez zmian');
      expect(summary).not.toContain('usunięte');
    });

    it('powinien sformatowac tylko usuniete projekty', () => {
      const diff: VersionDiff = {
        oldVersion: 1,
        newVersion: 2,
        addedProjects: [],
        removedProjects: ['D3455', 'D3456'],
        unchangedProjects: ['D3457'],
        summary: { added: 0, removed: 2, unchanged: 1 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('-2 usunięte');
      expect(summary).toContain('1 bez zmian');
      expect(summary).not.toContain('dodane');
    });

    it('powinien obslugiwac wiele wersji (nie kolejne)', () => {
      const diff: VersionDiff = {
        oldVersion: 2,
        newVersion: 5,
        addedProjects: ['D3457'],
        removedProjects: [],
        unchangedProjects: ['D3455'],
        summary: { added: 1, removed: 0, unchanged: 1 },
      };

      const summary = formatVersionDiffSummary(diff);

      expect(summary).toContain('Wersja 2 → 5');
    });
  });
});
