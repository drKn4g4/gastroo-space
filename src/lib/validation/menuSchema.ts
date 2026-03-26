import { z } from 'zod';

/**
 * Menu Item Validation Schema
 *  Ensures menu items have valid structure before saving to Firestore
 */

export const allergensEnum = z.enum([
  'gluten', 'shellfish', 'eggs', 'fish', 'peanuts', 'tree-nuts',
  'milk', 'celery', 'mustard', 'sesame', 'soy', 'sulphites',
  'molluscs', 'crustaceans', 'lupin',
]);

export const menuItemSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, 'Kategoria jest wymagana'),
  name: z
    .string()
    .min(2, 'Nazwa dania musi mieć co najmniej 2 znaki')
    .max(100, 'Nazwa dania może mieć maksymalnie 100 znaków')
    .trim()
    .refine((val) => val.length > 0, 'Pole wymagane'),

  description: z
    .string()
    .max(500, 'Opis może mieć maksymalnie 500 znaków')
    .trim()
    .optional()
    .default(''),

  price: z
    .number()
    .positive('Cena musi być większa niż 0')
    .finite('Cena musi być liczbą')
    .refine(
      (price) => !isNaN(price) && price > 0,
      'Nieprawidłowa cena'
    )
    .refine(
      (price) => Math.round(price * 100) / 100 === price,
      'Cena może mieć maksymalnie 2 miejsca po przecinku'
    ),

  allergens: z
    .array(allergensEnum)
    .default([])
    .refine(
      (allergens) => allergens.length <= 14,
      'Maksymalnie 14 alergenów'
    ),

  dietary: z
    .object({
      isVegan: z.boolean().default(false),
      isVegetarian: z.boolean().default(false),
      isGlutenFree: z.boolean().default(false),
      isDairyFree: z.boolean().default(false),
      isSpicy: z.boolean().default(false),
    })
    .default({
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isDairyFree: false,
      isSpicy: false,
    }),

  visible: z.boolean().default(true),
  portion: z.string().optional().default('1 porcja'),
  calories: z.number().optional().nullable(),
  preparationTime: z.number().optional().default(15), // minutes
  available: z.boolean().default(true),
  sortOrder: z.number().optional().default(0),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const menuCategorySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Nazwa kategorii musi mieć co najmniej 2 znaki')
    .max(50, 'Nazwa kategorii może mieć maksymalnie 50 znaków')
    .trim(),

  description: z
    .string()
    .max(200, 'Opis może mieć maksymalnie 200 znaków')
    .trim()
    .optional()
    .default(''),

  visible: z.boolean().default(true),
  sortOrder: z.number().optional().default(0),
  emoji: z.string().emoji().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Nieprawidłowy kolor (format: #RRGGBB)')
    .optional(),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Batch validation for menu items
export const menuBatchSchema = z.object({
  items: z.array(menuItemSchema).min(1, 'Conajmniej jedno danie jest wymagane'),
  restaurantId: z.string().min(1, 'ID restauracji jest wymagane'),
});

export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuBatch = z.infer<typeof menuBatchSchema>;
