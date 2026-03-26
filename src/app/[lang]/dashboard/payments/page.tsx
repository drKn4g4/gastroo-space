'use client';

import {
  Box, Typography, Stack, Chip, Card, CardContent, Divider, Tabs, Tab,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useState } from 'react';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import { vmin, vw } from '@/styles/units';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import PageContainer from '@/app/[lang]/components/PageContainer';

const TRANSACTIONS = [
  { time: '12:43', table: '3', method: 'karta',   amount: 87,  tip: 10 },
  { time: '12:11', table: '7', method: 'gotówka', amount: 54,  tip: 0  },
  { time: '11:55', table: '1', method: 'karta',   amount: 62,  tip: 5  },
  { time: '11:20', table: '5', method: 'BLIK',    amount: 38,  tip: 0  },
  { time: '10:58', table: '2', method: 'karta',   amount: 121, tip: 15 },
];

const METHOD_COLOR: Record<string, 'success' | 'primary' | 'secondary' | 'default'> = {
  karta: 'primary', gotówka: 'success', BLIK: 'secondary',
};

const WEEKLY_TOTALS = [1240, 980, 1510, 870, 2100, 2890, 1650];
// day keys: Mon Tue Wed Thu Fri Sat Sun — resolved from locale at render time
const WEEKLY_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const SAT_INDEX = 5; // Saturday is the highest-bar highlight

const maxWeek = Math.max(...WEEKLY_TOTALS);

function PaymentsPageContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

  const [tab, setTab] = useState(0);
  const todayTotal = TRANSACTIONS.reduce((s, tx) => s + tx.amount, 0);
  const todayTips  = TRANSACTIONS.reduce((s, tx) => s + tx.tip, 0);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <PaymentsIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('dashboard.payments.title')}</Typography>
        <Chip label={t('dashboard.payments.mockup')} size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: 11 }} />
      </Stack>

      {/* KPI */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {[
          { label: t('dashboard.payments.today'),        value: t('dashboard.payments.currency', { amount: todayTotal }), color: 'primary.main'  },
          { label: t('dashboard.payments.tips'),         value: t('dashboard.payments.currency', { amount: todayTips }),  color: 'success.main'  },
          { label: t('dashboard.payments.transactions'), value: String(TRANSACTIONS.length), color: 'text.primary' },
          { label: t('dashboard.payments.avg_receipt'),  value: t('dashboard.payments.currency', { amount: Math.round(todayTotal / TRANSACTIONS.length) }), color: 'secondary.main' },
        ].map((k) => (
          <Card key={k.label} variant="outlined" sx={{ flex: `1 1 ${vw(130)}`, minWidth: 120 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="caption" color="text.secondary">{k.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}>
        <Tab label={`💳 ${t('dashboard.payments.tab_transactions')}`} />
        <Tab label={`📊 ${t('dashboard.payments.tab_weekly')}`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={1}>
          {TRANSACTIONS.map((tx, i) => (
            <Card key={i} variant="outlined">
              <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{tx.time}</Typography>
                    <Typography variant="body2" fontWeight={600}>{t('dashboard.payments.table', { number: tx.table })}</Typography>
                    <Chip label={tx.method} size="small" color={METHOD_COLOR[tx.method] ?? 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                  </Stack>
                  <Stack alignItems="flex-end">
                    <Typography variant="body2" fontWeight={700}>{t('dashboard.payments.currency', { amount: tx.amount })}</Typography>
                    {tx.tip > 0 && <Typography variant="caption" color="success.main">{t('dashboard.payments.tip_amount', { amount: String(tx.tip) })}</Typography>}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {tab === 1 && (
        <Card variant="outlined">
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ height: 120 }}>
              {WEEKLY_TOTALS.map((total, i) => {
                const dayKey = WEEKLY_DAY_KEYS[i];
                const dayLabel = t(`dashboard.payments.day_${dayKey}`);
                return (
                <Box key={dayKey} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {Math.round(total / 1000 * 10) / 10}k
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.round((total / maxWeek) * 90)}px`,
                      bgcolor: 'primary.main',
                      borderRadius: `${vmin(4)} ${vmin(4)} 0 0`,
                      opacity: i === SAT_INDEX ? 1 : 0.6,
                      transition: 'height 0.3s',
                    }}
                  />
                  <Typography variant="caption" color="text.disabled" fontSize="0.65rem">{dayLabel}</Typography>
                </Box>
                );
              })}
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" color="success.main" fontWeight={600}>{t('dashboard.payments.weekly_change')}</Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="caption" color="text.disabled" textAlign="center">
        {t('dashboard.payments.coming_soon')}
      </Typography>
    </Box>
  );
}

export default function PaymentsPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <RequireOrganization>
      <PermissionGate permission={PERMISSIONS.PAYMENTS_VIEW} fallback={
        <PageContainer sx={{ textAlign: 'center' }}>
          <Typography color="text.secondary">{t('dashboard.payments.no_access')}</Typography>
        </PageContainer>
      }>
        <PaymentsPageContent />
      </PermissionGate>
    </RequireOrganization>
  );
}
