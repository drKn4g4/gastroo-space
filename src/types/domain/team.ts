import type { Permission } from './permissions';
import type { MemberRole } from './common';
import type { MembershipStatus } from './membership';
import type { PermissionOverrides } from './roleProfiles';

/**
 * Staff history entry for CV and performance tracking.
 */
export interface StaffHistoryEntry {
  restaurantId: string;
  role: string | MemberRole;
  from: Date;
  to?: Date;
  tablesServed?: number;
  shifts?: number;
  notes?: string;
}

/**
 * /organizations/{orgId}/members/{userId}
 */
export interface Member {
  userId: string;
  email: string;
  name?: string;
  role: MemberRole;
  title?: string;
  pin?: string; // 4-digit PIN unique within the organization
  permissions: Permission[];
  permissionOverrides?: PermissionOverrides;
  status: MembershipStatus;
  restaurantIds: string[]; // Restaurants they can access
  sectionIds?: string[]; // Sekcje (obszary), do których należy (opcjonalnie)
  joinedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  roleTemplateKey?: string;
  invitedBy?: string;
  history?: StaffHistoryEntry[];
}

/**
 * /organizations/{orgId}/invites/{inviteId}
 */
export interface Invite {
  id: string;
  email: string;
  role: string | MemberRole;
  roleTemplateKey?: string;
  restaurantIds: string[];
  permissionOverrides?: PermissionOverrides;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdBy: string;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Flattened view of a team member for UI tables and lists.
 */
export interface TeamMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  restaurantIds: string[];
  joinedAt: Date;
  invitedBy?: string;
  status: MembershipStatus;
  history?: StaffHistoryEntry[];
}