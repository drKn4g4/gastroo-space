'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const SpaceSettingsView = dynamic(() => import('./SpaceSettingsView'), {
  loading: () => (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <CircularProgress size={28} />
    </Box>
  ),
});

export default function SpaceProfileView() {
  return (
    <SpaceSettingsView />
  );
}
