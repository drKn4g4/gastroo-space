export type VatRateCode = 'zw' | 'np' | '0' | '5' | '8' | '23';
export type PromotionType = 'percentage' | 'fixed_price' | 'fixed_discount' | 'bundle' | 'happy_hours' | 'seasonal';
export type PromotionStatus = 'draft' | 'active' | 'scheduled' | 'expired' | 'archived';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface MenuFiscalization {
  vatRate: VatRateCode;
  ptuLabel: string;
  fiscalName?: string;
  pluCode?: string;
  gtin?: string;
}

export interface PriceHistoryEntry {
  price: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  reason?: string;
}

export interface PromotionScope {
  menuItemIds?: string[];
  categoryIds?: string[];
  tags?: string[];
}

export interface PromotionSchedule {
  startAt?: Date;
  endAt?: Date;
  daysOfWeek?: number[];
  timeRanges?: Array<{
    from: string;
    to: string;
  }>;
}

export interface Promotion {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  stackable: boolean;
  scope: PromotionScope;
  schedule: PromotionSchedule;
  discountPercentage?: number;
  discountAmount?: MoneyAmount;
  fixedPrice?: MoneyAmount;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonalMenu {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  active: boolean;
  startAt: Date;
  endAt?: Date;
  categoryIds: string[];
  menuItemIds: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
