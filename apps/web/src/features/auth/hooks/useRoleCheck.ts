'use client';

/**
 * useRoleCheck Hook
 *
 * Hook do sprawdzania uprawnień użytkownika w komponentach
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { canManageUsers, isAdmin, checkPermission } = useRoleCheck();
 *
 *   return (
 *     <div>
 *       {canManageUsers && (
 *         <Button onClick={handleAddUser}>Dodaj użytkownika</Button>
 *       )}
 *
 *       {isAdmin && (
 *         <Link href="/admin">Panel Administracyjny</Link>
 *       )}
 *
 *       {checkPermission('canAccessReports') && (
 *         <ReportsLink />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useAuth } from '../context/AuthContext';
import {
  UserRole,
  hasPermission,
  type Permission
} from '@markbud/shared';

/**
 * Return type useRoleCheck hooka
 */
export interface UseRoleCheckReturn {
  /**
   * Sprawdź czy użytkownik ma jedną z podanych ról
   */
  hasRole: (allowedRoles: UserRole[]) => boolean;

  /**
   * Sprawdź czy użytkownik ma konkretne uprawnienie
   */
  checkPermission: (permission: Permission) => boolean;

  /**
   * Czy użytkownik może zarządzać użytkownikami (owner, admin)
   */
  canManageUsers: boolean;

  /**
   * Czy użytkownik ma dostęp do panelu kierownika
   */
  canAccessManagerPanel: boolean;

  /**
   * Czy użytkownik ma dostęp do raportów
   */
  canAccessReports: boolean;

  /**
   * Czy użytkownik ma dostęp do danych finansowych
   */
  canAccessFinancial: boolean;

  /**
   * Czy użytkownik jest adminem (owner lub admin)
   */
  isAdmin: boolean;

  /**
   * Czy użytkownik jest kierownikiem
   */
  isKierownik: boolean;

  /**
   * Czy użytkownik jest księgową
   */
  isKsiegowa: boolean;

  /**
   * Czy użytkownik jest zwykłym userem
   */
  isUser: boolean;

  /**
   * Obecna rola użytkownika (lub null jeśli nie zalogowany)
   */
  currentRole: UserRole | null;
}

/**
 * Hook do sprawdzania uprawnień użytkownika
 */
export function useRoleCheck(): UseRoleCheckReturn {
  const { user } = useAuth();

  /**
   * Sprawdź czy użytkownik ma jedną z podanych ról
   */
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role as UserRole);
  };

  /**
   * Sprawdź czy użytkownik ma konkretne uprawnienie
   */
  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  // Precomputed permissions (dla wygody)
  const canManageUsersCheck = checkPermission('canManageUsers');
  const canAccessManagerPanelCheck = checkPermission('canAccessManagerPanel');
  const canAccessReportsCheck = checkPermission('canAccessReports');
  const canAccessFinancialCheck = checkPermission('canAccessFinancial');

  // Precomputed role checks
  const isAdmin = hasRole([UserRole.OWNER, UserRole.ADMIN]);
  const isKierownik = hasRole([UserRole.KIEROWNIK]);
  const isKsiegowa = hasRole([UserRole.KSIEGOWA]);
  const isUserRole = user?.role === UserRole.USER;

  return {
    hasRole,
    checkPermission,
    canManageUsers: canManageUsersCheck,
    canAccessManagerPanel: canAccessManagerPanelCheck,
    canAccessReports: canAccessReportsCheck,
    canAccessFinancial: canAccessFinancialCheck,
    isAdmin,
    isKierownik,
    isKsiegowa,
    isUser: isUserRole,
    currentRole: user ? (user.role as UserRole) : null,
  };
}
