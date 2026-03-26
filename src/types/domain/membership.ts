import type { MemberRole } from './common';
import type { Permission } from './permissions';
import type { EmploymentPositionHistoryEntry } from './profile';
import type { PermissionOverrides } from './roleProfiles';
import type { StaffConnectAccount, StaffTipBalance } from './billing';

export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'ended';

export interface UserMembership {
  orgId: string;
  role: MemberRole | 'alien';
  roleTemplateKey?: string;
  title?: string;
  /** 4-digit PIN unique within the organization, used for PINpad lock-screen login */
  pin?: string;
  permissions: Permission[];
  permissionOverrides?: PermissionOverrides;
  restaurantIds?: string[];
  venueIds?: string[];
  status: MembershipStatus;
  isActive: boolean;
  startedAt?: Date;
  endedAt?: Date;
  currentPosition?: string;
  positionHistory?: EmploymentPositionHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;

  /** Accumulated tip balance for this staff member in this org */
  tipBalance?: StaffTipBalance;
  /** Stripe Express account for tip withdrawals */
  staffConnect?: StaffConnectAccount;
}