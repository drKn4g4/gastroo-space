'use client';

import { useTranslation } from '@/lib/i18n/client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import {
  collection, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useAuth } from '../providers/AuthProvider';
import { useOrganization } from '../providers/OrganizationProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  Box, Typography, Card, CardContent, Stack, CircularProgress,
  Chip, Avatar, Accordion, AccordionSummary, AccordionDetails,
  Dialog, IconButton, useMediaQuery, useTheme, LinearProgress, Table,
  TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import TableBarIcon from '@mui/icons-material/TableBar';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorIcon from '@mui/icons-material/Error';
import { format } from 'date-fns';
import T from '@/styles/pos.tokens';
import SwipePages from './components/SwipePages';

import type { BookingSummary as Booking, Shift } from '@/types/pos';

// ─── Loader ──────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Staff section assignment based on role */
function roleToSection(role: string): string {
  switch (role) {
    case 'waiter': case 'sommelier': case 'cashier': return 'sala';
    case 'bartender': return 'bar';
    case 'chef': case 'kitchen': return 'kuchnia';
    default: return 'zaplecze';
  }
}

// ─── Types for bills (active sessions as open bills) ─────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  status: string;
}

interface BillSummary {
  id: string;
  tableName: string;
  tableNumber: number;
  guestCount: number;
  total: number;
  currency: string;
  status: 'active' | 'payment_pending' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  staffName?: string;
  items: OrderItem[];
}


// ═════════════════════════════════════════════════════════════════════════════
// TAB 1: DZIŚ (Executive Dashboard)
// ═════════════════════════════════════════════════════════════════════════════

