/**
 * User Roles - Role użytkowników w systemie
 *
 * Ten plik jest współdzielony między backend (apps/api) i frontend (apps/web)
 *
 * SQLite nie obsługuje enumów w bazie, więc używamy TypeScript enum + Zod walidacji
 */

export enum UserRole {
  OWNER = 'owner',           // Właściciel - pełny dostęp do wszystkiego
  ADMIN = 'admin',           // Administrator - pełny dostęp + zarządzanie użytkownikami
  KIEROWNIK = 'kierownik',   // Kierownik produkcji - panel kierownika
  KSIEGOWA = 'ksiegowa',     // Księgowa - dostęp do raportów finansowych
  USER = 'user',             // Użytkownik - podstawowy dostęp
}

/**
 * Uprawnienia dla każdej roli
 */
export const ROLE_PERMISSIONS = {
  [UserRole.OWNER]: {
    canManageUsers: true,
    canAccessManagerPanel: true,
    canAccessReports: true,
    canAccessFinancial: true,
    canAccessSchuco: true,
    canAccessWarehouse: true,
    canAccessDeliveries: true,
    canAccessOrders: true,
  },
  [UserRole.ADMIN]: {
    canManageUsers: true,
    canAccessManagerPanel: true,
    canAccessReports: true,
    canAccessFinancial: true,
    canAccessSchuco: true,
    canAccessWarehouse: true,
    canAccessDeliveries: true,
    canAccessOrders: true,
  },
  [UserRole.KIEROWNIK]: {
    canManageUsers: false,
    canAccessManagerPanel: true,
    canAccessReports: true,
    canAccessFinancial: false,
    canAccessSchuco: true,
    canAccessWarehouse: true,
    canAccessDeliveries: true,
    canAccessOrders: true,
  },
  [UserRole.KSIEGOWA]: {
    canManageUsers: false,
    canAccessManagerPanel: false,
    canAccessReports: true,
    canAccessFinancial: true,
    canAccessSchuco: false,
    canAccessWarehouse: false,
    canAccessDeliveries: true,
    canAccessOrders: true,
  },
  [UserRole.USER]: {
    canManageUsers: false,
    canAccessManagerPanel: false,
    canAccessReports: false,
    canAccessFinancial: false,
    canAccessSchuco: false,
    canAccessWarehouse: false,
    canAccessDeliveries: true,
    canAccessOrders: true,
  },
} as const;

/**
 * Type dla permissions (type-safe access)
 */
export type Permission = keyof typeof ROLE_PERMISSIONS[UserRole.OWNER];

/**
 * Sprawdź czy rola ma określone uprawnienie
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const roleEnum = role as UserRole;
  const permissions = ROLE_PERMISSIONS[roleEnum];
  if (!permissions) return false;
  return permissions[permission];
}

/**
 * Sprawdź czy użytkownik może zarządzać użytkownikami
 */
export function canManageUsers(role: string): boolean {
  return hasPermission(role, 'canManageUsers');
}

/**
 * Sprawdź czy użytkownik może dostać się do panelu kierownika
 */
export function canAccessManagerPanel(role: string): boolean {
  return hasPermission(role, 'canAccessManagerPanel');
}

/**
 * Sprawdź czy użytkownik może dostać się do raportów
 */
export function canAccessReports(role: string): boolean {
  return hasPermission(role, 'canAccessReports');
}

/**
 * Sprawdź czy użytkownik ma dostęp do danych finansowych
 */
export function canAccessFinancial(role: string): boolean {
  return hasPermission(role, 'canAccessFinancial');
}
