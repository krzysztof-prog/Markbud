/**
 * Konfiguracja systemu czyszczenia PendingOrderPrice
 */

import { CleanupConfig } from '../services/pendingOrderPriceCleanupService.js';

/**
 * Centralna konfiguracja cleanup
 *
 * UWAGA: Pliki PDF w folderze ceny/ NIE SĄ USUWANE!
 * Czyszczenie dotyczy tylko rekordów w bazie danych.
 */
export const CLEANUP_CONFIG: CleanupConfig = {
  // Pending records starsze niż 60 dni są oznaczane jako "expired"
  // (pliki PDF pozostają nienaruszone - można zaimportować ponownie)
  pendingMaxAgeDays: 60,

  // Applied records (cena już przypisana do zamówienia) są usuwane po 7 dniach
  // (cena jest już w Order, więc duplikat nie jest potrzebny)
  appliedMaxAgeDays: 7,

  // Expired records są usuwane natychmiast podczas czyszczenia
  deleteExpired: true,
};
