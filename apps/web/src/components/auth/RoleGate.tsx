'use client';

/**
 * RoleGate Component
 *
 * Komponent do warunkowego renderowania treści na podstawie ról użytkownika
 *
 * @example
 * ```tsx
 * // Tylko dla admin/owner
 * <RoleGate allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
 *   <Button onClick={handleDelete}>Usuń użytkownika</Button>
 * </RoleGate>
 *
 * // Z uprawnieniem
 * <RoleGate requiredPermission="canAccessReports">
 *   <ReportsTable />
 * </RoleGate>
 *
 * // Z fallback
 * <RoleGate
 *   allowedRoles={[UserRole.KIEROWNIK]}
 *   fallback={<p>Brak dostępu</p>}
 * >
 *   <ManagerPanel />
 * </RoleGate>
 * ```
 */

import { useAuth } from '@/features/auth/context/AuthContext';
import { UserRole, hasPermission, type Permission } from '@markbud/shared';
import type { ReactNode } from 'react';

interface RoleGateProps {
  /**
   * Lista dozwolonych ról
   * Jeśli użytkownik ma jedną z tych ról, children zostanie wyrenderowane
   */
  allowedRoles?: UserRole[];

  /**
   * Wymagane uprawnienie (np. "canAccessReports")
   * Alternatywa dla allowedRoles - sprawdza konkretne uprawnienie
   */
  requiredPermission?: Permission;

  /**
   * Treść do wyrenderowania jeśli użytkownik ma dostęp
   */
  children: ReactNode;

  /**
   * Treść do wyrenderowania jeśli użytkownik NIE ma dostępu
   * Domyślnie: null (nic się nie renderuje)
   */
  fallback?: ReactNode;
}

/**
 * RoleGate - warunkowe renderowanie na podstawie ról
 */
export function RoleGate({
  allowedRoles,
  requiredPermission,
  children,
  fallback = null
}: RoleGateProps) {
  const { user } = useAuth();

  // Brak zalogowanego użytkownika
  if (!user) {
    return <>{fallback}</>;
  }

  // Sprawdź allowedRoles
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <>{fallback}</>;
  }

  // Sprawdź requiredPermission
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return <>{fallback}</>;
  }

  // Użytkownik ma dostęp
  return <>{children}</>;
}
