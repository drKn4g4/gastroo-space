/**
 * Firestore Collection Structure & Data Models
 * Re-exports everything from modular domain types to maintain backward compatibility.
 */

export * from '@/types/domain/user';
export * from '@/types/domain/organization';
export * from '@/types/domain/restaurant';
export * from '@/types/domain/menu';
export * from '@/types/domain/loyalty';
export * from '@/types/domain/social';
export * from '@/types/domain/jobs';

import {
  UserProfile,
  GastronautProfile,
  CvEntry,
  DiscoveryProfile
} from '@/types/domain/user';
import {
  Organization,
  BinaryAssetMeta,
  AuditLogEntry,
  TipLedgerDoc
} from '@/types/domain/organization';
import {
  Member,
  Invite,
} from '@/types/domain/team';
import {
  Restaurant,
  Table,
  Booking,
  Order,
  Incident,
  SlotZeroPaymentDoc
} from '@/types/domain/restaurant';
import {
  MenuCategory,
  MenuItem,
  InventoryIngredient,
  Recipe
} from '@/types/domain/menu';
import {
  LoyaltyCard,
  LoyaltyAccount,
  LoyaltyReward,
  LoyaltyScanEvent,
} from '@/types/domain/loyalty';
import { Promotion } from '@/types/domain/commercial';
import {
  KudosEntry,
  HeartEvent
} from '@/types/domain/social';
import {
  JobOffer,
  VerificationRequest
} from '@/types/domain/jobs';

/**
 * Union type of all possible Firestore documents in the system.
 */
export type FirestoreDocument =
  | UserProfile
  | Organization
  | Member
  | Invite
  | Restaurant
  | MenuCategory
  | MenuItem
  | Booking
  | Table
  | Order
  | Incident
  | BinaryAssetMeta
  | InventoryIngredient
  | Recipe
  | LoyaltyCard
  | LoyaltyAccount
  | LoyaltyReward
  | LoyaltyScanEvent
  | Promotion
  | GastronautProfile
  | KudosEntry
  | DiscoveryProfile
  | HeartEvent
  | AuditLogEntry
  | CvEntry
  | JobOffer
  | VerificationRequest
  | SlotZeroPaymentDoc
  | TipLedgerDoc;
