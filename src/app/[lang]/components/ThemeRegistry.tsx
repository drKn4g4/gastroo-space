// src/app/components/ThemeRegistry.tsx
'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // Wykryj, czy użytkownik preferuje motyw ciemny
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Użyj React.useMemo, aby motyw nie był tworzony na nowo przy każdym renderze
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          // Ustaw tryb na ciemny lub jasny w zależności od preferencji systemowych
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}