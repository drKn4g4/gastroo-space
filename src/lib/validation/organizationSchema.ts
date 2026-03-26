import { z } from 'zod';
import { MEMBER_ROLES, PERMISSIONS } from '@/types/organization';

/**
 * Organization & Restaurant Validation Schemas
 * Ensures data integrity for B2B entities
 */

export const organizationSchema = z.object({
  id: z.string().uuid('Nieprawidłowy UUID'),
  name: z
    .string()
    .min(2, 'Nazwa musi mieć co najmniej 2 znaki')
    .max(100, 'Nazwa może mieć maksymalnie 100 znaków')
    .trim(),

  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug może zawierać tylko małe litery, cyfry i myślniki')
    .trim(),

  type: z.enum(['restaurant', 'cafe', 'bar', 'bistro', 'pizzeria', 'other']),
  
  plan: z.enum(['free', 'visibility', 'reservations', 'team', 'menu-qr', 'max']).default('free'),
  
  features: z
    .object({
      bookings: z.boolean().default(false),
      qrMenu: z.boolean().default(false),
      teamManagement: z.boolean().default(false),
      inventory: z.boolean().default(false),
      analytics: z.boolean().default(false),
      integrations: z.boolean().default(false),
    })
    .default({
      bookings: false,
      qrMenu: false,
      teamManagement: false,
      inventory: false,
      analytics: false,
      integrations: false,
    }),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const restaurantSchema = z.object({
  id: z.string().uuid('Nieprawidłowy UUID').optional(),
  organizationId: z.string().uuid('Nieprawidłowy UUID'),
  name: z
    .string()
    .min(2, 'Nazwa restauracji musi mieć co najmniej 2 znaki')
    .max(100, 'Nazwa restauracji może mieć maksymalnie 100 znaków')
    .trim(),

  address: z
    .string()
    .min(5, 'Adres musi mieć co najmniej 5 znaków')
    .max(250, 'Adres może mieć maksymalnie 250 znaków')
    .trim(),

  city: z
    .string()
    .min(2, 'Miasto musi mieć co najmniej 2 znaki')
    .max(50, 'Miasto może mieć maksymalnie 50 znaków')
    .trim(),

  postalCode: z
    .string()
    .regex(/^\d{2}-\d{3}$/, 'Nieprawidłowy kod pocztowy (format: XX-XXX)')
    .optional(),

  phone: z
    .string()
    .regex(/^[\d\s+()-]+$/, 'Nieprawidłowy format numeru telefonu')
    .min(9, 'Numer telefonu musi mieć co najmniej 9 cyfr')
    .max(20, 'Numer telefonu może mieć maksymalnie 20 znaków')
    .optional(),

  email: z
    .string()
    .email('Nieprawidłowy format email')
    .optional(),

  website: z
    .string()
    .url('Nieprawidłowy format URL')
    .optional()
    .or(z.literal('')),

  timezone: z
    .string()
    .default('Europe/Warsaw'),

  openingHours: z
    .array(
      z.object({
        day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
        open: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
        close: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
        closed: z.boolean().default(false),
      })
    )
    .optional(),

  description: z
    .string()
    .max(500, 'Opis może mieć maksymalnie 500 znaków')
    .trim()
    .optional(),

  cuisine: z
    .array(z.string())
    .optional()
    .default([]),

  maxCapacity: z
    .number()
    .int('Pojemność musi być liczbą całkowitą')
    .min(1, 'Pojemność musi być większa niż 0')
    .max(500, 'Pojemność nie może przekraczać 500')
    .optional(),

  averagePreparationTime: z
    .number()
    .int()
    .min(5)
    .max(120)
    .optional()
    .default(30),

  settings: z
    .object({
      acceptBookings: z.boolean().default(true),
      minimumPartySize: z.number().int().min(1).default(1),
      maximumPartySize: z.number().int().min(1).default(100),
      advanceBookingDays: z.number().int().min(0).max(365).default(90),
      cancellationDeadlineMinutes: z.number().int().min(0).default(60),
    })
    .default({
      acceptBookings: true,
      minimumPartySize: 1,
      maximumPartySize: 100,
      advanceBookingDays: 90,
      cancellationDeadlineMinutes: 60,
    }),

  status: z.enum(['active', 'draft', 'archived']).default('active'),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Member & Permissions
export const permissionSchema = z.enum([
  ...Object.values(PERMISSIONS),
]);

export const roleSchema = z.enum(MEMBER_ROLES);

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid('Nieprawidłowy UUID'),
  organizationId: z.string().uuid('Nieprawidłowy UUID'),
  restaurantIds: z.array(z.string().uuid()).default([]),
  role: roleSchema.default('staff'),
  permissions: z.array(permissionSchema).default([]),
  status: z.enum(['active', 'invited', 'suspended']).default('active'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Organization = z.infer<typeof organizationSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Permission = z.infer<typeof permissionSchema>;