function TodayTab({
  shifts, allMembers, bookings, openBills, closedBills, loading, lang, tableCount,
}: {
  shifts: Shift[];
  allMembers: number;
  bookings: Booking[];
  openBills: BillSummary[];
  closedBills: BillSummary[];
  loading: boolean;
  lang: string;
  tableCount: number;
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const now = format(new Date(), 'HH:mm');

  const onShift = shifts.filter((s) => ['active', 'on_break'].includes(s.status)).length;
  const totalBillsToday = openBills.length + closedBills.length;
  const todayRevenue = [...openBills, ...closedBills].reduce((sum, b) => sum + b.total, 0);
  const currency = openBills[0]?.currency ?? closedBills[0]?.currency ?? 'PLN';
  const totalGuests = [...openBills, ...closedBills].reduce((sum, b) => sum + b.guestCount, 0);
  // Liczba zajętych stolików: unikalne numery stolików z rachunków otwartych i zamkniętych
  const occupiedTableNumbers = Array.from(new Set([...openBills, ...closedBills].map((b) => b.tableNumber)));
  const occupiedTables = occupiedTableNumbers.length;
  const totalTables = tableCount || Math.max(occupiedTables, 12);

  // Upcoming reservations (not yet past, not cancelled)
  const upcoming = bookings
    .filter((b) => b.bookingTime >= now && b.status !== 'cancelled')
    .slice(0, 6);
  const remainingBookings = bookings.filter((b) => b.bookingTime >= now && b.status !== 'cancelled').length - upcoming.length;

  // Przeszłe rezerwacje (zrealizowane lub odwołane)
  const pastReservations = bookings
    .filter((b) => b.bookingTime < now && b.status !== 'cancelled');

  // Find the next arriving reservation
  const nextArriving = upcoming[0];

  // Orders that need attention (items ordered or preparing)
  const attentionOrders = openBills.filter((b) =>
    b.items.some((it) => it.status === 'ordered' || it.status === 'preparing'),
  );

  // Active staff grouped
  const activeStaff = shifts.filter((s) => ['active', 'on_break'].includes(s.status));
  const shiftLead = activeStaff.find((s) => ['owner', 'admin', 'manager'].includes(s.role));

  if (loading) return <Loader />;

  // ─── Column 1: Core Metrics ─────────────────────────────────────────

  const metricsColumn = (
    <Stack spacing={2}>
      {/* Revenue Card */}
      <Card sx={{ position: 'relative', overflow: 'hidden' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Box sx={{ p: 0.75, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '8px', color: 'primary.main', display: 'flex' }}>
              <PaymentsIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
            {closedBills.length > 0 && (
              <Chip
                size="small"
                icon={<TrendingUpIcon sx={{ fontSize: '0.75rem !important' }} />}
                label={`${totalBillsToday} ${t('dashboard.exec.orders_today')}`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22 }}
              />
            )}
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
            {t('dashboard.exec.turnover')}
          </Typography>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
            {todayRevenue.toFixed(2)} {currency}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={totalTables > 0 ? Math.min((occupiedTables / totalTables) * 100, 100) : 0}
              sx={{ height: 4, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.06), '& .MuiLinearProgress-bar': { borderRadius: 2 } }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Active Tables — dark inverted card */}
      <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : '#1e293b', color: 'white', overflow: 'hidden' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
              {t('dashboard.exec.active_tables')}
            </Typography>
            <TableBarIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
          </Stack>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {occupiedTables}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
              / {totalTables}
            </Typography>
          </Stack>
          {/* Table grid dots */}
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.75 }}>
            {Array.from({ length: Math.min(totalTables, 24) }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: i < occupiedTables ? 'primary.main' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Guest Count */}
      <Card>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
              {t('dashboard.exec.guest_count')}
            </Typography>
            <Box sx={{ p: 0.75, bgcolor: alpha(theme.palette.text.primary, 0.05), borderRadius: '8px', display: 'flex' }}>
              <PersonPinIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
            </Box>
          </Stack>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {totalGuests}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <Typography component="span" sx={{ fontWeight: 700, color: 'success.main', fontSize: 'inherit' }}>
              {onShift}
            </Typography>
            {' '}{t('dashboard.exec.staff_serving')}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );

  // ─── Column 2: Reservations Table ───────────────────────────────────

  const reservationsColumn = (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 420 : undefined }}>
      <Box sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800 }}>
          {t('dashboard.exec.upcoming_reservations')}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6rem', color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {bookings.length} {t('dashboard.exec.total_today')}
        </Typography>
      </Box>
      <TableContainer sx={{ flex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.disabled', borderBottom: 'none', py: 1, px: 2.5 } }}>
              <TableCell>{t('dashboard.exec.time')}</TableCell>
              <TableCell>{t('dashboard.exec.guest_name')}</TableCell>
              <TableCell>{t('dashboard.exec.party_size')}</TableCell>
              <TableCell>{t('dashboard.exec.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {upcoming.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                  <CalendarMonthIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                  <Typography variant="body2">{t('dashboard.exec.no_upcoming')}</Typography>
                </TableCell>
              </TableRow>
            ) : upcoming.map((b) => {
              const isNext = b.id === nextArriving?.id;
              return (
                <TableRow
                  key={b.id}
                  sx={{
                    '& td': { py: 1.75, px: 2.5, borderBottom: '1px solid', borderColor: 'divider' },
                    ...(isNext && {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      borderLeft: `3px solid ${theme.palette.primary.main}`,
                    }),
                  }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                      {b.bookingTime}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: isNext ? 700 : 500, fontSize: '0.8rem' }} noWrap>
                      {b.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${b.guestCount} ${t('dashboard.exec.people')}`}
                      sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22, bgcolor: alpha(theme.palette.text.primary, 0.05) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{
                      fontWeight: 700,
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      color: b.status === 'confirmed' ? 'text.disabled'
                        : b.status === 'seated' ? 'success.main'
                        : 'primary.main',
                    }}>
                      {isNext ? t('dashboard.exec.arriving_soon') : (b.status === 'seated' ? t('dashboard.exec.seated') : t('dashboard.exec.confirmed'))}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {remainingBookings > 0 && (
        <Box sx={{ py: 1.5, textAlign: 'center', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontWeight: 500 }}>
            {t('dashboard.exec.more_reservations', { count: remainingBookings })}
          </Typography>
        </Box>
      )}
    </Card>
  );

  // ─── Column 3: Alerts + Staff ───────────────────────────────────────

  const alertsColumn = (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {t('dashboard.exec.active_orders')}
            </Typography>
            {attentionOrders.length === 0 ? (
              <Chip
                size="small"
                label={t('dashboard.exec.all_clear')}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22 }}
              />
            ) : (
              <Chip
                size="small"
                label={`${attentionOrders.length} ${t('dashboard.exec.items_pending')}`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22 }}
              />
            )}
          </Stack>

          {attentionOrders.length > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
              {t('dashboard.exec.subtitle')}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
              {t('dashboard.exec.all_clear')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {t('dashboard.exec.staff_on_duty')}
            </Typography>
            <Chip
              size="small"
              label={`${activeStaff.length}/${allMembers}`}
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22 }}
            />
          </Stack>

          {activeStaff.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              {t('dashboard.team_section.nobody_on_shift')}
            </Typography>
          ) : (
            <>
              <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {activeStaff.slice(0, 5).map((s) => (
                  <Avatar
                    key={s.id}
                    sx={{
                      width: '2rem',
                      height: '2rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                      color: 'text.secondary',
                      border: s.status === 'on_break'
                        ? `0.125rem solid ${alpha(theme.palette.warning.main, 0.5)}`
                        : `0.125rem solid ${alpha(theme.palette.background.paper, 0)}`,
                    }}
                    title={`${s.staffName} · ${t(`dashboard.roles.${s.role}`) || s.role}`}
                  >
                    {(s.staffName?.[0] || '?').toUpperCase()}
                  </Avatar>
                ))}

                {activeStaff.length > 5 && (
                  <Avatar
                    sx={{
                      width: '2rem',
                      height: '2rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      bgcolor: alpha(theme.palette.text.primary, 0.03),
                      color: 'text.secondary',
                      border: `0.125rem solid ${alpha(theme.palette.background.paper, 0.9)}`,
                    }}
                    title={t('dashboard.exec.staff_on_duty')}
                  >
                    {'+' + (activeStaff.length - 5)}
                  </Avatar>
                )}
              </Stack>

              {shiftLead && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block', fontSize: '0.65rem', fontWeight: 500 }}>
                  {t('dashboard.exec.shift_lead')}: {shiftLead.staffName}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ─── Layout ─────────────────────────────────────────────────────────

  if (!isDesktop) {
    // Mobile: stacked
    return (
      <Box sx={{ p: 2.5, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
          {t('dashboard.tab_today')}
        </Typography>
        <Stack spacing={2.5}>
          {metricsColumn}
          {reservationsColumn}
          {alertsColumn}
        </Stack>
      </Box>
    );
  }

  // Desktop: 3-column grid
  return (
    <Box sx={{ p: 3, pb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {t('dashboard.exec.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {t('dashboard.exec.subtitle')}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
          {format(new Date(), 'dd/MM/yyyy')}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 5fr 4fr', gap: 2.5, alignItems: 'start' }}>
        {metricsColumn}
        {reservationsColumn}
        {alertsColumn}
      </Box>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2: ZESPÓŁ (Team by section)
// ═════════════════════════════════════════════════════════════════════════════

interface SectionGroup {
  key: string;
  label: string;
  onShift: Shift[];
  totalMembers: number;
}

function TeamTab({
  shifts, membersBySection, lang,
}: {
  shifts: Shift[];
  membersBySection: Record<string, number>;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'dashboard');

  const sections: SectionGroup[] = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    for (const s of shifts) {
      const sec = roleToSection(s.role);
      (grouped[sec] ??= []).push(s);
    }
    const sectionOrder = ['sala', 'bar', 'kuchnia', 'zaplecze'];
    return sectionOrder.map((key) => ({
      key,
      label: t(`dashboard.team_section.${key}`),
      onShift: (grouped[key] ?? []).filter((s) => ['active', 'on_break', 'scheduled'].includes(s.status)),
      totalMembers: membersBySection[key] ?? 0,
    }));
  }, [shifts, membersBySection, t]);

  return (
    <Box sx={{ p: 2.5, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
        {t('dashboard.tab_team')}
      </Typography>

      <Stack spacing={2}>
        {sections.map((sec) => (
          <Card key={sec.key}>
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: sec.onShift.length > 0 ? 1.5 : 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  {sec.label}
                </Typography>
                <Chip
                  label={`${sec.onShift.length}/${sec.totalMembers}`}
                  size="small"
                  color={sec.onShift.length > 0 ? 'primary' : 'default'}
                  sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                />
              </Stack>
              {sec.onShift.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  {t('dashboard.team_section.nobody_on_shift')}
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {sec.onShift.map((shift) => (
                    <Stack key={shift.id} direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', fontWeight: 700, bgcolor: shift.status === 'active' ? 'success.main' : 'action.selected' }}>
                        {shift.staffName?.[0] ?? '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                          {shift.staffName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {shift.role}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={shift.status === 'active' ? t('dashboard.team_section.status_active') : shift.status === 'on_break' ? t('dashboard.team_section.status_break') : t('dashboard.team_section.status_scheduled')}
                        color={shift.status === 'active' ? 'success' : shift.status === 'on_break' ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.6rem', height: 20 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3: RACHUNKI (Bills)
// ═════════════════════════════════════════════════════════════════════════════

function BillCard({ bill, onClick, t }: { bill: BillSummary; onClick: () => void; t: (k: string) => string }) {
  const itemsSummary = bill.items.length > 0
    ? bill.items.map((it) => it.quantity > 1 ? `${it.quantity}x ${it.name}` : it.name).join(' · ')
    : '';

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5, borderRadius: '12px', bgcolor: 'background.paper',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)', cursor: 'pointer',
        transition: 'all 0.15s', '&:hover': { bgcolor: 'action.hover' },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: bill.status === 'active' ? 'success.main' : bill.status === 'payment_pending' ? 'warning.main' : 'action.selected', fontSize: '0.7rem', fontWeight: 800 }}>
            {bill.tableNumber}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {bill.tableName || `${t('dashboard.bills.table')} #${bill.tableNumber}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {bill.guestCount} {t('dashboard.bills.guests')} {bill.staffName ? `· ${bill.staffName}` : ''}
            </Typography>
            {itemsSummary && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block' }} noWrap>
                {itemsSummary}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.25} sx={{ flexShrink: 0, ml: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {bill.total.toFixed(2)} {bill.currency}
          </Typography>
          {bill.items.length > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
              {bill.items.length} {t('dashboard.bills.items_count')}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function BillPreview({ bill, onClose, t }: { bill: BillSummary; onClose: () => void; t: (k: string) => string }) {
  const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
    ordered: 'warning',
    preparing: 'info',
    served: 'success',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {bill.tableName || `${t('dashboard.bills.table')} #${bill.tableNumber}`}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Stack>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('dashboard.bills.status_label')}</Typography>
          <Chip
            size="small"
            label={bill.status === 'active' ? t('dashboard.bills.open') : bill.status === 'payment_pending' ? t('dashboard.bills.payment_pending') : t('dashboard.bills.closed')}
            color={bill.status === 'active' ? 'success' : bill.status === 'payment_pending' ? 'warning' : 'default'}
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('dashboard.bills.guests')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{bill.guestCount}</Typography>
        </Stack>
        {bill.staffName && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('dashboard.bills.staff')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{bill.staffName}</Typography>
          </Stack>
        )}

        {/* Order items */}
        {bill.items.length > 0 && (
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, fontSize: '0.6rem', color: 'text.secondary', mb: 0.5, display: 'block' }}>
              {t('dashboard.bills.order_items')}
            </Typography>
            <Stack spacing={0.5}>
              {bill.items.map((item, idx) => (
                <Stack key={idx} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={t(`dashboard.bills.item_${item.status}`) || item.status}
                      color={STATUS_COLORS[item.status] ?? 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.55rem', height: 18 }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', ml: 1, flexShrink: 0 }}>
                    {(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>{t('dashboard.bills.total')}</Typography>
          <Typography variant="body1" sx={{ fontWeight: 900 }}>{bill.total.toFixed(2)} {bill.currency}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function BillsTab({
  openBills, closedBills, loading, lang,
}: {
  openBills: BillSummary[];
  closedBills: BillSummary[];
  loading: boolean;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [selected, setSelected] = useState<BillSummary | null>(null);

  if (loading) return <Loader />;

  const billList = (bills: BillSummary[], emptyMsg: string) =>
    bills.length === 0 ? (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
        <ReceiptLongIcon sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
        <Typography variant="body2">{emptyMsg}</Typography>
      </Box>
    ) : (
      <Stack spacing={1}>
        {bills.map((b) => <BillCard key={b.id} bill={b} onClick={() => setSelected(b)} t={t} />)}
      </Stack>
    );

  if (isDesktop) {
    return (
      <Box sx={{ p: 2.5, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
          {t('dashboard.tab_bills')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr 1fr' : '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('dashboard.bills.open')} <Chip size="small" label={openBills.length} sx={{ fontWeight: 800, height: 20 }} />
            </Typography>
            {billList(openBills, t('dashboard.bills.no_open'))}
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('dashboard.bills.today')} <Chip size="small" label={closedBills.length} sx={{ fontWeight: 800, height: 20 }} />
            </Typography>
            {billList(closedBills, t('dashboard.bills.no_closed'))}
          </Box>
          {selected && (
            <Card>
              <BillPreview bill={selected} onClose={() => setSelected(null)} t={t} />
            </Card>
          )}
        </Box>
      </Box>
    );
  }

  // Mobile: accordions + dialog for preview
  return (
    <Box sx={{ p: 2.5, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
        {t('dashboard.tab_bills')}
      </Typography>
      <Stack spacing={1.5}>
        <Accordion defaultExpanded disableGutters sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, bgcolor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('dashboard.bills.open')}</Typography>
              <Chip size="small" label={openBills.length} color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {billList(openBills, t('dashboard.bills.no_open'))}
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, bgcolor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('dashboard.bills.today')}</Typography>
              <Chip size="small" label={closedBills.length} sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {billList(closedBills, t('dashboard.bills.no_closed'))}
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '16px' } }}>
        {selected && <BillPreview bill={selected} onClose={() => setSelected(null)} t={t} />}
      </Dialog>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 4: REZERWACJE (Reservations today)
// ═════════════════════════════════════════════════════════════════════════════

function BookingRow({ booking, isPast, t }: { booking: Booking; isPast: boolean; t: (k: string) => string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{
      px: 2, py: 1.5, borderRadius: '12px', bgcolor: 'background.paper',
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
      opacity: booking.status === 'cancelled' ? 0.5 : 1,
    }}>
      {isPast && booking.status !== 'cancelled' ? (
        <CheckCircleIcon sx={{ fontSize: '1.1rem', color: 'success.main', flexShrink: 0 }} />
      ) : (
        <AccessTimeIcon sx={{ fontSize: '1.1rem', color: booking.status === 'cancelled' ? 'text.disabled' : 'primary.main', flexShrink: 0 }} />
      )}
      <Typography sx={{ fontWeight: 700, fontSize: T.bookingTimeFont, fontVariantNumeric: 'tabular-nums', minWidth: '5ch' }}>
        {booking.bookingTime}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600, lineHeight: 1.3,
            textDecoration: booking.status === 'cancelled' ? 'line-through' : 'none',
          }}
          noWrap
        >
          {booking.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {booking.guestCount} {t('dashboard.guests')}
          {booking.notes ? ` · ${booking.notes}` : ''}
        </Typography>
      </Box>
    </Stack>
  );
}

function ReservationsTab({
  bookings, loading, lang,
}: {
  bookings: Booking[];
  loading: boolean;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [selected, setSelected] = useState<Booking | null>(null);
  const now = format(new Date(), 'HH:mm');

  const completed = bookings.filter((b) => b.bookingTime < now || b.status === 'cancelled');
  const upcoming = bookings.filter((b) => b.bookingTime >= now && b.status !== 'cancelled');

  if (loading) return <Loader />;

  const bookingList = (items: Booking[], isPast: boolean, emptyMsg: string) =>
    items.length === 0 ? (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
        <CalendarMonthIcon sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
        <Typography variant="body2">{emptyMsg}</Typography>
      </Box>
    ) : (
      <Stack spacing={1}>
        {items.map((b) => (
          <Box key={b.id} onClick={() => setSelected(b)} sx={{ cursor: 'pointer' }}>
            <BookingRow booking={b} isPast={isPast} t={t} />
          </Box>
        ))}
      </Stack>
    );

  const previewPanel = selected && (
    <Card>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>{selected.name}</Typography>
          <IconButton size="small" onClick={() => setSelected(null)}><CloseIcon /></IconButton>
        </Stack>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('dashboard.reservations.time')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{selected.bookingTime}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('dashboard.bills.guests')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{selected.guestCount}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('dashboard.reservations.status')}</Typography>
            <Chip
              size="small"
              label={selected.status === 'cancelled' ? t('dashboard.reservations.cancelled') : selected.bookingTime < now ? t('dashboard.reservations.completed') : t('dashboard.reservations.upcoming_label')}
              color={selected.status === 'cancelled' ? 'error' : selected.bookingTime < now ? 'success' : 'info'}
              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Stack>
          {selected.notes && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">{t('dashboard.reservations.notes')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{selected.notes}</Typography>
            </Stack>
          )}
        </Stack>
      </Box>
    </Card>
  );

  if (isDesktop) {
    return (
      <Box sx={{ p: 2.5, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
          {t('dashboard.tab_reservations')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr 1fr' : '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('dashboard.reservations.completed')} <Chip size="small" label={completed.length} sx={{ fontWeight: 800, height: 20 }} />
            </Typography>
            {bookingList(completed, true, t('dashboard.reservations.no_completed'))}
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('dashboard.reservations.upcoming')} <Chip size="small" label={upcoming.length} sx={{ fontWeight: 800, height: 20 }} />
            </Typography>
            {bookingList(upcoming, false, t('dashboard.reservations.no_upcoming'))}
          </Box>
          {previewPanel}
        </Box>
      </Box>
    );
  }

  // Mobile
  return (
    <Box sx={{ p: 2.5, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2.5 }}>
        {t('dashboard.tab_reservations')}
      </Typography>
      <Stack spacing={1.5}>
        <Accordion defaultExpanded disableGutters sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, bgcolor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('dashboard.reservations.completed')}</Typography>
              <Chip size="small" label={completed.length} color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {bookingList(completed, true, t('dashboard.reservations.no_completed'))}
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded disableGutters sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, bgcolor: 'background.paper' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('dashboard.reservations.upcoming')}</Typography>
              <Chip size="small" label={upcoming.length} color="info" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {bookingList(upcoming, false, t('dashboard.reservations.no_upcoming'))}
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '16px' } }}>
        {selected && (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{selected.name}</Typography>
              <IconButton size="small" onClick={() => setSelected(null)}><CloseIcon /></IconButton>
            </Stack>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{t('dashboard.reservations.time')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selected.bookingTime}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{t('dashboard.bills.guests')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selected.guestCount}</Typography>
              </Stack>
              {selected.notes && (
                <Typography variant="body2" color="text.secondary">{selected.notes}</Typography>
              )}
            </Stack>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { user } = useAuth();
  const { organization, currentRestaurant, member, loading: orgLoading } = useOrganization();
  const perms = usePermissions();
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const { t } = useTranslation(lang, 'dashboard');

  // ─── State ────────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [openBills, setOpenBills] = useState<BillSummary[]>([]);
  const [closedBills, setClosedBills] = useState<BillSummary[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [allMemberCount, setAllMemberCount] = useState(0);
  const [membersBySection, setMembersBySection] = useState<Record<string, number>>({});

  const today = format(new Date(), 'yyyy-MM-dd');

  // ─── Bookings listener (today) ────────────────────────────────────────────
  useEffect(() => {
    if (!organization || !currentRestaurant) return;
    const q = query(
      collection(db, 'bookings'),
      where('organizationId', '==', organization.id),
      where('restaurantId', '==', currentRestaurant.id),
      where('bookingDate', '==', today),
      orderBy('bookingTime', 'asc'),
    );
    const unsub = safeOnSnapshot(q, (snap: any) => {
      setBookings(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Booking));
      setBookingsLoading(false);
    }, () => setBookingsLoading(false));
    return unsub;
  }, [organization, currentRestaurant, today]);

  // ─── Shifts listener (today, all staff) ───────────────────────────────────
  useEffect(() => {
    if (!organization || !currentRestaurant) return;
    const q = query(
      collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/shifts`),
      where('date', '==', today),
    );
    const unsub = safeOnSnapshot(q, (snap: any) => {
      const data = snap.docs.map((d: any) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          scheduledStart: raw.scheduledStart instanceof Timestamp ? raw.scheduledStart.toDate() : raw.scheduledStart,
          scheduledEnd: raw.scheduledEnd instanceof Timestamp ? raw.scheduledEnd.toDate() : raw.scheduledEnd,
          actualStart: raw.actualStart instanceof Timestamp ? raw.actualStart.toDate() : raw.actualStart,
          actualEnd: raw.actualEnd instanceof Timestamp ? raw.actualEnd.toDate() : raw.actualEnd,
        } as Shift;
      });
      setShifts(data);
      setShiftsLoading(false);
    }, () => setShiftsLoading(false));
    return unsub;
  }, [organization, currentRestaurant, today]);

  // ─── Members count (all for this restaurant) ─────────────────────────────
  useEffect(() => {
    if (!organization) return;
    const q = collection(db, `organizations/${organization.id}/members`);
    const unsub = safeOnSnapshot(q, (snap: any) => {
      const members = snap.docs.map((d: any) => d.data());
      setAllMemberCount(members.length);
      const bySection: Record<string, number> = {};
      for (const m of members) {
        const sec = roleToSection(m.role ?? 'staff');
        bySection[sec] = (bySection[sec] ?? 0) + 1;
      }
      setMembersBySection(bySection);
    });
    return unsub;
  }, [organization]);

  // ─── Bills (activeSessions for this restaurant) ───────────────────────────
  useEffect(() => {
    if (!organization || !currentRestaurant) { setBillsLoading(false); return; }
    const q = query(
      collection(db, 'activeSessions'),
      where('organizationId', '==', organization.id),
      where('restaurantId', '==', currentRestaurant.id),
    );
    const unsub = safeOnSnapshot(q, (snap: any) => {
      const bills: BillSummary[] = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          tableName: data.tableName ?? '',
          tableNumber: data.tableNumber ?? 0,
          guestCount: data.guestIds?.length ?? 0,
          total: data.totals?.billTotal ?? 0,
          currency: data.currency ?? 'PLN',
          status: data.status ?? 'active',
          openedAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          closedAt: data.closedAt instanceof Timestamp ? data.closedAt.toDate() : undefined,
          staffName: data.hostName,
          items: (data.items ?? []).map((it: any) => ({
            name: it.name ?? '—',
            quantity: it.quantity ?? 1,
            price: it.price ?? 0,
            status: it.status ?? 'ordered',
          })),
        };
      });
      setOpenBills(bills.filter((b) => b.status === 'active' || b.status === 'payment_pending'));
      setClosedBills(bills.filter((b) => b.status === 'closed'));
      setBillsLoading(false);
    }, () => setBillsLoading(false));
    return unsub;
  }, [organization, currentRestaurant]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (orgLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user && !member) return null;

  const dataLoading = bookingsLoading || shiftsLoading || billsLoading;

  // ─── Build pages ────────────────────────────────────────────────────────
  const pages: { key: string; label: string; node: React.ReactNode }[] = [
    {
      key: 'home',
      label: t('dashboard.tab_today'),
      node: (
        <TodayTab
          shifts={shifts} allMembers={allMemberCount}
          bookings={bookings} openBills={openBills} closedBills={closedBills}
          loading={dataLoading} lang={lang}
          tableCount={currentRestaurant?.tableCount ?? 0}
        />
      ),
    },
    {
      key: 'bills',
      label: t('dashboard.tab_bills'),
      node: <BillsTab openBills={openBills} closedBills={closedBills} loading={billsLoading} lang={lang} />,
    },
    {
      key: 'bookings',
      label: t('dashboard.tab_reservations'),
      node: <ReservationsTab bookings={bookings} loading={bookingsLoading} lang={lang} />,
    },
    {
      key: 'team',
      label: t('dashboard.tab_team'),
      node: <TeamTab shifts={shifts} membersBySection={membersBySection} lang={lang} />,
    },
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Suspense fallback={<Loader />}>
        <SwipePages pages={pages} />
      </Suspense>
    </Box>
  );
}
