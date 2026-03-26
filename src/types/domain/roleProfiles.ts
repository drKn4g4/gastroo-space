import type { MemberRole } from './common';
import type { Permission } from './permissions';
import { PERMISSIONS, ROLE_PERMISSIONS } from './permissions';

export type RoleFamily =
  | 'owner'
  | 'management'
  | 'service'
  | 'bar'
  | 'kitchen'
  | 'operations';

export interface PermissionOverrides {
  add?: Permission[];
  remove?: Permission[];
}

export interface RoleTemplate {
  key: string;
  family: RoleFamily;
  label: { pl: string; en: string };
  defaultMemberRole: MemberRole;
  defaultPermissions: Permission[];
  description?: string;
}

// Szablony ról są generyczne (np. junior/senior), a realne uprawnienia nadal
// można nadpisywać indywidualnie per użytkownik przez PermissionOverrides.
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: 'owner-captain',
    family: 'owner',
    label: { pl: 'Kapitan floty (Właściciel)', en: 'Fleet Captain (Owner)' },
    defaultMemberRole: 'owner',
    defaultPermissions: ROLE_PERMISSIONS.owner,
  },
  {
    key: 'management-floor-manager',
    family: 'management',
    label: { pl: 'Manager sali', en: 'Floor Manager' },
    defaultMemberRole: 'manager',
    defaultPermissions: ROLE_PERMISSIONS.manager,
  },
  {
    key: 'service-junior-waiter',
    family: 'service',
    label: { pl: 'Młodszy kelner', en: 'Junior Waiter' },
    defaultMemberRole: 'waiter',
    defaultPermissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.MENU_VIEW,
      PERMISSIONS.TABLES_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_UPDATE,
      PERMISSIONS.KITCHEN_VIEW,
      PERMISSIONS.LOYALTY_SCAN,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.INCIDENTS_REPORT,
    ],
  },
  {
    key: 'service-waiter',
    family: 'service',
    label: { pl: 'Kelner', en: 'Waiter' },
    defaultMemberRole: 'waiter',
    defaultPermissions: ROLE_PERMISSIONS.waiter,
  },
  {
    key: 'service-senior-waiter',
    family: 'service',
    label: { pl: 'Starszy kelner', en: 'Senior Waiter' },
    defaultMemberRole: 'waiter',
    defaultPermissions: Array.from(
      new Set([...ROLE_PERMISSIONS.waiter, PERMISSIONS.SCHEDULE_MANAGE, PERMISSIONS.BOOKINGS_EXPORT]),
    ),
  },
  {
    key: 'bar-junior-bartender',
    family: 'bar',
    label: { pl: 'Młodszy barman', en: 'Junior Bartender' },
    defaultMemberRole: 'bartender',
    defaultPermissions: [
      PERMISSIONS.MENU_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_UPDATE,
      PERMISSIONS.PAYMENTS_PROCESS,
      PERMISSIONS.LOYALTY_SCAN,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.INCIDENTS_REPORT,
    ],
  },
  {
    key: 'bar-bartender',
    family: 'bar',
    label: { pl: 'Barman', en: 'Bartender' },
    defaultMemberRole: 'bartender',
    defaultPermissions: ROLE_PERMISSIONS.bartender,
  },
  {
    key: 'bar-senior-bartender',
    family: 'bar',
    label: { pl: 'Starszy barman', en: 'Senior Bartender' },
    defaultMemberRole: 'bartender',
    defaultPermissions: Array.from(
      new Set([...ROLE_PERMISSIONS.bartender, PERMISSIONS.DISCOUNTS_MANAGE, PERMISSIONS.INVENTORY_ADJUST]),
    ),
  },
  {
    key: 'kitchen-commis',
    family: 'kitchen',
    label: { pl: 'Commis Chef (Młodszy kucharz)', en: 'Commis Chef (Junior Cook)' },
    defaultMemberRole: 'kitchen',
    defaultPermissions: [
      PERMISSIONS.KITCHEN_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.INCIDENTS_REPORT,
    ],
    description: 'Pozycja wejściowa w kuchni, praca pod nadzorem.',
  },
  {
    key: 'kitchen-demi-chef-de-partie',
    family: 'kitchen',
    label: { pl: 'Demi-Chef de Partie', en: 'Demi-Chef de Partie' },
    defaultMemberRole: 'chef',
    defaultPermissions: [
      PERMISSIONS.MENU_VIEW,
      PERMISSIONS.KITCHEN_VIEW,
      PERMISSIONS.KITCHEN_MANAGE,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.INCIDENTS_REPORT,
    ],
    description: 'Zastępca szefa sekcji kuchni.',
  },
  {
    key: 'kitchen-chef-de-partie',
    family: 'kitchen',
    label: { pl: 'Chef de Partie', en: 'Chef de Partie' },
    defaultMemberRole: 'chef',
    defaultPermissions: [
      PERMISSIONS.MENU_VIEW,
      PERMISSIONS.MENU_MANAGE,
      PERMISSIONS.KITCHEN_VIEW,
      PERMISSIONS.KITCHEN_MANAGE,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.INCIDENTS_REPORT,
    ],
    description: 'Szef sekcji kuchni odpowiedzialny za jakość i wydajność.',
  },
  {
    key: 'kitchen-sous-chef',
    family: 'kitchen',
    label: { pl: 'Sous-Chef', en: 'Sous-Chef' },
    defaultMemberRole: 'chef',
    defaultPermissions: Array.from(
      new Set([...ROLE_PERMISSIONS.chef, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.STAFF_VIEW]),
    ),
    description: 'Zastępca szefa kuchni, nadzoruje pracę zmiany.',
  },
  {
    key: 'kitchen-chef-de-cuisine',
    family: 'kitchen',
    label: { pl: 'Chef de Cuisine (Szef kuchni)', en: 'Chef de Cuisine (Head Chef)' },
    defaultMemberRole: 'chef',
    defaultPermissions: Array.from(
      new Set([
        ...ROLE_PERMISSIONS.chef,
        PERMISSIONS.STAFF_MANAGE,
        PERMISSIONS.SCHEDULE_MANAGE,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
      ]),
    ),
    description: 'Najwyższa rola operacyjna w kuchni.',
  },
];

export const ROLE_TEMPLATES_BY_KEY = ROLE_TEMPLATES.reduce<Record<string, RoleTemplate>>((acc, role) => {
  acc[role.key] = role;
  return acc;
}, {});
