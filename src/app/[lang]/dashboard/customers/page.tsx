'use client';

import {
  Box, Typography, Stack, Chip, Card, CardContent, Avatar, LinearProgress, Tabs, Tab,
} from '@mui/material';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import StarIcon from '@mui/icons-material/Star';
import { useState } from 'react';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import { vmin } from '@/styles/units';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import PageContainer from '@/app/[lang]/components/PageContainer';

const CUSTOMERS = [
  { name: 'Katarzyna M.', visits: 18, spent: 1240, points: 620, tier: 'Gold'   },
  { name: 'Piotr W.',     visits: 9,  spent: 670,  points: 335, tier: 'Silver' },
  { name: 'Agnieszka N.', visits: 5,  spent: 380,  points: 190, tier: 'Bronze' },
  { name: 'Damian S.',    visits: 32, spent: 2900,  points: 1450, tier: 'Platinum' },
];

const TIER_COLOR: Record<string, 'warning' | 'default' | 'primary' | 'secondary'> = {
  Bronze: 'default', Silver: 'default', Gold: 'warning', Platinum: 'primary',
};

const REWARDS = [
  { name: 'Kawa gratis',      points: 100, available: true  },
  { name: 'Deser gratis',     points: 200, available: true  },
  { name: 'Rabat 10%',        points: 300, available: false },
  { name: 'Kolacja dla 2',    points: 1000, available: false },
];

function CustomersPageContent() {
  const [tab, setTab] = useState(0);
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <PeopleOutlineIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('dashboard.customers.title')}</Typography>
        <Chip label={t('dashboard.customers.mockup')} size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: 11 }} />
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}>
        <Tab label={`👤 ${t('dashboard.customers.tab_database')}`} />
        <Tab label={`⭐ ${t('dashboard.customers.tab_loyalty')}`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={1}>
          {CUSTOMERS.map((c) => (
            <Card key={c.name} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14, fontWeight: 700 }}>
                      {c.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard.customers.visits_spent', { visits: c.visits, spent: c.spent })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack alignItems="flex-end" spacing={0.25}>
                    <Chip
                      label={c.tier}
                      size="small"
                      color={TIER_COLOR[c.tier]}
                      icon={<StarIcon sx={{ fontSize: `${vmin(12)} !important` }} />}
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="text.disabled">{t('dashboard.customers.points', { count: c.points })}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={1.5}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" fontWeight={700} mb={0.5}>{t('dashboard.customers.your_points', { count: 620 })}</Typography>
              <LinearProgress variant="determinate" value={62} color="warning" sx={{ height: 8, borderRadius: 4 }} />
              <Typography variant="caption" color="text.secondary">{t('dashboard.customers.progress', { current: 620, target: 1000, tier: 'Platinum' })}</Typography>
            </CardContent>
          </Card>

          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('dashboard.customers.rewards')}
          </Typography>

          {REWARDS.map((r) => (
            <Card key={r.name} variant="outlined" sx={{ opacity: r.available ? 1 : 0.5 }}>
              <CardContent sx={{ py: 1.25, px: 2, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                  <Chip
                    label={t('dashboard.customers.points', { count: r.points })}
                    size="small"
                    color={r.available ? 'warning' : 'default'}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.disabled" textAlign="center">
        {t('dashboard.customers.coming_soon')}
      </Typography>
    </Box>
  );
}

export default function CustomersPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <RequireOrganization>
      <PermissionGate permission={PERMISSIONS.CUSTOMERS_VIEW} fallback={
        <PageContainer sx={{ textAlign: 'center' }}>
          <Typography color="text.secondary">{t('dashboard.customers.no_access')}</Typography>
        </PageContainer>
      }>
        <CustomersPageContent />
      </PermissionGate>
    </RequireOrganization>
  );
}
