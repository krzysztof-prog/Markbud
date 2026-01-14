/**
 * Hook do zarządzania paginacją dostaw Schuco
 *
 * Obsługuje stan strony, nawigację i obliczenia paginacji.
 */

import { useState, useCallback, useMemo } from 'react';
import type { PaginationState } from '../types';

interface UseDeliveryPaginationOptions {
  /** Domyślny rozmiar strony */
  pageSize?: number;
  /** Całkowita liczba elementów (z API) */
  total: number;
  /** Całkowita liczba stron (z API) */
  totalPages: number;
}

interface UseDeliveryPaginationReturn extends PaginationState {
  /** Przejdź do konkretnej strony */
  goToPage: (page: number) => void;
  /** Przejdź do pierwszej strony */
  goToFirstPage: () => void;
  /** Przejdź do poprzedniej strony */
  goToPreviousPage: () => void;
  /** Przejdź do następnej strony */
  goToNextPage: () => void;
  /** Przejdź do ostatniej strony */
  goToLastPage: () => void;
  /** Resetuj do pierwszej strony */
  resetPagination: () => void;
  /** Numer pierwszego elementu na stronie */
  startItem: number;
  /** Numer ostatniego elementu na stronie */
  endItem: number;
  /** Czy można przejść wstecz */
  canGoPrevious: boolean;
  /** Czy można przejść dalej */
  canGoNext: boolean;
}

const DEFAULT_PAGE_SIZE = 100;

/**
 * Hook do zarządzania paginacją
 */
export function useDeliveryPagination({
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  totalPages,
}: UseDeliveryPaginationOptions): UseDeliveryPaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);

  // Nawigacja do konkretnej strony z walidacją
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  // Funkcje nawigacji
  const goToFirstPage = useCallback(() => goToPage(1), [goToPage]);
  const goToPreviousPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
  const goToLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);

  // Reset paginacji
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Obliczanie zakresu elementów
  const { startItem, endItem } = useMemo(() => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    return { startItem: start, endItem: end };
  }, [currentPage, pageSize, total]);

  // Stany nawigacji
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return {
    currentPage,
    totalPages,
    total,
    pageSize,
    goToPage,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    resetPagination,
    startItem,
    endItem,
    canGoPrevious,
    canGoNext,
  };
}

export default useDeliveryPagination;
