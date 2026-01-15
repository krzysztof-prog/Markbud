/**
 * Funkcje pomocnicze do zarządzania uprawnieniami w module Production Reports
 */

import type { UserRole } from '../types';

export interface ReportPermissions {
  canView: boolean;
  canEditQuantities: boolean; // Edycja ilości, wartości, RW
  canEditInvoice: boolean; // Edycja danych FV
  canEditAtypical: boolean; // Edycja nietypówek
  canCloseMonth: boolean;
  canReopenMonth: boolean;
}

/**
 * Definicja uprawnień dla ról
 */
const ROLE_PERMISSIONS: Record<UserRole, ReportPermissions> = {
  admin: {
    canView: true,
    canEditQuantities: true,
    canEditInvoice: true,
    canEditAtypical: true,
    canCloseMonth: true,
    canReopenMonth: true,
  },
  manager: {
    canView: true,
    canEditQuantities: true,
    canEditInvoice: false,
    canEditAtypical: true,
    canCloseMonth: true,
    canReopenMonth: true,
  },
  accountant: {
    canView: true,
    canEditQuantities: false,
    canEditInvoice: true, // Może edytować FV nawet po zamknięciu
    canEditAtypical: false,
    canCloseMonth: false,
    canReopenMonth: false,
  },
  user: {
    canView: true,
    canEditQuantities: false,
    canEditInvoice: false,
    canEditAtypical: false,
    canCloseMonth: false,
    canReopenMonth: false,
  },
};

/**
 * Pobiera uprawnienia dla roli
 */
export function getRolePermissions(role: UserRole): ReportPermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

/**
 * Oblicza efektywne uprawnienia uwzględniając status miesiąca
 */
export function getEffectivePermissions(
  role: UserRole,
  monthStatus: 'open' | 'closed'
): ReportPermissions {
  const base = getRolePermissions(role);

  // Jeśli miesiąc zamknięty, blokuj edycję ilości (ale nie FV dla księgowej)
  if (monthStatus === 'closed') {
    return {
      ...base,
      canEditQuantities: false,
      canEditAtypical: false,
      // canEditInvoice pozostaje bez zmian - księgowa może edytować FV
    };
  }

  return base;
}

/**
 * Sprawdza czy użytkownik może wykonać konkretną akcję
 */
export function canPerformAction(
  role: UserRole,
  monthStatus: 'open' | 'closed',
  action: keyof ReportPermissions
): boolean {
  const permissions = getEffectivePermissions(role, monthStatus);
  return permissions[action];
}

/**
 * Mapuje rolę z backendu na typ UserRole
 */
export function mapBackendRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    kierownik: 'manager',
    manager: 'manager',
    ksiegowa: 'accountant',
    accountant: 'accountant',
    user: 'user',
  };

  return roleMap[backendRole.toLowerCase()] || 'user';
}
