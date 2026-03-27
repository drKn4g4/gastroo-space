/**
 * Menu & Inventory Domain
 */
import { AllergenStableId } from './user';

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/menuCategories/{categoryId}
 * Menu category (e.g., "Starters", "Main Courses")
 */
export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  translations?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
  };
  sortOrder: number;
  visible: boolean;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get category name with i18n fallback support.
 */
export function getMenuCategoryName(
  cat: MenuCategory,
  lang: string,
  fallback: string = 'pl'
): string {
  if (cat.translations?.name?.[lang]) return cat.translations.name[lang];
  if (cat.translations?.name?.[fallback]) return cat.translations.name[fallback];
  return cat.name;
}

/**
 * Get category description with i18n fallback support.
 */
export function getMenuCategoryDescription(
  cat: MenuCategory,
  lang: string,
  fallback: string = 'pl'
): string {
  if (cat.translations?.description?.[lang]) return cat.translations.description[lang];
  if (cat.translations?.description?.[fallback]) return cat.translations.description[fallback];
  return cat.description || '';
}



/**
 * /organizations/{orgId}/restaurants/{restaurantId}/menuItems/{itemId}
 * Individual menu item/dish
 */
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  translations?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
  };
  categoryId: string;
  price: number; // in cents (1000 = 10.00)
  basePrice?: number;
  lowestPriceLast30Days?: number;
  currency?: string;
  
  // Allergens (EU 14)
  allergens: AllergenStableId[];
  
  // Dietary info
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    spicy: boolean;
  };
  tags?: string[];
  weight?: {
    value: number;
    unit: 'g' | 'kg' | 'ml' | 'l' | 'szt' | 'op' | 'por';
  };
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
  fiscalization?: {
    vatRate: 'zw' | 'np' | '0' | '5' | '8' | '23';
    ptuLabel: string;
    fiscalName?: string;
    pluCode?: string;
    gtin?: string;
  };
  priceHistory?: Array<{
    price: number;
    currency: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
    reason?: string;
  }>;
  
  portions?: Array<{
    name: string;
    size: string;
    priceModifier: number;
  }>;
  
  image?: string; // URL
  itemType?: 'ingredient' | 'product' | 'dish' | 'beverage' | 'cocktail' | 'packaging';
  gbp?: {
    publish?: boolean;
    locationIds?: string[];
    labels?: string[];
    sectionOverride?: string;
    syncedAt?: Date;
  };
  visible: boolean;
  archived?: boolean;
  sortOrder: number;
  recipeId?: string;      // Optional reference to a Recipe ID
  ingredientsList?: string; // Optional raw string of ingredients (mostly for display purposes)
  orderCount?: number;     // Popularity metric for sorting

  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get menu item name with i18n fallback support.
 */
export function getMenuItemName(
  item: MenuItem,
  lang: string,
  fallback: string = 'pl'
): string {
  if (item.translations?.name?.[lang]) return item.translations.name[lang];
  if (item.translations?.name?.[fallback]) return item.translations.name[fallback];
  return item.name;
}

/**
 * Get menu item description with i18n fallback support.
 */
export function getMenuItemDescription(
  item: MenuItem,
  lang: string,
  fallback: string = 'pl'
): string {
  if (item.translations?.description?.[lang]) return item.translations.description[lang];
  if (item.translations?.description?.[fallback]) return item.translations.description[fallback];
  return item.description || '';
}

/**
 * Standard item types for menu management and point of sale.
 */
export const MENU_ITEM_TYPES = [
  'ingredient',
  'product',
  'dish',
  'beverage',
  'cocktail',
  'packaging',
] as const;



/**
 * /organizations/{orgId}/restaurants/{restaurantId}/ingredients/{ingredientId}
 */
export interface InventoryIngredient {
  id: string;
  name: string;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'szt' | 'op' | 'por';
  stockQuantity: number;
  minStockQuantity?: number;
  unitCost?: number;
  allergens: AllergenStableId[];
  vegetarian?: boolean;
  vegan?: boolean;
  caloriesPer100g?: number;
  macrosPer100g?: {
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  googleDriveInvoiceAssetId?: string;
  updatedAt: Date;
}

/**
 * /organizations/{orgId}/restaurants/{restaurantId}/recipes/{recipeId}
 */
export interface Recipe {
  id: string;
  menuItemId: string;
  ingredientIds: string[];
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: 'g' | 'kg' | 'ml' | 'l' | 'szt' | 'op' | 'por';
  }>;
  aggregatedDietary?: {
    vegetarian: boolean;
    vegan: boolean;
  };
  aggregatedMacros?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  updatedAt: Date;
}