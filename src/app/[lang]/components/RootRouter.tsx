/**
 * RootRouter.tsx
 *
 * Central routing guard that redirects users based on:
 * - auth state
 * - onboarding completion
 * - gastronaut flag
 * - active view mode (foodie / gastronaut)
 * - organization memberships
 */

'use client';

import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { resolveRootContext } from '@/lib/access/rootContext';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

export default function RootRouter({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const { user, loading: authLoading, profile } = useAuth();
  const { organization, organizationOptions, loading: orgLoading } = useOrganization();

  const [routed, setRouted] = useState(false);
  const lang = (params.lang as string) || 'pl';

  const isGastronaut = profile?.isGastronaut === true;
  const onboardingCompleted = profile?.onboardingCompleted === true;
  const viewMode = profile?.viewMode ?? 'foodie';

  // Reset routing decision when key profile flags change
  useEffect(() => {
    setRouted(false);
  }, [isGastronaut, onboardingCompleted, viewMode]);

  useEffect(() => {
    if (authLoading) return;
    if (user && !profile) return;
    if (user && orgLoading) return;
    if (routed) return;

    const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
    const isOnboardingPage = pathname.includes('/onboarding');

    const uniqueOrgCount = new Set(organizationOptions.map(o => o.orgId)).size;

    const decision = resolveRootContext({
      isAuthenticated: !!user,
      onboardingCompleted,
      gastronaut: isGastronaut,
      organizationCount: Math.max(uniqueOrgCount, organization ? 1 : 0),
      viewMode,
    });

    const isOnSpace = pathname.includes('/space');
    const isOnPinpad = pathname.includes('/pinpad');
    const isOnDashboard = pathname.includes('/dashboard');

    // --- ROUTING DECISIONS ---

    // 1) Not authenticated → redirect protected routes to login, allow public pages
    if (decision.kind === 'public-root') {
      const isProtectedRoute =
        pathname.includes('/space') ||
        pathname.includes('/dashboard') ||
        pathname.includes('/pinpad') ||
        pathname.includes('/onboarding');
      if (isProtectedRoute) {
        router.push(`/${lang}/login`);
        return;
      }
      setRouted(true);
      return;
    }

    // 2) Needs onboarding
    if (decision.kind === 'onboarding-root') {
      if (!isOnboardingPage) {
        router.push(`/${lang}/onboarding`);
        return;
      }
      setRouted(true);
      return;
    }

    // 3) Completed onboarding but still on onboarding page → redirect to /space
    if (isOnboardingPage) {
      router.push(`/${lang}/space`);
      return;
    }

    // 4) On auth page → redirect to appropriate home
    if (isAuthPage) {
      if (decision.kind === 'pinpad-root') {
        router.push(`/${lang}/pinpad`);
      } else {
        router.push(`/${lang}/space`);
      }
      return;
    }

    // 5) space-root: user should be on /space, block /dashboard and /pinpad
    if (decision.kind === 'space-root') {
      if (isOnDashboard || isOnPinpad) {
        router.push(`/${lang}/space`);
        return;
      }
      setRouted(true);
      return;
    }

    // 6) pinpad-root: gastronaut + membership + gastronaut mode
    if (decision.kind === 'pinpad-root') {
      // Allow /pinpad and /dashboard (after PIN validation)
      if (!isOnPinpad && !isOnDashboard) {
        router.push(`/${lang}/pinpad`);
        return;
      }
      setRouted(true);
      return;
    }

    setRouted(true);
  }, [user, authLoading, profile, orgLoading, pathname, routed, isGastronaut, onboardingCompleted, viewMode, organizationOptions, organization, lang, router]);

  if (authLoading || (user && !profile) || !routed) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}