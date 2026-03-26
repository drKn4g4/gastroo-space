// src/app/[lang]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ExploreIcon from '@mui/icons-material/Explore';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useAuth } from './providers/AuthProvider';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';

type PublicStats = {
  usersCount: number;
  gastronautsCount: number;
  organizationsCount: number;
};

function StatSection({
  icon,
  title,
  subtitle,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: 'neutral' | 'warm' | 'cool';
}) {
  const gradientByTone = {
    neutral: {
      light: 'linear-gradient(155deg, rgba(255,255,255,1) 0%, rgba(246,242,236,1) 100%)',
      dark: 'linear-gradient(155deg, rgba(23,23,23,1) 0%, rgba(34,31,27,1) 100%)',
    },
    warm: {
      light: 'linear-gradient(155deg, rgba(255,248,240,1) 0%, rgba(245,229,210,1) 100%)',
      dark: 'linear-gradient(155deg, rgba(31,26,22,1) 0%, rgba(45,35,27,1) 100%)',
    },
    cool: {
      light: 'linear-gradient(155deg, rgba(245,250,255,1) 0%, rgba(226,237,247,1) 100%)',
      dark: 'linear-gradient(155deg, rgba(22,27,31,1) 0%, rgba(26,34,39,1) 100%)',
    },
  } as const;

  return (
    <Box
      component="section"
      sx={(theme) => ({
        height: '100vh',
        scrollSnapAlign: 'start',
        display: 'grid',
        placeItems: 'center',
        px: { xs: '1.25rem', md: '3rem' },
        py: { xs: '5rem', md: '6rem' },
        color: theme.palette.text.primary,
        background:
          theme.palette.mode === 'dark' ? gradientByTone[tone].dark : gradientByTone[tone].light,
      })}
    >
      <Stack
        spacing={2}
        sx={(theme) => ({
          width: '100%',
          maxWidth: '58rem',
          textAlign: 'center',
          borderRadius: '1.5rem',
          border: '0.0625rem solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(18,18,18,0.75)' : 'rgba(255,255,255,0.74)',
          backdropFilter: 'blur(0.5rem)',
          px: { xs: '1.25rem', md: '2.5rem' },
          py: { xs: '2rem', md: '3rem' },
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 1rem 2.5rem rgba(0, 0, 0, 0.45)'
              : '0 1rem 2.5rem rgba(0, 0, 0, 0.08)',
        })}
      >
        <Box sx={{ display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography
          component="h2"
          sx={{
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            fontSize: 'clamp(1.9rem, 4.8vw, 3.8rem)',
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mx: 'auto', maxWidth: '44rem', fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
          {subtitle}
        </Typography>
      </Stack>
    </Box>
  );
}

export default function Home() {
  const { loading } = useAuth();
  const params = useParams<{ lang: string }>();
  const currentLang = params.lang || 'pl';
  const { t } = useTranslation(currentLang, 'landing');
  const { t: tNav } = useTranslation(currentLang, 'navigation');
  const [stats, setStats] = useState<PublicStats>({
    usersCount: 0,
    gastronautsCount: 0,
    organizationsCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch('/api/public/stats', { method: 'GET' });
        if (!res.ok) throw new Error('stats');
        const data = (await res.json()) as PublicStats;
        if (active) {
          setStats({
            usersCount: Number(data.usersCount ?? 0),
            gastronautsCount: Number(data.gastronautsCount ?? 0),
            organizationsCount: Number(data.organizationsCount ?? 0),
          });
        }
      } catch {
        if (active) {
          setStats({ usersCount: 0, gastronautsCount: 0, organizationsCount: 0 });
        }
      } finally {
        if (active) setStatsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const xUsers = useMemo(() => stats.usersCount.toLocaleString('pl-PL'), [stats.usersCount]);
  const yGastronauts = useMemo(() => stats.gastronautsCount.toLocaleString('pl-PL'), [stats.gastronautsCount]);
  const zOrganizations = useMemo(() => stats.organizationsCount.toLocaleString('pl-PL'), [stats.organizationsCount]);

  if (loading || statsLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '85vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        scrollSnapType: 'y mandatory',
        height: '100vh',
        overflowY: 'scroll',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
    >
      <Box sx={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 20 }}>
        <IconButton
          component={Link}
          href={`/${currentLang}/login`}
          aria-label={t('landing.login_aria')}
          sx={(theme) => ({
            border: '0.0625rem solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.24)',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(12,12,12,0.92)' : 'rgba(255,255,255,0.94)',
            color: theme.palette.mode === 'dark' ? '#f5f5f5' : '#171717',
            backdropFilter: 'blur(0.4rem)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 0.5rem 1.4rem rgba(0,0,0,0.45)'
                : '0 0.5rem 1.2rem rgba(0,0,0,0.14)',
            transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : '#171717',
              color: theme.palette.mode === 'dark' ? '#171717' : '#ffffff',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.62)',
            },
          })}
        >
          <LoginIcon />
        </IconButton>
      </Box>

      <StatSection
        tone="neutral"
        icon={<ExploreIcon sx={{ fontSize: 'clamp(2.25rem, 6vw, 3.4rem)', color: '#9b6a2f' }} />}
        title={t('landing.section1.title')}
        subtitle={t('landing.section1.subtitle')}
      />

      <StatSection
        tone="warm"
        icon={<RestaurantMenuIcon sx={{ fontSize: 'clamp(2.25rem, 6vw, 3.4rem)', color: '#b97428' }} />}
        title={t('landing.section2.title', { count: stats.usersCount, formattedCount: xUsers })}
        subtitle={t('landing.section2.subtitle')}
      />

      <StatSection
        tone="cool"
        icon={<ExploreIcon sx={{ fontSize: 'clamp(2.25rem, 6vw, 3.4rem)', color: '#2f6f9b' }} />}
        title={t('landing.section3.title', { count: stats.gastronautsCount, formattedCount: yGastronauts })}
        subtitle={t('landing.section3.subtitle')}
      />

      <StatSection
        tone="neutral"
        icon={<StorefrontIcon sx={{ fontSize: 'clamp(2.25rem, 6vw, 3.4rem)', color: '#5e5e5e' }} />}
        title={t('landing.section4.title', { count: stats.organizationsCount, formattedCount: zOrganizations })}
        subtitle={t('landing.section4.subtitle')}
      />

      <Box
        component="footer"
        sx={(theme) => ({
          height: '100vh',
          scrollSnapAlign: 'start',
          borderTop: '0.0625rem solid',
          borderTopColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
          color: theme.palette.text.primary,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(23,23,23,1) 0%, rgba(29,27,24,1) 100%)'
              : 'linear-gradient(180deg, rgba(247,247,247,1) 0%, rgba(240,236,230,1) 100%)',
          px: { xs: '1.25rem', md: '3rem' },
          py: { xs: '2rem', md: '3rem' },
          display: 'grid',
          alignItems: 'center',
        })}
      >
        <Stack spacing={2.5} sx={{ maxWidth: '64rem', width: '100%', mx: 'auto' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Stack spacing={0.75}>
              <Typography sx={{ fontWeight: 900, letterSpacing: '-0.03em', fontSize: 'clamp(1.3rem, 3vw, 2rem)' }}>
                gastroo.space
              </Typography>
              <Typography color="text.secondary">{t('landing.footer.brandSubtitle')}</Typography>
            </Stack>
            <LanguageSwitcher />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label={t('landing.footer.statsUsers', { count: stats.usersCount, formattedCount: xUsers })}
              variant="outlined"
              sx={(theme) => ({
                color: theme.palette.text.primary,
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.2)',
              })}
            />
            <Chip
              label={t('landing.footer.statsGastronauts', { count: stats.gastronautsCount, formattedCount: yGastronauts })}
              variant="outlined"
              sx={(theme) => ({
                color: theme.palette.text.primary,
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.2)',
              })}
            />
            <Chip
              label={t('landing.footer.statsOrganizations', { count: stats.organizationsCount, formattedCount: zOrganizations })}
              variant="outlined"
              sx={(theme) => ({
                color: theme.palette.text.primary,
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.2)',
              })}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button component={Link} href={`/${currentLang}/offer`} variant="text" sx={{ justifyContent: 'flex-start' }}>
              {tNav('nav.offer')}
            </Button>
            <Button component={Link} href={`/${currentLang}/demo`} variant="text" sx={{ justifyContent: 'flex-start' }}>
              {tNav('nav.demo')}
            </Button>
            <Button component={Link} href={`/${currentLang}/login`} variant="text" sx={{ justifyContent: 'flex-start' }}>
              {tNav('nav.login')}
            </Button>
            <Button component={Link} href={`/${currentLang}/register`} variant="text" sx={{ justifyContent: 'flex-start' }}>
              {tNav('nav.register')}
            </Button>
          </Stack>

          <Divider />
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} gastroo.space
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}