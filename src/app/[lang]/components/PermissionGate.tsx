'use client';

import { ReactNode } from 'react';
import { useOrganization } from '../providers/OrganizationProvider';
import { Permission, MemberRole } from '@/types/organization';

interface PermissionGateProps {
  /** Show children only if user has this permission */
  permission?: Permission | string;
  /** Show children only if user has one of these roles */
  roles?: MemberRole[];
  /** Fallback UI when access is denied (default: null) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role/permissions.
 *
 * @example
 * <PermissionGate permission={PERMISSIONS.MENU_MANAGE}>
 *   <EditMenuButton />
 * </PermissionGate>
 *
 * <PermissionGate roles={['owner', 'admin', 'manager']}>
 *   <TeamManagement />
 * </PermissionGate>
 */
export default function PermissionGate({
  permission,
  roles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasRole, loading } = useOrganization();

  if (loading) return null;

  if (permission && !hasPermission(permission)) return <>{fallback}</>;
  if (roles && !hasRole(roles)) return <>{fallback}</>;

  return <>{children}</>;
}
