'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import NoMealsIcon from '@mui/icons-material/NoMeals';
import HomeIcon from '@mui/icons-material/Home';
import { UI } from '@/styles/theme';

// Render only on client to avoid hydration mismatch
const NotFoundContent = dynamic(
  () => Promise.resolve(RootNotFoundPage),
  { ssr: false, loading: () => <CircularProgress /> }
);

function RootNotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        px: UI.space.lg,
        py: UI.space.xl,
        textAlign: 'center',
      }}
    >
      {/* Creative 404 with NoMeals icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: UI.space.xl,
          fontSize: 'clamp(4rem, 15vw, 8rem)',
        }}
      >
        <NoMealsIcon sx={{ fontSize: 'inherit', opacity: 0.7 }} />
      </Box>

      {/* Error message */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: UI.space.md,
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
        }}
      >
        Page not found
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          mb: UI.space.lg,
          maxWidth: '32rem',
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          lineHeight: 1.6,
        }}
      >
        Sorry, the page you are looking for disappeared faster than a dish prepared in the kitchen.
      </Typography>

      {/* Action buttons */}
      <Stack direction="row" spacing={UI.space.md} sx={{ mt: UI.space.xl }}>
        <Button
          component={Link}
          href="/"
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          sx={{
            borderRadius: UI.radius.md,
            px: UI.space.lg,
            py: UI.space.md,
            fontWeight: 600,
          }}
        >
          Go home
        </Button>
        <Button
          component={Link}
          href="/pl/demo"
          variant="outlined"
          size="large"
          sx={{
            borderRadius: UI.radius.md,
            px: UI.space.lg,
            py: UI.space.md,
            fontWeight: 600,
          }}
        >
          Demo PIN pad
        </Button>
      </Stack>

      {/* Footer note */}
      <Typography
        variant="caption"
        sx={{
          mt: UI.space.xl,
          opacity: 0.5,
          fontSize: '0.8rem',
        }}
      >
        Error 404 • gastroo.space
      </Typography>
    </Box>
  );
}

export default function RootNotFound() {
  return <NotFoundContent />;
}
