/**
 * Typy konfiguracji seed dla jednego lokalu.
 * Jeden plik .ts = jeden lokal = jeden backup danych testowych.
 */

import type { MemberRole, AllergenCode, MenuFiscalization, PriceHistoryEntry } from '../../src/types/organization';
import type { IngredientUnit, IngredientCategory } from '../../src/types/pos';

export type TableShape  = 'round' | 'square' | 'rectangle';
export type TableStatus = 'free' | 'occupied' | 'reserved' | 'blocked';
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoCategory = 'cleaning' | 'setup' | 'general' | 'safety' | 'finance';
export type BookingSource = 'manual' | 'phone' | 'online' | 'google' | 'thefork';

export interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  role: MemberRole;
  pin: string;                 // 4-cyfrowy PIN (unikalny w ramach organizacji)
}

export interface SeedSection {
  id: string;                  // deterministyczne ID (np. 'section-a')
  name: string;
  color: string;               // hex
  order: number;
}

export interface SeedTable {
  id: string;                  // deterministyczne ID (np. 'table-1')
  number: number;
  name?: string;
  capacity: number;
  shape: TableShape;
  sectionId?: string;          // referencja do SeedSection.id
  posX: number;                // 0–100 (% szerokości canvasu)
  posY: number;                // 0–100 (% wysokości canvasu)
  status: TableStatus;
}

export interface SeedMenuCategory {
  name: string;
  order: number;
  id?: string;
  items: Array<{
    name: string;
    price: number;
    description?: string;
    available: boolean;
    allergens?: AllergenCode[];
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    tags?: string[];
    weight?: {
      value: number;
      unit: 'g' | 'kg' | 'ml' | 'l';
    };
    itemType?: 'ingredient' | 'product' | 'dish' | 'beverage' | 'cocktail';
    basePrice?: number;
    lowestPriceLast30Days?: number;
    macros?: {
      calories?: number;
      protein?: number;
      fat?: number;
      carbs?: number;
      fiber?: number;
    };
    nutritionSource?: 'manual' | 'derived_from_recipe';
    basePrepTime?: number;
    targetPrepTime?: number;
    fiscalization?: MenuFiscalization;
    priceHistory?: PriceHistoryEntry[];
  }>;
}

export interface SeedBooking {
  dayOffset: number;           // względem dnia uruchomienia seed (0 = dzisiaj)
  bookingTime: string;         // 'HH:mm'
  bookingTimeEnd?: string;     // 'HH:mm'
  name: string;
  guestCount: number;
  guestPhone?: string;
  guestEmail?: string;
  notes?: string;
  source?: BookingSource;
  status?: 'confirmed' | 'pending' | 'cancelled';
  tableId?: string;            // referencja do SeedTable.id
  tableNumber?: number;
  tableName?: string;
  createdByName?: string;
}

export interface SeedShift {
  role: MemberRole;
  displayName: string;
  startHour: number;
  endHour: number;
}

export interface SeedTodoTask {
  title: string;
  description?: string;
  assignedToRoles: MemberRole[];
  isGroupTask: boolean;
  priority: TodoPriority;
  category: TodoCategory;
}

export interface SeedIngredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  category: IngredientCategory;
  allergens: AllergenCode[];
  vegetarian?: boolean;
  vegan?: boolean;
  caloriesPer100g?: number;
  macrosPer100g?: {
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  stockQuantity: number;
  minStockQuantity?: number;
  unitCost?: number;
}

export interface SeedRecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  preparationNote?: string;
}

export interface SeedRecipe {
  /** Musi odpowiadać name dania w menuCategories */
  menuItemName: string;
  ingredients: SeedRecipeIngredient[];
  basePrepTimeMin: number;
  preparationSteps?: string;
  servings: number;
}

/**
 * Konfiguracja tylko dla jednego lokalu (bez org i userów).
 * Używana dla drugiego, trzeciego itp. lokalu w ramach tej samej org.
 */
export type SeedRestaurantData = Omit<SeedConfig, 'organization' | 'users'>;

export interface SeedConfig {
  /** Dane organizacji */
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    plan: string;
    features: string[];
    location?: {
      lat: number;
      lng: number;
    };
  };

  /** Dane lokalu (restauracji) */
  restaurant: {
    id: string;
    name: string;
    description?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    phone: string;
    email?: string;
    website?: string;
    timezone: string;
    location?: {
      lat: number;
      lng: number;
    };
    tags?: string[];
    socialLinks?: {
      instagram?: string;
      facebook?: string;
    };
    capacity?: number;
    tableCount?: number;
    gbpAttributes?: {
      petFriendly?: boolean;
      lgbtFriendly?: boolean;
      veganOptions?: boolean;
      outdoorSeating?: boolean;
      familyFriendly?: boolean;
    };
    settings: {
      currency: string;
      language: string;
      bookingDuration: number;
      depositAmount: number;
    };
  };

  users:           SeedUser[];
  sections:        SeedSection[];
  tables:          SeedTable[];
  menuCategories:  SeedMenuCategory[];
  bookings:        SeedBooking[];
  shifts:          SeedShift[];
  todoTasks:       SeedTodoTask[];
  ingredients?:    SeedIngredient[];
  recipes?:        SeedRecipe[];
}
