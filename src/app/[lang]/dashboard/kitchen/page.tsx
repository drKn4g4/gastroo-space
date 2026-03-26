'use client';

import {
  Box, Typography, Stack, Chip, Card, CardContent, CardActionArea,
  LinearProgress,
} from '@mui/material';
import KitchenIcon from '@mui/icons-material/Kitchen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import PageContainer from '@/app/[lang]/components/PageContainer';

const TICKETS = [
  { id: 'KDS-01', table: '7',  items: ['Zupa dnia ×2', 'Sałatka Cezar'],      elapsed: 6,  target: 12, done: false },
  { id: 'KDS-02', table: '3',  items: ['Schabowy + surówka', 'Żurek'],         elapsed: 11, target: 15, done: false },
  { id: 'KDS-03', table: '2',  items: ['Burger wołowy', 'Frytki ×2', 'Cola'], elapsed: 14, target: 12, done: false },
  { id: 'KDS-04', table: '9',  items: ['Pierogi ruskie ×3'],                   elapsed: 18, target: 12, done: true  },
];

function KitchenPageContent() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <KitchenIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('dashboard.kitchen.title')}</Typography>
        <Chip label={t('dashboard.kitchen.mockup')} size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: 11 }} />
        <Chip
          label={t('dashboard.kitchen.tickets_count', { count: 4 })}
          size="small"
          color="error"
          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, ml: 'auto !important' }}
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}
      >
        {TICKETS.map((ticket) => {
          const pct = Math.min((ticket.elapsed / ticket.target) * 100, 100);
          const overdue = ticket.elapsed > ticket.target;
          return (
            <Card
              key={ticket.id}
              variant="outlined"
              sx={{
                opacity: ticket.done ? 0.5 : 1,
                borderColor: overdue && !ticket.done ? 'error.main' : 'divider',
                transition: 'border-color 0.2s',
              }}
            >
              <CardActionArea sx={{ p: 0 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" fontWeight={700} color="text.disabled">{ticket.id}</Typography>
                    <Chip
                      label={t('dashboard.kitchen.table', { number: ticket.table })}
                      size="small"
                      color={ticket.done ? 'default' : overdue ? 'error' : 'primary'}
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                    />
                  </Stack>

                  <Stack spacing={0.25} mb={1.5}>
                    {ticket.items.map((item) => (
                      <Typography key={item} variant="body2" fontWeight={500}>{item}</Typography>
                    ))}
                  </Stack>

                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {ticket.done
                        ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        : <HourglassTopIcon sx={{ fontSize: 14, color: overdue ? 'error.main' : 'warning.main' }} />
                      }
                      <Typography variant="caption" color={overdue && !ticket.done ? 'error.main' : 'text.secondary'} fontWeight={600}>
                        {ticket.elapsed} / {ticket.target} min
                      </Typography>
                    </Stack>
                    {ticket.done && (
                      <Typography variant="caption" color="success.main" fontWeight={700}>{t('dashboard.kitchen.done')}</Typography>
                    )}
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={ticket.done ? 'success' : overdue ? 'error' : 'primary'}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.disabled" textAlign="center">
        {t('dashboard.kitchen.coming_soon')}
      </Typography>
    </Box>
  );
}

export default function KitchenPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

	  return (
	    <RequireOrganization>
	      <PermissionGate permission={PERMISSIONS.KITCHEN_VIEW} fallback={
	        <PageContainer sx={{ textAlign: 'center' }}>
	          <Typography color="text.secondary">{t('dashboard.kitchen.no_access')}</Typography>
	        </PageContainer>
	      }>
	        <KitchenPageContent />
	      </PermissionGate>
	    </RequireOrganization>
	  );
	}
