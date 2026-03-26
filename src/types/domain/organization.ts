/**
 * Sekcja (obszar pracy, np. sala, bar, kuchnia) — globalna dla organizacji
 * /organizations/{orgId}/sections/{sectionId}
 */
export interface Section {
  id: string;
  name: string; // np. "SALA", "KUCHNIA", "BAR"
  color?: string; // HEX, np. #2e7d32
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Organization & Team Domain
 */
import { MemberRole } from './common';
import { MembershipStatus } from './membership';
import { Permission } from './permissions';
import { OrgBilling, OrgConnectAccount, TipPoolConfig } from './billing';

/**
 * /organizations/{orgId}
 * Organization (company) data
 */
export interface Organization {
  id: string;
  name: string; // "Restaurant Group A"
  slug: string; // "restaurant-group-a"
  type: 'restaurant' | 'cafe' | 'bar' | 'catering' | 'other';
  ownerId: string; // User ID of owner
  ownerEmail: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  logo?: string; // URL
  website?: string;
  timezone: string; // "Europe/Warsaw"
  location?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;

  // Feature flags
  features: {
    online_bookings: boolean;
    menu_qr: boolean;
    team_management: boolean;
    pos_system: boolean;
    loyalty_program: boolean;
    integrations: boolean;
  };

  /** Stripe billing state (SaaS subscriptions) */
  billing?: OrgBilling;
  /** Stripe Connect account (receives dine-in payments) */
  connect?: OrgConnectAccount;
  /** Tip distribution rules configured by owner */
  tipPool?: TipPoolConfig;
}

/**
 * /organizations/{orgId}/members/{userId}
 * (Interface 'Member' moved to team.ts)
 */

/**
 * /organizations/{orgId}/invites/{inviteId}
 * (Interface 'Invite' moved to team.ts)
 */


/**
 * /organizations/{orgId}/assets/{assetId}
 * BYOS binary asset metadata (source of truth points to Owner Google Drive)
 */
export interface BinaryAssetMeta {
  id: string;
  orgId: string;
  restaurantId?: string;
  kind: 'menu-photo' | 'invoice-scan' | 'contract' | 'other';
  googleDriveId: string;
  googleDriveOwnerUid: string;
  mimeType: string;
  sizeBytes?: number;
  checksumSha256?: string;
  backup: {
    enabled: boolean;
    provider: 'gcs';
    bucket?: string;
    objectPath?: string;
    lastBackupAt?: Date;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /logs/{logId}
 * Global audit trail
 */
export interface AuditLogEntry {
  id: string;
  orgId: string;
  restaurantId?: string;
  actorUid?: string;
  source: 'api' | 'function' | 'ui' | 'system';
  action: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
}

/**
 * /organizations/{orgId}/tipLedger/{entryId}
 * Tip credits and withdrawal records per staff member
 */
export interface TipLedgerDoc {
  id: string;
  userId: string;
  orgId: string;
  sessionId: string;
  type: 'credit' | 'withdrawal';
  amountCents: number;
  stripeTransferId?: string;
  createdAt: Date;
}