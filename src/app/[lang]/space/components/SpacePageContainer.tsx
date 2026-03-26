'use client';

import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function SpacePageContainer({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return <PageContainer sx={sx}>{children}</PageContainer>;
}
