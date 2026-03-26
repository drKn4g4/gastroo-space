/**
 * User & Gastronaut Profiles Domain
 */
import { MemberRole } from './common';

export const GASTRO_TAGS = [
  // Professional roles
  'waiter',
  'bartender',
  'chef',
  'cook',
  'manager',
  'hostess',
  'sommelier',
  'barista',
  'kitchen_helper',
  'cleaner',
  'delivery',
  'other',
  // Foodie preference tags (used in onboarding)
  'tapas', 'carbonara', 'sushi', 'burger', 'ramen',
  'pasta', 'vegan', 'steak', 'brunch', 'street_food',
  'craft_beer', 'specialty_coffee', 'low_carb', 'neapolitan_pizza',
  'pad_thai', 'curry', 'dim_sum', 'cocktail_bar',
  'omakase', 'matcha', 'speakeasy', 'bbq', 'poke',
  'kebab', 'pierogi', 'gyoza', 'tacos', 'wine_bar',
] as const;

export type GastroTag = (typeof GASTRO_TAGS)[number];

/**
 * Stable allergen IDs a1-a14 for backend logic and language-agnostic storage.
 */
export type AllergenStableId =
  | 'gluten'
  | 'shellfish'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'tree-nuts'
  | 'milk'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'soy'
  | 'sulphites'
  | 'molluscs'
  | 'crustaceans'
  | 'lupin';

/**
 * Legacy alias for AllergenStableId to maintain backward compatibility with components.
 */
export type AllergenCode = AllergenStableId;

/**
 * Standard EU Allergen Labels and Icons (a1-a14).
 * Used for UI rendering, filtering, and cross-platform consistency.
 */
export const ALLERGEN_LABELS: Record<AllergenStableId, { pl: string; en: string; icon: string }> = {
  gluten: { pl: 'Gluten', en: 'Gluten', icon: '🌾' },
  shellfish: { pl: 'Skorupiaki / Małże', en: 'Shellfish', icon: '🐚' },
  eggs: { pl: 'Jaja', en: 'Eggs', icon: '🥚' },
  fish: { pl: 'Ryby', en: 'Fish', icon: '🐟' },
  peanuts: { pl: 'Orzeszki ziemne', en: 'Peanuts', icon: '🥜' },
  'tree-nuts': { pl: 'Orzechy', en: 'Tree nuts', icon: '🌰' },
  milk: { pl: 'Mleko', en: 'Milk', icon: '🥛' },
  celery: { pl: 'Seler', en: 'Celery', icon: '🥗' },
  mustard: { pl: 'Gorczyca', en: 'Mustard', icon: '🧴' },
  sesame: { pl: 'Sezam', en: 'Sesame', icon: '🥯' },
  soy: { pl: 'Soja', en: 'Soybeans', icon: '🌱' },
  sulphites: { pl: 'Siarczyny', en: 'Sulphites', icon: '🍷' },
  molluscs: { pl: 'Mięczaki', en: 'Molluscs', icon: '🐚' },
  crustaceans: { pl: 'Skorupiaki', en: 'Crustaceans', icon: '🦞' },
  lupin: { pl: 'Łubin', en: 'Lupin', icon: '🌸' },
};

export type UserViewMode = 'foodie' | 'gastronaut';

/**
 * /users/{userId}
 * User profile data (synced when user first logs in)
 */
export interface UserProfile {
  userId: string;
  email: string;
  name?: string;
  photoURL?: string;

  /** Whether this user is a gastronomy professional */
  gastronaut: boolean;

  /** Universal 12-digit numeric code (xxxx-xxxx-xxxx) — loyalty, vouchers, bookings, referrals */
  userCode: string;
  /** QR version — incremented on code rotation */
  qrVersion: number;

  phone?: string;
  /** Personal allergen sensitivities (EU a1-a14) */
  allergens?: AllergenStableId[];
  /** Gastro preference tags (autocomplete from predefined list) */
  gastroTags?: string[];

  /** Whether user completed post-registration onboarding */
  onboardingCompleted: boolean;

  loyaltyCardId?: string;

  organizations: string[]; // Org IDs user belongs to
  recentOrganization?: {
    orgId: string;
    restaurantId?: string;
  };

  /** Active view mode — 'foodie' | 'gastronaut', only when gastronaut=true + has memberships */
  viewMode?: UserViewMode;

  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * /users/{uid}/gastronautProfile/main
 */
export interface GastronautProfile {
  userId: string;
  enabled: boolean;
  headline?: string;
  bio?: string;
  primaryRoles: MemberRole[];
  achievements?: string[];
  organizationsWorked: number;
  totalKudos: number;
  experienceYears?: number;
  updatedAt: Date;
}

/**
 * /users/{uid}/cv/{entryId}
 * Gastronaut CV — work history entries based on Google Maps places.
 */
export interface CvEntry {
  id: string;
  placeName: string;
  placeAddress?: string;
  googlePlaceId?: string;
  organizationId?: string;
  organizationName?: string;
  position: string;
  roleCategory?: string;
  startedAt: Date;
  endedAt?: Date;
  description?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * /users/{uid}/discoveryProfile/main
 */
export interface DiscoveryProfile {
  uid: string;
  preferredLanguage: 'pl' | 'en';
  blockedAllergens: AllergenStableId[];
  tags: {
    petFriendly?: boolean;
    wifi?: boolean;
    vegetarian?: boolean;
    vegan?: boolean;
  };
  geo?: {
    geohash?: string;
    lat: number;
    lng: number;
  };
  updatedAt: Date;
}
