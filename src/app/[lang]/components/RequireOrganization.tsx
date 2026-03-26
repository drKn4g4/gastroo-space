'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOrganization } from '../providers/OrganizationProvider';
import { useAuth } from '../providers/AuthProvider';
import { CircularProgress, Container } from '@mui/material';

interface RequireOrganizationProps {
  children: React.ReactNode;
}

export default function RequireOrganization({ children }: RequireOrganizationProps) {
  const { organization, loading } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if we're already on onboarding or login
    if (pathname?.includes('/onboarding') || pathname?.includes('/login')) {
      return;
    }

    // If not authenticated, let DashboardLayout handle the /login redirect
    if (authLoading || !user) return;

    // If not loading and no organization, redirect to onboarding ONLY if not on dashboard
    // In dashboard, let error boundary handle it or show a message
    if (!loading && !organization && pathname?.includes('/dashboard')) {
      // Don't redirect here - let the component render the children, 
      // error boundary will catch any errors
      // If we redirect, we prevent proper error handling
      return;
    }

    // For other protected pages without organization
    if (!loading && !organization && !pathname?.includes('/dashboard')) {
      router.push(pathname.replace(/\/dashboard.*/, '/onboarding'));
    }
  }, [organization, loading, user, authLoading, router, pathname]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!organization && !pathname?.includes('/dashboard')) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
