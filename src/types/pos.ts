/**
 * POS-specific types — stoliki, zmiany, zadania, rachunki, magazyn, receptury
 * Przechowywane w: organizations/{orgId}/restaurants/{restId}/...
 */

import type { AllergenCode } from './organization';
import type { MenuFiscalization, PriceHistoryEntry } from './domain/commercial';
import type { MenuItem } from './domain/menu';

/** Re-export convenience aliases used by POS types */
type MenuItemType = MenuItem['itemType'];
type MenuTextTranslations = MenuItem['translations'];
type GoogleBusinessProfileMenuPublication = MenuItem['gbp'];

// ─── Magazyn / Składniki ──────────────────────────────────────────────────────

export type IngredientUnit =
  | 'g' | 'kg'        // waga
  | 'ml' | 'l'        // objętość
  | 'szt'             // sztuka
  | 'op'              // opakowanie
  | 'por';            // porcja

export type IngredientCategory =
  | 'meat'      // Mięso i wędliny
  | 'fish'      // Ryby i owoce morza
  | 'dairy'     // Nabiał
  | 'vegetables'// Warzywa
  | 'fruits'    // Owoce
  | 'grains'    // Zboża i mąki
  | 'spices'    // Przyprawy i zioła
  | 'oils'      // Oleje i tłuszcze
  | 'sauces'    // Sosy i pasty
  | 'alcohol'   // Alkohole
  | 'beverages' // Napoje bezalkoholowe
  | 'other';    // Inne

export interface Ingredient {
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
  /** Aktualna ilość na stanie */
  stockQuantity: number;
  /** Minimalna ilość — alert przy przekroczeniu */
  minStockQuantity?: number;
  /** Koszt jednostkowy w PLN */
  unitCost?: number;
  restaurantId: string;
  createdAt: Date;
}

// ─── Receptury ────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;     // denormalizacja dla szybkiego wyświetlania
  quantity: number;
  unit: IngredientUnit;
  /** Opcjonalne wskazówki: "posiekać drobno", "blanszować 2 min" */
  preparationNote?: string;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  menuItemName: string;       // denormalizacja
  ingredients: RecipeIngredient[];
  /** Alergeny agregowane automatycznie ze składników */
  aggregatedAllergens: AllergenCode[];
  /** Flagi diet agregowane automatycznie ze składników */
  aggregatedDietary?: {
    vegetarian: boolean;
    vegan: boolean;
  };
  /** Makro agregowane automatycznie z gramatur składników */
  aggregatedMacros?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  /** Koszt receptury (suma unit_cost * quantity) */
  totalCost?: number;
  /** Bazowy czas przygotowania w minutach (bez obłożenia) */
  basePrepTimeMin: number;
  /** Opis techniki przygotowania dania */
  preparationSteps?: string;
  servings: number;
  restaurantId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MenuCatalogItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  translations?: MenuTextTranslations;
  price: number;
  basePrice?: number;
  lowestPriceLast30Days?: number;
  currency: string;
  allergens?: AllergenCode[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  tags?: string[];
  weight?: {
    value: number;
    unit: 'g' | 'kg' | 'ml' | 'l';
  };
  macros?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  nutritionSource?: 'manual' | 'derived_from_recipe';
  itemType?: MenuItemType;
  recipeId?: string;
  basePrepTime?: number;
  targetPrepTime?: number;
  fiscalization?: MenuFiscalization;
  priceHistory?: PriceHistoryEntry[];
  gbp?: GoogleBusinessProfileMenuPublication;
  restaurantId: string;
  createdAt: Date;
  updatedAt?: Date;
}

// ─── Rezerwacje (POS view) ───────────────────────────────────────────────────

export interface BookingSummary {
  id: string;
  name: string;
  guestCount: number;
  bookingDate: string;   // YYYY-MM-DD
  bookingTime: string;   // HH:mm
  notes?: string | null;
  status: string;
}

// ─── Stoliki ─────────────────────────────────────────────────────────────────

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'blocked';
export type TableShape  = 'round' | 'square' | 'rectangle';

export interface Section {
  id: string;
  name: string;
  color: string;          // hex
  restaurantId: string;
  order: number;
}

export interface Table {
  id: string;
  number: number;
  name?: string;           // np. "Taras 1", "Bar"
  capacity: number;
  shape: TableShape;
  sectionId?: string;
  mergedGroupId?: string;
  // pozycja na planie sali (0–100 = procenty szerokości/wysokości)
  posX: number;
  posY: number;
  status: TableStatus;
  currentBillId?: string;
  currentReservationId?: string;
  restaurantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Log stolika — historia rezerwacji i płatności ─────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'bank' | 'mixed';

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number;          // PLN
  tip?: number;           // napiwek PLN
  processedAt: Date;
  processedBy: string;    // staff uid / name
  cardLast4?: string;     // dla kart: ostatnie 4 cyfry
  notes?: string;
}

export interface TableLogEntry {
  id: string;
  tableId: string;
  restaurantId: string;
  
  // Rezerwacja
  reservationId?: string;
  guestName?: string;
  guestPhone?: string;
  guestCount?: number;
  reservationTime?: string;      // HH:mm
  reservationNotes?: string;     // alergie, note od gościa
  reservedBy?: string;           // uid staff'a który przyjął rezerwację
  
  // Check-in / obecność
  actualCheckInTime?: Date;
  checkedInBy?: string;
  
  // Rachunek
  billId?: string;
  billOpenTime?: Date;
  billCloseTime?: Date;
  billItems?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  billTotal?: number;
  
  // Płatność
  payments: PaymentRecord[];
  
  // Zamknięcie stolika
  closedAt?: Date;
  closedBy?: string;
  totalDuration?: number;  // minuty — od check-in do zamknięcia
  totalSpent?: number;     // suma wszystkich płatności
  
  // Notatki
  internalNotes?: string;  // dla personelu (np. "gość bardzo nie zadowolony")
  createdAt: Date;
}

// ─── Zmiany (shifts) ─────────────────────────────────────────────────────────

export type ShiftStatus = 'scheduled' | 'active' | 'on_break' | 'completed';

export interface ShiftBreak {
  start: Date;
  end?: Date;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  restaurantId: string;
  date: string;            // YYYY-MM-DD
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  breaks: ShiftBreak[];
  status: ShiftStatus;
}

// ─── Todo tasks ───────────────────────────────────────────────────────────────

export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoCategory  = 'cleaning' | 'setup' | 'general' | 'safety' | 'finance';

export interface TodoTask {
  id: string;
  title: string;
  description?: string;
  assignedToRoles: string[];  // które role widzą to zadanie
  assignedToUsers?: string[]; // konkretni pracownicy (opcjonalne)
  isGroupTask: boolean;       // true = jedna osoba klika = gotowe dla wszystkich
  shiftDate: string;          // YYYY-MM-DD — zadania resetują się codziennie
  completedBy?: string;       // uid
  completedAt?: Date;
  priority: TodoPriority;
  category: TodoCategory;
  restaurantId: string;
}

// ─── Rachunki (bills) ────────────────────────────────────────────────────────

export type BillStatus = 'open' | 'closed' | 'paid' | 'cancelled';

export interface BillItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;           // PLN
  quantity: number;
  notes?: string;
}

export interface Bill {
  id: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  staffId: string;         // kto otworzył rachunek
  items: BillItem[];
  status: BillStatus;
  openedAt: Date;
  closedAt?: Date;
  totalAmount: number;     // suma PLN
  notes?: string;
}
