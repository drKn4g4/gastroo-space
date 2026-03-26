import { z } from 'zod';

const tipPoolRuleSchema = z.object({
  category: z.enum(['waiter', 'bar', 'kitchen', 'other']),
  percentage: z.number().min(0).max(100),
  roleIds: z.array(z.string()).min(1),
});

export const tipPoolConfigSchema = z.object({
  rules: z
    .array(tipPoolRuleSchema)
    .min(1, 'At least one rule required')
    .refine(
      (rules) => {
        const sum = rules.reduce((s, r) => s + r.percentage, 0);
        return Math.abs(sum - 100) < 0.01;
      },
      'Percentages must sum to 100',
    ),
});

export const tipWithdrawSchema = z.object({
  amountCents: z.number().int().positive('Withdrawal amount must be positive'),
});
