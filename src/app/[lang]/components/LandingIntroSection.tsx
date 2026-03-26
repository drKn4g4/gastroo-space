// src/app/[lang]/components/LandingIntroSection.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import { UI } from '@/styles/theme';
import { vh, vmin, vw } from '@/styles/units';

export default function LandingIntroSection() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang, 'hero');
  const { t: tLanding } = useTranslation(params.lang, 'landing');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const titleGradient = isDark 
    ? 'linear-gradient(135deg, #FFF 0%, #C5A059 50%, #8B652E 100%)'
    : 'linear-gradient(135deg, #1A1A1A 0%, #A67C37 50%, #634426 100%)';

  return (
    <Box
      component="section"
      sx={{
        pt: { xs: 14, md: 22 },
        pb: { xs: 8, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(135deg, #232323 0%, #171717 100%)'
          : 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)',
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'background.default',
                fontWeight: 900,
                fontSize: '0.85rem',
                px: 2.5,
                py: 0.5,
                borderRadius: UI.radius.md,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                mr: 1.5,
              }}
            >
              Tryb Demo
            </Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em' }}>
              {tLanding('landing.intro.try_without_signup')}
            </Typography>
          </Box>

          <Typography
            variant="h1"
            sx={{
              mb: 3,
              fontWeight: 900,
              fontSize: { xs: '2.2rem', md: '3.2rem' },
              letterSpacing: '-0.04em',
              color: 'text.primary',
              lineHeight: 1.1,
            }}
          >
            gastroo — demo ERP/POS
          </Typography>

          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              mb: 7,
              maxWidth: UI.size.heroSubtitleMaxW,
              mx: 'auto',
              lineHeight: 1.6,
              fontWeight: 500,
              opacity: 0.92,
            }}
          >
            {tLanding('landing.intro.demo_description')}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              component={Link}
              href={`/${params.lang}/demo`}
              variant="contained"
              size="large"
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                borderRadius: UI.radius.lg,
                fontWeight: 900,
                boxShadow: (t) => `0 ${vmin(20)} ${vmin(40)} calc(-1 * ${vmin(10)}) ${alpha(t.palette.primary.main, 0.4)}`,
                '&:hover': {
                  boxShadow: (t) => `0 ${vmin(25)} ${vmin(50)} calc(-1 * ${vmin(12)}) ${alpha(t.palette.primary.main, 0.6)}`,
                }
              }}
            >
              Uruchom Demo
            </Button>
            <Button
              component={Link}
              href={`/${params.lang}/login`}
              variant="outlined"
              size="large"
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                borderRadius: UI.radius.lg,
                borderWidth: UI.borderWidth.thick,
                fontWeight: 700,
                backdropFilter: `blur(${UI.blur.sm})`,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                '&:hover': {
                  borderWidth: UI.borderWidth.thick,
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                }
              }}
            >
              {tLanding('landing.intro.login')}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
