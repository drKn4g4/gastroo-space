import type { TipPoolConfig } from '@/types/organization';
import type { MemberRole } from '@/types/organization';

interface StaffMember {
  userId: string;
  role: MemberRole;
}

export interface TipCredit {
  userId: string;
  amountCents: number;
  category: string;
}

/**
 * Calculate per-staff tip credits based on org's tip pool rules.
 *
 * @param tipCents   Total tip amount in cents
 * @param config     Org's tip pool configuration
 * @param staff      Active staff members in the org
 * @returns Array of TipCredit — one per staff member who receives a share
 */
export function distributeTips(
  tipCents: number,
  config: TipPoolConfig,
  staff: StaffMember[],
): TipCredit[] {
  if (tipCents <= 0 || config.rules.length === 0 || staff.length === 0) {
    return [];
  }

  const credits: TipCredit[] = [];

  for (const rule of config.rules) {
    if (rule.percentage <= 0) continue;

    const categoryShare = Math.floor(tipCents * rule.percentage / 100);
    const eligibleStaff = staff.filter((s) =>
      rule.roleIds.includes(s.role),
    );

    if (eligibleStaff.length === 0) continue;

    const perPerson = Math.floor(categoryShare / eligibleStaff.length);
    if (perPerson <= 0) continue;

    // Distribute remainder to first eligible staff member (round-robin fairness can be added later)
    const remainder = categoryShare - perPerson * eligibleStaff.length;

    for (let i = 0; i < eligibleStaff.length; i++) {
      credits.push({
        userId: eligibleStaff[i].userId,
        amountCents: perPerson + (i === 0 ? remainder : 0),
        category: rule.category,
      });
    }
  }

  return credits;
}
