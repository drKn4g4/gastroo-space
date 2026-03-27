'use client';

import {
  Box, Typography, Stack, Chip, Card, CardContent, Divider,
  Avatar, LinearProgress,
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';
import { vw } from '@/styles/units';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useBillsFromActiveSessions } from '../hooks/useBillsFromActiveSessions';


function OrdersPageContent() {
  const params = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const lang = params[1] || 'pl';
  const { t } = useTranslation(lang, 'orders');
  const { organization, currentRestaurant } = useOrganization();
  const { openBills, closedBills, loading } = useBillsFromActiveSessions(organization?.id, currentRestaurant?.id);

  // Zbierz wszystkie zamówienia (pozycje) z otwartych rachunków
  const allOrders = openBills.flatMap((bill) =>
    bill.items.map((item) => ({
      table: bill.tableNumber,
      tableName: bill.tableName,
      status: item.status,
      itemName: item.name,
      quantity: item.quantity,
      price: item.price,
      billTotal: bill.total,
      staffName: bill.staffName,
      openedAt: bill.openedAt,
    }))
  );

  // Statystyki
  const openTables = openBills.length;
  const inKitchen = allOrders.filter((o) => o.status === 'preparing').length;
  const readyToPickup = allOrders.filter((o) => o.status === 'served').length;
  const todayTotal = openBills.reduce((sum, b) => sum + b.total, 0);

  const STATUS: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
    ordered: { label: t('orders.open'), color: 'warning' },
    preparing: { label: t('orders.kitchen'), color: 'info' },
    served: { label: t('orders.ready'), color: 'success' },
    billed: { label: t('orders.billed'), color: 'default' },
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('orders.title')}</Typography>
      </Stack>

      {/* Statystyki */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {[
          { label: t('orders.open_tables'), value: openTables, color: 'warning.main' },
          { label: t('orders.in_kitchen'), value: inKitchen, color: 'info.main' },
          { label: t('orders.ready_to_pickup'), value: readyToPickup, color: 'success.main' },
          { label: t('orders.today_total'), value: t('orders.currency', { amount: todayTotal }), color: 'primary.main' },
        ].map((s) => (
          <Card key={s.label} variant="outlined" sx={{ flex: `1 1 ${vw(140)}`, minWidth: 130 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Lista zamówień */}
      <Stack spacing={1}>
        {allOrders.length === 0 && (
          <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ py: 4 }}>
            {loading ? t('orders.loading') : t('orders.no_orders')}
          </Typography>
        )}
        {allOrders.map((o, idx) => {
          const st = STATUS[o.status] || { label: o.status, color: 'default' };
          return (
            <Card key={idx} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
                      <TableRestaurantIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{t('orders.table')} {o.table}</Typography>
                      <Typography variant="caption" color="text.secondary">{o.itemName} x{o.quantity}</Typography>
                    </Box>
                  </Stack>
                  <Stack alignItems="flex-end" spacing={0.25} sx={{ minWidth: 0 }}>
                    <Chip label={st.label} size="small" color={st.color} sx={{ height: 20, fontSize: '0.68rem' }} />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.primary"
                      sx={{
                        ml: 1,
                        maxWidth: { xs: '64px', sm: '90px' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                        display: 'block',
                      }}
                    >
                      {t('orders.currency', { amount: o.price * o.quantity })}
                    </Typography>
                  </Stack>
                </Stack>
                {o.status === 'preparing' && (
                  <LinearProgress variant="indeterminate" sx={{ mt: 1.5, height: 3, borderRadius: 2 }} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Divider />
      <Typography variant="caption" color="text.disabled" textAlign="center">
        {t('orders.pos_coming_soon')}
      </Typography>
    </Box>
  );
}

export default function OrdersPage() {
  const params = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const lang = params[1] || 'pl';
  const { t } = useTranslation(lang, 'orders');

	  return (
	    <RequireOrganization>
	      <PermissionGate permission={PERMISSIONS.ORDERS_VIEW} fallback={
	        <PageContainer sx={{ textAlign: 'center' }}>
	          <Typography color="text.secondary">{t('orders.no_access')}</Typography>
	        </PageContainer>
	      }>
	        <OrdersPageContent />
	      </PermissionGate>
	    </RequireOrganization>
	  );
	}
