import { z } from 'zod';

export const AddLoyaltyPointsSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  targetUid: z.string().min(1, 'targetUid is required'),
  delta: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 10000, {
    message: 'delta must be a non-zero integer with absolute value <= 10000',
  }),
});
