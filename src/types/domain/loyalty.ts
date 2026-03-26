/**
 * Loyalty & Promotions Domain
 */

/**
 * /loyaltyCards/{cardId}
 * Global loyalty card resolved from QR code
 */
export interface LoyaltyCard {
  id: string;
  userId: string;
  qrVersion: number;
  status: 'active' | 'blocked' | 'rotated' | 'archived';
  issuedAt: Date;
  rotatedAt?: Date;
  lastUsedAt?: Date;
}

/**
 * /users/{uid}/loyaltyAccounts/{orgId}
 * Loyalty balance per organization
 */
export interface LoyaltyAccount {
  organizationId: string;
  userId: string;
  cardId: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/loyaltyRewards/{rewardId}
 */
export interface LoyaltyReward {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: 'discount' | 'free_item' | 'upgrade' | 'voucher' | 'custom';
  pointsCost: number;
  active: boolean;
  menuItemId?: string;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/loyaltyScanEvents/{scanId}
 */
export interface LoyaltyScanEvent {
  id: string;
  organizationId: string;
  cardId: string;
  targetUserId: string;
  staffUserId: string;
  action: 'earn' | 'redeem' | 'preview' | 'identify';
  result: 'accepted' | 'rejected' | 'error';
  rewardId?: string;
  transactionId?: string;
  createdAt: Date;
}

