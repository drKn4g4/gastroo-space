export type RootContextKind =
  | 'public-root'
  | 'onboarding-root'
  | 'space-root'
  | 'pinpad-root';

export interface RootContextInput {
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  gastronaut: boolean;
  organizationCount: number;
  viewMode?: 'foodie' | 'gastronaut';
}

export interface RootContextDecision {
  kind: RootContextKind;
  shouldShowOrganizationPicker: boolean;
  canUsePinpad: boolean;
}

/**
 * Flow biznesowy:
 *
 * 1) niezalogowany                                                → public-root
 * 2) zalogowany + onboarding nie ukończony                        → onboarding-root  → /onboarding
 * 3) zalogowany + gastronaut=false                                → space-root       → /space (B2C)
 * 4) zalogowany + gastronaut=true + 0 memberships                 → space-root       → /space (B2C + CV + oferty pracy)
 * 5) zalogowany + gastronaut=true + ≥1 membership + viewMode=foodie    → space-root  → /space (B2C, toggle w ustawieniach)
 * 6) zalogowany + gastronaut=true + ≥1 membership + viewMode=gastronaut → pinpad-root → /pinpad → /dashboard (B2B)
 */
export function resolveRootContext(input: RootContextInput): RootContextDecision {
  if (!input.isAuthenticated) {
    return { kind: 'public-root', shouldShowOrganizationPicker: false, canUsePinpad: false };
  }

  if (!input.onboardingCompleted) {
    return { kind: 'onboarding-root', shouldShowOrganizationPicker: false, canUsePinpad: false };
  }

  // gastronaut=false → always space (B2C), no PINpad ever
  if (!input.gastronaut) {
    return { kind: 'space-root', shouldShowOrganizationPicker: false, canUsePinpad: false };
  }

  // gastronaut=true + no memberships → space with CV + job offers
  if (input.organizationCount <= 0) {
    return { kind: 'space-root', shouldShowOrganizationPicker: false, canUsePinpad: false };
  }

  // gastronaut=true + ≥1 membership + viewMode=gastronaut → PINpad → dashboard
  if (input.viewMode === 'gastronaut') {
    return {
      kind: 'pinpad-root',
      shouldShowOrganizationPicker: input.organizationCount > 1,
      canUsePinpad: true,
    };
  }

  // gastronaut=true + ≥1 membership + viewMode=foodie → space (toggle in settings)
  return { kind: 'space-root', shouldShowOrganizationPicker: false, canUsePinpad: false };
}
