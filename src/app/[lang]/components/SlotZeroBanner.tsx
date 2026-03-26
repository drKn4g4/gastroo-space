'use client';

import { Box, Typography, Chip, Stack } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import TableBarIcon from '@mui/icons-material/TableBar';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSession } from '../providers/SessionProvider';
import { TEST_IDS } from '@/lib/testing/selectors';

/**
 * SlotZeroBanner — global sticky banner rendered when user has an active dine-in session.
 * Tapping it opens the SessionDashboard fullscreen drawer.
 * Rendered in the root layout so it persists across all space tabs.
 */
export default function SlotZeroBanner() {
  const { activeSession, sessionLoading, setDrawerOpen } = useSession();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (sessionLoading || !activeSession) return null;

  const { restaurantName, tableNumber, tableName, totals, status, items } = activeSession;
  const pendingCount = items.filter((i) => i.status === 'ordered').length;
  const preparingCount = items.filter((i) => i.status === 'preparing').length;

  const statusLabel =
    status === 'payment_pending'
      ? 'Oczekuje na platnosc'
      : preparingCount > 0
        ? `${preparingCount} w przygotowaniu`
        : pendingCount > 0
          ? `${pendingCount} zamowionych`
          : `${items.length} pozycji`;

  return (
    <Box
      data-testid={TEST_IDS.session.banner}
      onClick={() => setDrawerOpen(true)}
      sx={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        left: 16,
        right: 16,
        zIndex: 1300,
        cursor: 'pointer',
        borderRadius: '1rem',
        bgcolor: isDark
          ? alpha(theme.palette.primary.dark, 0.95)
          : alpha(theme.palette.primary.main, 0.95),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: theme.palette.primary.contrastText,
        px: 2,
        py: 1.5,
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
        transition: 'transform 0.15s',
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <TableBarIcon sx={{ fontSize: '1.25rem' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              data-testid={TEST_IDS.session.bannerRestaurant}
              variant="body2"
              sx={{ fontWeight: 800, lineHeight: 1.2 }}
              noWrap
            >
              {restaurantName || 'Sesja aktywna'} &middot; Stolik {tableName || `#${tableNumber}`}
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.85, fontWeight: 600, lineHeight: 1.2 }}
            >
              {statusLabel}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            data-testid={TEST_IDS.session.bannerTotal}
            icon={<ReceiptLongIcon sx={{ fontSize: '0.875rem !important' }} />}
            label={`${totals.billTotal.toFixed(2)} ${activeSession.currency}`}
            size="small"
            sx={{
              bgcolor: alpha('#fff', 0.2),
              color: 'inherit',
              fontWeight: 800,
              fontSize: '0.75rem',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          <ExpandMoreIcon
            sx={{
              fontSize: '1.25rem',
              opacity: 0.7,
              transform: 'rotate(180deg)',
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
