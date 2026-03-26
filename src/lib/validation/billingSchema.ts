import { z } from 'zod';
import { SAAS_PACKAGES } from '@/types/organization';

export const createCheckoutSchema = z.object({
  packages: z
    .array(z.enum(SAAS_PACKAGES))
    .min(1, 'At least one package required')
    .refine(
      (pkgs) => new Set(pkgs).size === pkgs.length,
      'Duplicate packages not allowed',
    ),
});

export const createPaymentIntentSchema = z.object({
  sessionId: z.string().min(1),
  orgId: z.string().min(1),
  restaurantId: z.string().min(1),
  amountCents: z.number().int().positive(),
  tipCents: z.number().int().min(0),
});

export const markCashSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  amountCents: z.number().int().positive(),
  tipCents: z.number().int().min(0),
});
