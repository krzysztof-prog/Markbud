/**
 * Moduł porównywania wersji list weryfikacyjnych
 *
 * Zawiera logikę do wykrywania różnic między wersjami list:
 * - dodane projekty
 * - usunięte projekty
 * - projekty bez zmian
 */

/**
 * Reprezentacja różnicy między wersjami list
 */
export interface VersionDiff {
  oldVersion: number;
  newVersion: number;
  addedProjects: string[];
  removedProjects: string[];
  unchangedProjects: string[];
  summary: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

/**
 * Minimalny interfejs dla listy weryfikacyjnej
 * (nie wymaga pełnego typu z Prisma)
 */
interface VerificationListInput {
  version: number;
  items: Array<{
    projectNumber: string;
  }>;
}

/**
 * Porównuje dwie wersje list weryfikacyjnych i zwraca różnice
 *
 * @param oldList - starsza wersja listy (może być null dla pierwszej wersji)
 * @param newList - nowsza wersja listy
 * @returns obiekt z informacjami o różnicach między wersjami
 *
 * @example
 * const diff = compareListVersions(
 *   { version: 1, items: [{ projectNumber: 'D3455' }, { projectNumber: 'D3456' }] },
 *   { version: 2, items: [{ projectNumber: 'D3456' }, { projectNumber: 'D3457' }] }
 * );
 * // diff.addedProjects = ['D3457']
 * // diff.removedProjects = ['D3455']
 * // diff.unchangedProjects = ['D3456']
 */
export function compareListVersions(
  oldList: VerificationListInput | null,
  newList: VerificationListInput
): VersionDiff {
  // Wyciągnij numery projektów z obu list
  const oldProjects = new Set(
    oldList?.items.map((item) => item.projectNumber) ?? []
  );
  const newProjects = new Set(
    newList.items.map((item) => item.projectNumber)
  );

  // Znajdź projekty dodane (są w nowej, nie ma w starej)
  const addedProjects = [...newProjects].filter(
    (project) => !oldProjects.has(project)
  );

  // Znajdź projekty usunięte (są w starej, nie ma w nowej)
  const removedProjects = [...oldProjects].filter(
    (project) => !newProjects.has(project)
  );

  // Znajdź projekty bez zmian (są w obu listach)
  const unchangedProjects = [...newProjects].filter((project) =>
    oldProjects.has(project)
  );

  return {
    oldVersion: oldList?.version ?? 0,
    newVersion: newList.version,
    addedProjects,
    removedProjects,
    unchangedProjects,
    summary: {
      added: addedProjects.length,
      removed: removedProjects.length,
      unchanged: unchangedProjects.length,
    },
  };
}

/**
 * Sprawdza czy dwie listy mają identyczną zawartość projektów
 * (niezależnie od kolejności)
 *
 * @param list1 - pierwsza lista
 * @param list2 - druga lista
 * @returns true jeśli obie listy zawierają te same projekty
 */
export function areListsIdentical(
  list1: VerificationListInput,
  list2: VerificationListInput
): boolean {
  const diff = compareListVersions(list1, list2);
  return diff.summary.added === 0 && diff.summary.removed === 0;
}

/**
 * Tworzy czytelne podsumowanie różnic między wersjami
 *
 * @param diff - obiekt różnic z compareListVersions
 * @returns tekstowe podsumowanie zmian
 *
 * @example
 * const summary = formatVersionDiffSummary(diff);
 * // "Wersja 1 → 2: +3 dodane, -1 usunięte, 5 bez zmian"
 */
export function formatVersionDiffSummary(diff: VersionDiff): string {
  const parts: string[] = [];

  if (diff.oldVersion === 0) {
    parts.push(`Wersja ${diff.newVersion} (pierwsza)`);
  } else {
    parts.push(`Wersja ${diff.oldVersion} → ${diff.newVersion}`);
  }

  const changes: string[] = [];

  if (diff.summary.added > 0) {
    changes.push(`+${diff.summary.added} dodane`);
  }

  if (diff.summary.removed > 0) {
    changes.push(`-${diff.summary.removed} usunięte`);
  }

  if (diff.summary.unchanged > 0) {
    changes.push(`${diff.summary.unchanged} bez zmian`);
  }

  if (changes.length > 0) {
    parts.push(changes.join(', '));
  } else {
    parts.push('brak zmian');
  }

  return parts.join(': ');
}
