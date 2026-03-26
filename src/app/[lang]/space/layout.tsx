'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../providers/AuthProvider';

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const params = useParams<{ lang: string }>();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${params.lang}/login`);
      return;
    }
    if (profile && !profile.onboardingCompleted) {
      router.replace(`/${params.lang}/onboarding`);
      return;
    }
  }, [loading, user, profile, router, params.lang]);

  if (loading || !user || !profile) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {children}
    </Box>
  );
}
