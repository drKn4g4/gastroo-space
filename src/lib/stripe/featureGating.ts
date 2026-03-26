import type { SaaSPackage } from '@/types/organization';

/**
 * Maps each SaaS package to the org features it unlocks.
 * An org's effective features = union of all features from its activePackages.
 */
const PACKAGE_FEATURES: Record<SaaSPackage, string[]> = {
  visibility: ['online_bookings', 'menu_qr', 'integrations'],
  bookings: ['online_bookings'],
  menu: ['menu_qr', 'pos_system'],
  crew: ['team_management', 'pos_system', 'loyalty_program'],
};

/** Check if a specific feature is enabled by any of the active packages */
export function hasFeature(activePackages: SaaSPackage[], feature: string): boolean {
  return activePackages.some((pkg) => PACKAGE_FEATURES[pkg]?.includes(feature));
}

/** Get all features enabled by the active packages */
export function deriveFeatures(activePackages: SaaSPackage[]): Record<string, boolean> {
  const allFeatures = ['online_bookings', 'menu_qr', 'team_management', 'pos_system', 'loyalty_program', 'integrations'];
  const result: Record<string, boolean> = {};
  for (const f of allFeatures) {
    result[f] = hasFeature(activePackages, f);
  }
  return result;
}
