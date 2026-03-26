import type { MemberRole } from './common';

export type EmploymentEventType = 'joined' | 'promoted' | 'role_changed' | 'transferred' | 'ended';
export type KudosTargetRole = 'waiter' | 'bartender' | 'chef' | 'manager' | 'staff';

export interface EmploymentPositionHistoryEntry {
  title: string;
  role: MemberRole;
  startedAt: Date;
  endedAt?: Date;
  promotedBy?: string;
  note?: string;
}

export interface EmploymentEvent {
  id: string;
  userId: string;
  organizationId: string;
  restaurantId?: string;
  type: EmploymentEventType;
  title: string;
  role: MemberRole;
  effectiveAt: Date;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}

