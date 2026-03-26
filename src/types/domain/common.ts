export const MEMBER_ROLES = [
  'owner',
  'admin',
  'manager',
  'waiter',
  'chef',
  'staff',
  'supervisor',
  'bartender',
  'sommelier',
  'kitchen',
  'cashier',
  'delivery',
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];