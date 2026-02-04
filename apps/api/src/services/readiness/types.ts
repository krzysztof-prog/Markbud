/**
 * Typy dla systemu agregacji statusów gotowości produkcji
 *
 * System sprawdza gotowość do puszczenia zleceń na produkcję:
 * - label_check: czy etykiety są zweryfikowane
 * - glass_delivery: czy szyby zamówione (nie muszą być dostarczone)
 * - mail_completeness: czy lista mailowa kompletna
 * - delivery_date_mismatch: zgodność dat dostawy
 * - missing_delivery_date: brak daty dostawy
 * - orders_completed: czy zlecenia zakończone
 * - okuc_delivery: czy okucia dostarczone
 * - pallet_validation: czy palety zoptymalizowane
 *
 * Reguły blokowania:
 * - 🔴 BLOKUJE: etykiety błędne, szyby niezamówione
 * - 🟠 OSTRZEGA: mail, daty, okucia, palety, zlecenia
 */

import type { PrismaClient } from '@prisma/client';

// Status pojedynczego modułu sprawdzającego
export type ReadinessCheckStatus = 'ok' | 'warning' | 'blocking';

// Nazwy modułów sprawdzających
export type ReadinessModuleName =
  | 'mail_completeness' // LogisticsMailList - czy wszystkie pozycje OK
  | 'label_check' // LabelCheck - czy etykiety zweryfikowane
  | 'delivery_date_mismatch' // Czy data dostawy zlecenia = data listy mailowej
  | 'missing_delivery_date' // Czy zlecenie ma ustawioną datę dostawy
  | 'orders_completed' // Czy zlecenia zakończone
  | 'glass_delivery' // Czy szyby dostarczone
  | 'okuc_delivery' // Czy okucia dostarczone
  | 'pallet_validation'; // Czy palety zwalidowane

// Wynik pojedynczego modułu sprawdzającego
export interface ReadinessCheckResult {
  module: ReadinessModuleName;
  status: ReadinessCheckStatus;
  message: string;
  messageKey?: string; // Klucz dla i18n (opcjonalnie)
  details?: ReadinessCheckDetail[];
}

// Szczegóły blokady/ostrzeżenia (np. które projekty blokują)
export interface ReadinessCheckDetail {
  itemId?: string; // np. numer projektu D6086
  orderId?: number;
  reason: string;
}

// Interfejs modułu sprawdzającego
export interface ReadinessCheckModule {
  name: ReadinessModuleName;
  check(deliveryId: number): Promise<ReadinessCheckResult>;
}

// Zagregowany status dostawy
export type AggregatedReadinessStatus = 'ready' | 'conditional' | 'blocked' | 'pending';

// Pełny wynik agregacji statusów
export interface AggregatedReadinessResult {
  status: AggregatedReadinessStatus;
  blocking: ReadinessCheckResult[];
  warnings: ReadinessCheckResult[];
  passed: ReadinessCheckResult[];
  checklist: ReadinessChecklistItem[];
  lastCalculatedAt: Date;
}

// Element checklisty dla UI
export interface ReadinessChecklistItem {
  module: ReadinessModuleName;
  label: string;
  status: ReadinessCheckStatus;
  message?: string;
}

// Konfiguracja która określa co blokuje a co ostrzega
export const MODULE_SEVERITY: Record<ReadinessModuleName, 'blocking' | 'warning'> = {
  mail_completeness: 'warning', // 🟠 OSTRZEGA - nie blokuje produkcji
  label_check: 'blocking', // 🔴 BLOKUJE
  delivery_date_mismatch: 'warning', // 🟠 OSTRZEGA - nie blokuje produkcji
  missing_delivery_date: 'warning', // 🟠 OSTRZEGA - nie blokuje produkcji
  glass_delivery: 'blocking', // 🔴 BLOKUJE (ale zamówione = OK)
  okuc_delivery: 'warning', // 🟠 OSTRZEGA
  pallet_validation: 'warning', // 🟠 OSTRZEGA
  orders_completed: 'warning', // 🟠 OSTRZEGA
};

// Etykiety modułów dla UI (po polsku)
export const MODULE_LABELS: Record<ReadinessModuleName, string> = {
  mail_completeness: 'Kompletność listy mailowej',
  label_check: 'Weryfikacja etykiet',
  delivery_date_mismatch: 'Zgodność dat dostawy',
  missing_delivery_date: 'Brak daty dostawy',
  glass_delivery: 'Dostawa szyb',
  okuc_delivery: 'Dostawa okuć',
  pallet_validation: 'Optymalizacja palet',
  orders_completed: 'Status zleceń',
};

// Bazowa klasa dla modułów sprawdzających
export abstract class BaseReadinessCheckModule implements ReadinessCheckModule {
  abstract name: ReadinessModuleName;

  constructor(protected prisma: PrismaClient) {}

  abstract check(deliveryId: number): Promise<ReadinessCheckResult>;

  // Helper do tworzenia wyniku OK
  protected ok(message: string = 'OK'): ReadinessCheckResult {
    return {
      module: this.name,
      status: 'ok',
      message,
    };
  }

  // Helper do tworzenia wyniku WARNING
  protected warning(message: string, details?: ReadinessCheckDetail[]): ReadinessCheckResult {
    return {
      module: this.name,
      status: 'warning',
      message,
      details,
    };
  }

  // Helper do tworzenia wyniku BLOCKING
  protected blocking(message: string, details?: ReadinessCheckDetail[]): ReadinessCheckResult {
    return {
      module: this.name,
      status: 'blocking',
      message,
      details,
    };
  }
}
