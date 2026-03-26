"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { useOrganization } from '../providers/OrganizationProvider';
import { Box, CircularProgress } from '@mui/material';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const { member } = useOrganization();
  const params = useParams<{ lang: string }>();
  const router = useRouter();

  const isGastronauta = profile?.isGastronaut === true;
  const profileReady = profile !== null;

  const staffRoles = ['owner', 'admin', 'manager', 'waiter', 'chef', 'staff'];
  const isStaff = member && staffRoles.includes(member.role);

  React.useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) {
      router.replace(`/${params.lang}`);
      return;
    }
    if (isStaff && !isGastronauta) {
      router.replace(`/${params.lang}/user`);
      return;
    }
    if (!isStaff) {
      router.replace(`/${params.lang}/user`);
    }
  }, [loading, profileReady, user, isStaff, isGastronauta, router, params.lang]);

  if (loading || !profileReady || !user || !isStaff || (isStaff && !isGastronauta)) {
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
