/**
 * Stripe billing, Connect, and tip types for gastroo.space
 *
 * Three payment flows:
 * 1. SaaS subscriptions (org → Gastroo) via Stripe Subscriptions
 * 2. Dine-in payments (customer → restaurant) via Stripe Connect
 * 3. Tips (customer → org → staff) via Connect Transfers
 */

import type { MemberRole } from './common';

// ─── SaaS Packages (modular, not tiers) ─────────────────────────────────────

export const SAAS_PACKAGES = ['visibility', 'bookings', 'menu', 'crew'] as const;
export type SaaSPackage = (typeof SAAS_PACKAGES)[number];

export const SAAS_PACKAGE_LABELS: Record<SaaSPackage, { pl: string; en: string }> = {
  visibility: { pl: 'Widocznosc', en: 'Visibility' },
  bookings: { pl: 'Rezerwacje', en: 'Bookings' },
  menu: { pl: 'Menu', en: 'Menu' },
  crew: { pl: 'Zespol', en: 'Crew' },
};

// ─── Organization Billing (stored on org doc) ───────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'unpaid';

export interface OrgBilling {
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  activePackages: SaaSPackage[];
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// ─── Organization Stripe Connect (stored on org doc) ────────────────────────

export interface OrgConnectAccount {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  detailsSubmitted: boolean;
}

// ─── Staff Stripe Connect (stored on membership doc) ────────────────────────

export interface StaffConnectAccount {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
}

// ─── Tip Pool Configuration (stored on org doc) ─────────────────────────────

export type TipPoolCategory = 'waiter' | 'bar' | 'kitchen' | 'other';

export interface TipPoolRule {
  category: TipPoolCategory;
  /** Percentage of total tips allocated to this category. All rules must sum to 100. */
  percentage: number;
  /** Which MemberRoles belong to this category */
  roleIds: MemberRole[];
}

export interface TipPoolConfig {
  rules: TipPoolRule[];
  updatedAt: Date;
  updatedBy: string;
}

// ─── Staff Tip Balance (stored on membership doc) ───────────────────────────

export interface StaffTipBalance {
  accumulatedCents: number;
  withdrawnCents: number;
  /** accumulatedCents - withdrawnCents */
  availableCents: number;
  lastUpdatedAt: Date;
}

// ─── Tip Ledger Entry (new collection) ──────────────────────────────────────

export interface TipLedgerEntry {
  id: string;
  userId: string;
  orgId: string;
  sessionId: string;
  type: 'credit' | 'withdrawal';
  amountCents: number;
  stripeTransferId?: string;
  createdAt: Date;
}

// ─── Slot Zero Payment Record (new collection) ─────────────────────────────

export interface SlotZeroPaymentRecord {
  paymentIntentId: string;
  sessionId: string;
  userId: string;
  amountCents: number;
  tipCents: number;
  applicationFeeCents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: 'card' | 'cash';
  /** Staff UID who marked cash payment */
  markedBy?: string;
  createdAt: Date;
  completedAt?: Date;
}
