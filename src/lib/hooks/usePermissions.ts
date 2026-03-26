'use client';

import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { PERMISSIONS, Permission, MemberRole } from '@/types/organization';

export { PERMISSIONS };

export function usePermissions() {
  const { member, hasPermission, hasRole } = useOrganization();

  return {
    // Raw checks
    can: (permission: Permission | string) => hasPermission(permission),
    is: (roles: MemberRole | MemberRole[]) =>
      hasRole(Array.isArray(roles) ? roles : [roles]),

    // Bookings
    canViewBookings:    hasPermission(PERMISSIONS.BOOKINGS_VIEW),
    canCreateBookings:  hasPermission(PERMISSIONS.BOOKINGS_CREATE),
    canEditBookings:    hasPermission(PERMISSIONS.BOOKINGS_UPDATE),
    canDeleteBookings:  hasPermission(PERMISSIONS.BOOKINGS_DELETE),

    // Orders / POS
    canManageOrders:    hasPermission(PERMISSIONS.ORDERS_VIEW),

    // Menu
    canViewMenu:        hasPermission(PERMISSIONS.MENU_VIEW),
    canManageMenu:      hasPermission(PERMISSIONS.MENU_MANAGE),

    // Kitchen / KDS
    canViewKitchen:     hasPermission(PERMISSIONS.KITCHEN_VIEW),

    // Inventory
    canViewInventory:   hasPermission(PERMISSIONS.INVENTORY_VIEW),

    // Payments / Finance
    canViewPayments:    hasPermission(PERMISSIONS.PAYMENTS_VIEW),

    // Schedule / Timeclock
    canViewSchedule:    hasPermission(PERMISSIONS.SCHEDULE_VIEW),

    // Staff / Team
    canViewStaff:       hasPermission(PERMISSIONS.STAFF_VIEW),
    canManageStaff:     hasPermission(PERMISSIONS.STAFF_MANAGE),

    // Customers / CRM
    canViewCustomers:   hasPermission(PERMISSIONS.CUSTOMERS_VIEW),

    // Chat
    canViewChat:        hasPermission(PERMISSIONS.CHAT_VIEW),

    // Settings
    canViewSettings:    hasPermission(PERMISSIONS.SETTINGS_VIEW),
    canManageSettings:  hasPermission(PERMISSIONS.SETTINGS_MANAGE),

    // Integrations
    canViewIntegrations: hasPermission(PERMISSIONS.INTEGRATIONS_VIEW),

    // Members
    canViewMembers:     hasPermission(PERMISSIONS.MEMBERS_VIEW),
    canManageMembers:   hasPermission(PERMISSIONS.MEMBERS_MANAGE),

    // Convenience role checks
    isOwner: member?.role === 'owner',
    isAdmin: member?.role === 'admin',
    isManager: member?.role === 'manager',
    isWaiter: member?.role === 'waiter',
    isChef: member?.role === 'chef',

    role: member?.role ?? null,
  };
}
