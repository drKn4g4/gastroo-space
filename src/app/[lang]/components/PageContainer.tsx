'use client';

import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { Box } from '@mui/material';

export default function PageContainer({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

