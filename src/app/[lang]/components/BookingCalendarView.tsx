'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import { useApiClient } from '@/lib/hooks/useApiClient';
import {
  Box, Typography, Paper, IconButton, Stack, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText, TextField, MenuItem, Divider, Avatar,
  Select, FormControl, InputLabel, Alert, useMediaQuery, useTheme,
  InputAdornment,
} from '@mui/material';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, addMonths, subMonths, parseISO, isToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { Table } from '@/types/pos';
import { UI } from '@/styles/theme';
import { buildGoogleCalendarEventUrl } from '@/lib/googleCalendar';
import { TEST_IDS } from '@/lib/testing/selectors';
import { useTranslation } from 'react-i18next';

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  name: string;
  guestPhone?: string;
  guestEmail?: string;
  guestCount: number;
  bookingDate: string;
  bookingTime: string;
  bookingTimeEnd?: string;
  tableId?: string;
  tableNumber?: number;
  tableName?: string;
  notes?: string;
  source: 'manual' | 'google' | 'thefork' | 'online' | 'phone';
  createdByName?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  restaurantId?: string;
}

const MAX_DAILY = 12;

// Source label keys — translated at render time via t()
const SOURCE_KEYS: Record<Booking['source'], string> = {
  manual:  'bookings_view.source_manual',
  phone:   'bookings_view.source_phone',
  online:  'bookings_view.source_online',
  google:  'bookings_view.source_google',
  thefork: 'bookings_view.source_thefork',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function occupancyDot(count: number): string {
  if (count === 0) return 'transparent';
  if (count <= 2) return '#4ade80';
  if (count <= 5) return '#fbbf24';
  if (count <= 8) return '#fb923c';
  return '#f87171';
}

function occupancyBg(count: number): string | undefined {
  if (count === 0) return undefined;
  if (count <= 2) return 'rgba(74, 222, 128, 0.18)';
  if (count <= 5) return 'rgba(251, 191, 36, 0.22)';
  if (count <= 8) return 'rgba(251, 146, 60, 0.25)';
  return 'rgba(248, 113, 113, 0.28)';
}

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 9;
  return [`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`];
}).flat();

// ─── Formularz nowej rezerwacji ───────────────────────────────────────────────

interface BookingFormProps {
  open: boolean;
  mode: 'add' | 'edit';
  booking?: Booking | null;
  defaultDate: string;
  restaurantId?: string;
  existingBookings: Booking[];
  onClose: () => void;
}

function BookingDialog({ open, mode, booking, defaultDate, restaurantId, existingBookings, onClose }: BookingFormProps) {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { apiCall } = useApiClient();

  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [date, setDate]               = useState(defaultDate);
  const [time, setTime]               = useState('12:00');
  const [timeEnd, setTimeEnd]         = useState('14:00');
  const [timeEndManual, setTimeEndManual] = useState(false);
  const [guests, setGuests]           = useState(2);
  const [tableId, setTableId]         = useState<string>('auto');
  const [source, setSource]           = useState<Booking['source']>('manual');
  const [createdBy, setCreatedBy]     = useState(user?.displayName ?? '');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Stoliki realtime (using safeOnSnapshot for HMR safety)
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    if (open && mode === 'edit' && booking) {
      setName(booking.name);
      setPhone(booking.guestPhone ?? '');
      setEmail(booking.guestEmail ?? '');
      setDate(booking.bookingDate);
      setTime(booking.bookingTime);
      setTimeEnd(booking.bookingTimeEnd ?? addMinutesToTime(booking.bookingTime, 120));
      setGuests(booking.guestCount);
      setTableId(booking.tableId ?? 'auto');
      setSource(booking.source);
      setCreatedBy(booking.createdByName ?? '');
      setNotes(booking.notes ?? '');
      setTimeEndManual(true);
    } else if (open && mode === 'add') {
      setName(''); setPhone(''); setEmail(''); setNotes('');
      setDate(defaultDate); setTime('12:00'); setTimeEnd('14:00');
      setGuests(2); setTableId('auto'); setSource('manual');
      setCreatedBy(user?.displayName ?? ''); setTimeEndManual(false);
      setError('');
    }
  }, [open, mode, booking, defaultDate, user?.displayName]);

  useEffect(() => {
    if (!restaurantId || typeof window === 'undefined') return;
    let unsub: (() => void) | undefined;
    
    const timeoutId = setTimeout(() => {
      try {
        const orgId = organization?.id || 'demo-org';
        const q = collection(db, `organizations/${orgId}/restaurants/${restaurantId}/tables`);
        console.log(`📡 [Tables] Subscribing: ${restaurantId} (org: ${orgId})`);
        unsub = safeOnSnapshot(q, (snap) => {
          setTables((snap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }) as Table));
        }, (err) => console.error('❌ [Tables] Snapshot error:', err));
      } catch (err) { console.error('❌ [Tables] Subscription failed:', err); }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (unsub) {
        console.log(`🔌 [Tables] Unsubscribing: ${restaurantId}`);
        unsub();
      }
    };
  }, [restaurantId, organization?.id]);

  useEffect(() => { setDate(defaultDate); }, [defaultDate]);

  // Gdy zmienia się godzina startowa i user nie zmienił końcowej ręcznie → auto +2h
  useEffect(() => {
    if (!timeEndManual) setTimeEnd(addMinutesToTime(time, 120));
  }, [time, timeEndManual]);

  useEffect(() => {
    if (mode === 'add' && (source === 'manual' || source === 'phone')) setCreatedBy(user?.displayName ?? '');
    else if (mode === 'add') setCreatedBy(t(SOURCE_KEYS[source]));
  }, [source, user?.displayName, mode, t]);

  const occupiedTableIds = useMemo(() => new Set(
    existingBookings
      .filter((b) => b.bookingDate === date && b.bookingTime === time && b.tableId && b.id !== booking?.id)
      .map((b) => b.tableId as string),
  ), [existingBookings, date, time]);

  const availableTables = useMemo(() =>
    tables
      .filter((t) => t.capacity >= guests && !occupiedTableIds.has(t.id))
      .sort((a, b) => a.capacity - b.capacity),
  [tables, guests, occupiedTableIds]);

  const autoTable = availableTables[0];
  const resolvedTable = tableId === 'auto'
    ? autoTable
    : tables.find((t) => t.id === tableId);

  const handleSave = async () => {
    if (!name.trim()) { setError(t('bookings_view.error_name_required')); return; }
    setSaving(true); setError('');
    try {
      const orgId = organization?.id || 'demo-org';
      const commonData = {
        name:           name.trim(),
        phone:          phone.trim() || undefined,
        guestPhone:     phone.trim() || undefined, // kept for backward-compat reads
        guestEmail:     email.trim() || undefined,
        bookingDate:    date,
        bookingTime:    time,
        bookingTimeEnd: timeEnd,
        guestCount:     guests,
        tableId:        resolvedTable?.id ?? undefined,
        tableNumber:    resolvedTable?.number ?? undefined,
        tableName:      resolvedTable?.name ?? undefined,
        source,
        createdByName:  createdBy.trim() || undefined,
        notes:          notes.trim() || undefined,
      };

      if (mode === 'edit' && booking) {
        // Edit: direct Firestore update on global bookings collection
        await updateDoc(
          doc(db, 'bookings', booking.id),
          { ...commonData, updatedAt: serverTimestamp() }
        );
      } else {
        // Create: go through API for server-side validation & permission check
        const result = await apiCall('/api/bookings/create', {
          data: { ...commonData, orgId, restaurantId },
        });
        if (!result.ok) {
          setError(result.error ?? t('bookings_view.error_save'));
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(t('bookings_view.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {mode === 'edit' ? t('bookings_view.edit_booking') : t('bookings_view.new_booking')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

          <Typography variant="caption" color="text.secondary" fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('bookings_view.guest_data')}
          </Typography>

          <TextField
            label={t('bookings_view.guest_name')} value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth autoFocus required
            slotProps={{ input: { startAdornment: (
              <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>
            )}}}
          />
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('bookings_view.phone')} value={phone}
              onChange={(e) => setPhone(e.target.value)} fullWidth
              slotProps={{ input: { startAdornment: (
                <InputAdornment position="start"><PhoneIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>
              )}}}
            />
            <TextField
              label="E-mail" value={email}
              onChange={(e) => setEmail(e.target.value)} fullWidth
              slotProps={{ input: { startAdornment: (
                <InputAdornment position="start"><EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>
              )}}}
            />
          </Stack>

          <Divider />

          <Typography variant="caption" color="text.secondary" fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('bookings_view.date_and_table')}
          </Typography>

          {/* Data + gości */}
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('bookings_view.date')} type="date" value={date}
              onChange={(e) => setDate(e.target.value)} fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('bookings_view.guests')}</InputLabel>
              <Select value={guests} onChange={(e) => setGuests(Number(e.target.value))} label={t('bookings_view.guests')}>
                {[1,2,3,4,5,6,7,8,10,12,15,20].map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Godzina od / do */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControl fullWidth>
              <InputLabel>{t('bookings_view.time_from')}</InputLabel>
              <Select value={time} onChange={(e) => setTime(e.target.value)} label={t('bookings_view.time_from')}>
                {HOURS.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0 }}>–</Typography>
            <FormControl fullWidth>
              <InputLabel>{t('bookings_view.time_to')}</InputLabel>
              <Select
                value={timeEnd}
                onChange={(e) => { setTimeEnd(e.target.value); setTimeEndManual(true); }}
                label={t('bookings_view.time_to')}
              >
                {HOURS.filter((h) => h > time).map((h) => (
                  <MenuItem key={h} value={h}>{h}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {timeEndManual && (
              <Button size="small" variant="text" sx={{ flexShrink: 0, fontSize: '0.7rem' }}
                onClick={() => { setTimeEnd(addMinutesToTime(time, 120)); setTimeEndManual(false); }}>
                reset
              </Button>
            )}
          </Stack>

          {/* Stolik */}
          <FormControl fullWidth>
            <InputLabel>{t('bookings_view.table')}</InputLabel>
            <Select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              label={t('bookings_view.table')}
              startAdornment={
                <InputAdornment position="start">
                  <TableRestaurantIcon sx={{ fontSize: 18, color: 'text.disabled', ml: 0.5 }} />
                </InputAdornment>
              }
            >
              <MenuItem value="auto">
                <Typography variant="body2">
                  {t('bookings_view.table_auto')}
                  {autoTable
                    ? ` → ${t('bookings_view.table_number_short', { number: autoTable.number })}${autoTable.name ? ` (${autoTable.name})` : ''}, ${autoTable.capacity} ${t('bookings_view.persons_short')}`
                    : tables.length === 0 ? ` (${t('bookings_view.no_tables')})` : ` (${t('bookings_view.no_free_tables')})`}
                </Typography>
              </MenuItem>
              {tables.length > 0 && <Divider />}
              {tables.map((tbl) => {
                const busy = occupiedTableIds.has(tbl.id);
                const tooSmall = tbl.capacity < guests;
                return (
                  <MenuItem key={tbl.id} value={tbl.id} disabled={busy || tooSmall}>
                    <Stack direction="row" spacing={1} alignItems="center" width="100%">
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {t('bookings_view.table_number_short', { number: tbl.number })}{tbl.name ? ` — ${tbl.name}` : ''}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip size="small" label={`${tbl.capacity} ${t('bookings_view.persons_short')}`} sx={{ height: 18, fontSize: '0.65rem' }} />
                        {busy && <Chip size="small" label={t('bookings_view.table_busy')} color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        {tooSmall && !busy && <Chip size="small" label={t('bookings_view.table_too_small')} sx={{ height: 18, fontSize: '0.65rem', opacity: 0.5 }} />}
                      </Stack>
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Divider />

          <Typography variant="caption" color="text.secondary" fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('bookings_view.source_section')}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <FormControl fullWidth>
              <InputLabel>{t('bookings_view.source')}</InputLabel>
              <Select value={source} onChange={(e) => setSource(e.target.value as Booking['source'])} label={t('bookings_view.source')}>
                {(Object.keys(SOURCE_KEYS) as Booking['source'][]).map((val) => (
                  <MenuItem key={val} value={val}>{t(SOURCE_KEYS[val])}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={source === 'manual' || source === 'phone' ? t('bookings_view.source_manual') : t('bookings_view.service_operator')}
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              fullWidth
              slotProps={{ input: { startAdornment: (
                <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>
              )}}}
            />
          </Stack>

          <TextField
            label={t('bookings_view.notes')} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline rows={2} fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>{t('bookings_view.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={16} /> : mode === 'edit' ? t('bookings_view.update') : t('bookings_view.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Panel szczegółów dnia ────────────────────────────────────────────────────

interface DayPanelProps {
  selectedDate: Date;
  bookings: Booking[];
  loading: boolean;
    cancelling: string | null;
    onCancel: (id: string) => void;
  onAdd: () => void;
  onEdit: (booking: Booking) => void;
  isShiftDay?: boolean;
}

  function DayPanel({ selectedDate, bookings, loading, cancelling, onCancel, onAdd, onEdit, isShiftDay = true }: DayPanelProps) {
  const { t } = useTranslation('dashboard');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = bookings
    .filter((b) => b.bookingDate === selectedDateStr)
    .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  const totalGuests = dayBookings.reduce((s, b) => s + b.guestCount, 0);
  const pct = Math.round((dayBookings.length / MAX_DAILY) * 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Nagłówek dnia */}
      <Box sx={{
        px: 2.5, pt: 2, pb: 1.5, flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.1 }}>
              {format(selectedDate, 'd MMMM', { locale: pl })}
            </Typography>
            <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
              {format(selectedDate, 'EEEE yyyy', { locale: pl })}
            </Typography>
          </Box>
          <Button
            size="small" variant="contained" startIcon={<AddIcon />}
            onClick={onAdd}
            data-testid={TEST_IDS.booking.addButton}
            sx={{ height: 32, fontSize: '0.75rem', flexShrink: 0, mt: 0.25 }}
          >
            {t('bookings_view.add')}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mt={1.25} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {loading ? '…' : t('bookings_view.bookings_count', { count: dayBookings.length })}
            </Typography>
          </Stack>
          {!loading && dayBookings.length > 0 && (
            <>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PeopleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {t('bookings_view.guests_count', { count: totalGuests })}
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={t('bookings_view.occupancy_pct', { pct })}
                sx={{
                  height: 18, fontSize: '0.62rem', fontWeight: 700,
                  bgcolor: occupancyDot(dayBookings.length) + '28',
                  color: occupancyDot(dayBookings.length),
                }}
              />
            </>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Lista rezerwacji */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 1.5, pb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !isShiftDay ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CalendarMonthIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.15, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled">{t('bookings_view.day_off')}</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              {t('bookings_view.no_shift_scheduled')}
            </Typography>
          </Box>
        ) : dayBookings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CalendarMonthIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.2, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled">{t('bookings_view.no_bookings_day')}</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              {t('bookings_view.click_add_hint')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {dayBookings.map((b) => {
              const statusColor = b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'default';
              const statusLabel = b.status === 'confirmed' ? t('bookings_view.status_confirmed') : b.status === 'pending' ? t('bookings_view.status_pending') : t('bookings_view.status_cancelled');
              return (
                <Paper key={b.id} variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700, flexShrink: 0, mt: 0.25 }}>
                      {b.name[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>{b.name}</Typography>
                        <Chip size="small" label={statusLabel} color={statusColor}
                          sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }} />
                        <IconButton
                          size="small"
                          data-testid={TEST_IDS.booking.editButton(b.id)}
                          aria-label={t('bookings_view.aria_edit')}
                          onClick={() => onEdit(b)}
                          sx={{ color: 'text.disabled', flexShrink: 0, p: 0.25 }}
                        >
                          <EditIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={t('bookings_view.aria_add_gcal')}
                          component="a"
                          href={buildGoogleCalendarEventUrl({
                            title: t('bookings_view.gcal_event_title', { name: b.name }),
                            date: b.bookingDate,
                            startTime: b.bookingTime,
                            endTime: b.bookingTimeEnd,
                            description: `${b.guestCount} ${t('bookings_view.persons_short')} ${b.notes ? `\n${t('bookings_view.notes_label')}: ${b.notes}` : ''}`,
                            location: b.tableNumber ? t('bookings_view.table_number_short', { number: b.tableNumber }) : t('bookings_view.restaurant'),
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'text.disabled', flexShrink: 0, p: 0.25 }}
                        >
                          <EventAvailableIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          data-testid={TEST_IDS.booking.cancelButton(b.id)}
                          aria-label={t('bookings_view.aria_cancel')}
                          onClick={() => onCancel(b.id)}
                          disabled={cancelling === b.id}
                          sx={{ color: 'text.disabled', flexShrink: 0, p: 0.25, '&:hover': { color: 'error.main' } }}
                        >
                          {cancelling === b.id
                            ? <CircularProgress size={14} />
                            : <CancelOutlinedIcon sx={{ fontSize: 17 }} />}
                        </IconButton>
                      </Stack>

                      {/* Czas + goście + stolik */}
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap" useFlexGap>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {b.bookingTime}{b.bookingTimeEnd ? `–${b.bookingTimeEnd}` : ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <PeopleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{b.guestCount} {t('bookings_view.persons_short')}</Typography>
                        </Stack>
                        {b.tableNumber && (
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <TableRestaurantIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">
                              {t('bookings_view.table_number_short', { number: b.tableNumber })}{b.tableName ? ` (${b.tableName})` : ''}
                            </Typography>
                          </Stack>
                        )}
                        {b.source !== 'manual' && (
                          <Chip size="small" label={t(SOURCE_KEYS[b.source]) ?? b.source}
                            sx={{ height: 14, fontSize: '0.58rem', fontWeight: 600 }} />
                        )}
                      </Stack>

                      {/* Kontakt + kto zrobił */}
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap" useFlexGap>
                        {b.guestPhone && (
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <PhoneIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{b.guestPhone}</Typography>
                          </Stack>
                        )}
                        {b.guestEmail && (
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <EmailIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>{b.guestEmail}</Typography>
                          </Stack>
                        )}
                        {b.createdByName && (
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <PersonIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">{b.createdByName}</Typography>
                          </Stack>
                        )}
                      </Stack>

                      {b.notes && (
                        <Typography variant="caption" color="text.disabled"
                          sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                          {b.notes}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

// ─── Mobilny pasek dnia (kompaktowy) ─────────────────────────────────────────

function MobileDayStrip({ selectedDate, bookings, loading, cancelling, onCancel, onAdd, onEdit, isShiftDay = true }: DayPanelProps) {
  const { t } = useTranslation('dashboard');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = bookings
    .filter((b) => b.bookingDate === selectedDateStr)
    .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  return (
    <Box sx={{ borderTopStyle: 'solid', borderTopWidth: UI.borderWidth.hair, borderTopColor: 'divider', bgcolor: 'background.paper' }}>
      {/* Nagłówek — zawsze widoczny */}
      <Stack
        direction="row" alignItems="center" justifyContent="space-between"
        sx={{ px: 2, py: 1.25 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {format(selectedDate, 'd MMMM', { locale: pl })}
          </Typography>
          {!loading && dayBookings.length > 0 && (
            <Chip
              size="small"
              label={`${dayBookings.length} rez.`}
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
            />
          )}
        </Stack>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          data-testid={TEST_IDS.booking.addButton}
          sx={{ height: 30, fontSize: '0.72rem' }}>
          {t('bookings_view.add')}
        </Button>
      </Stack>

      {/* Komunikat o braku zmiany */}
      {!loading && !isShiftDay && (
        <Typography variant="caption" color="text.disabled"
          sx={{ display: 'block', textAlign: 'center', pb: 1.5, px: 2 }}>
          {t('bookings_view.day_off')}
        </Typography>
      )}

      {/* Karty rezerwacji — tylko gdy są i jest zmiana */}
      {!loading && isShiftDay && dayBookings.length > 0 && (
        <>
          <Divider />
          <Stack spacing={1} sx={{ px: 2, pt: 1, pb: 2 }}>
            {dayBookings.map((b) => {
              const statusColor = b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'default';
              return (
                <Paper key={b.id} variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {b.name[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1, fontSize: '0.82rem' }}>{b.name}</Typography>
                        <Chip size="small" label={b.status === 'confirmed' ? 'OK' : b.status === 'pending' ? '…' : '✕'}
                          color={statusColor} sx={{ height: 14, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }} />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <AccessTimeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {b.bookingTime}{b.bookingTimeEnd ? `–${b.bookingTimeEnd}` : ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <PeopleIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{b.guestCount} {t('bookings_view.persons_short')}</Typography>
                        </Stack>
                        {b.tableNumber && (
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <TableRestaurantIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{t('bookings_view.table_number_short', { number: b.tableNumber })}</Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                        <IconButton
                          size="small"
                          data-testid={TEST_IDS.booking.editButton(b.id)}
                          aria-label={t('bookings_view.aria_edit')}
                          onClick={() => onEdit(b)}
                          sx={{ color: 'text.disabled', p: 0.25, flexShrink: 0 }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={t('bookings_view.aria_add_gcal')}
                          component="a"
                          href={buildGoogleCalendarEventUrl({
                            title: t('bookings_view.gcal_event_title', { name: b.name }),
                            date: b.bookingDate,
                            startTime: b.bookingTime,
                            endTime: b.bookingTimeEnd,
                            description: `${b.guestCount} ${t('bookings_view.persons_short')} ${b.notes ? `\n${t('bookings_view.notes_label')}: ${b.notes}` : ''}`,
                            location: b.tableNumber ? t('bookings_view.table_number_short', { number: b.tableNumber }) : t('bookings_view.restaurant'),
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'text.disabled', p: 0.25, flexShrink: 0 }}
                        >
                          <EventAvailableIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          data-testid={TEST_IDS.booking.cancelButton(b.id)}
                          aria-label={t('bookings_view.aria_cancel')}
                          onClick={() => onCancel(b.id)}
                          disabled={cancelling === b.id}
                          sx={{ color: 'text.disabled', p: 0.25, flexShrink: 0, '&:hover': { color: 'error.main' } }}
                        >
                          {cancelling === b.id
                            ? <CircularProgress size={14} />
                            : <CancelOutlinedIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

interface BookingCalendarViewProps {
  /** Jeśli podane — kelner widzi tylko rezerwacje z tych dni (jego zmiany) */
  shiftDates?: string[];
  /** Jeśli podane — automatycznie otwiera dialog edycji wskazanej rezerwacji */
  focusBookingId?: string;
}

export default function BookingCalendarView({ shiftDates, focusBookingId }: BookingCalendarViewProps = {}) {
  const { t } = useTranslation('dashboard');
  const { organization, currentRestaurant } = useOrganization();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [loading, setLoading]           = useState(true);
  const [addOpen, setAddOpen]           = useState(false);
  const [editBooking, setEditBooking]   = useState<Booking | null>(null);
  const [cancelling, setCancelling]     = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [focusHandled, setFocusHandled] = useState(false);

  // Rezerwacje (ultra-robust for HMR)
  // Reads from global /bookings collection filtered by organizationId + restaurantId
  useEffect(() => {
    if (!currentRestaurant || !organization || typeof window === 'undefined') {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end   = format(endOfMonth(currentMonth),   'yyyy-MM-dd');
    const constraints = [
      where('organizationId', '==', organization.id),
      where('restaurantId', '==', currentRestaurant.id),
      where('bookingDate', '>=', start),
      where('bookingDate', '<=', end),
      orderBy('bookingDate'),
      orderBy('bookingTime'),
    ] as const;

    // Global bookings collection (consumer → staff flow)
    const q = query(collection(db, 'bookings'), ...constraints);

    let unsub: (() => void) | undefined;
    
    const timeoutId = setTimeout(() => {
      try {
        console.log(`📡 [Bookings] Subscribing to global: ${currentRestaurant.id} (${start} to ${end})`);
        unsub = safeOnSnapshot(q, (snap: any) => {
          console.log(`📥 [Bookings] Received ${snap.size} docs`);
          setBookings(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Booking));
          setLoading(false);
        }, (err) => {
          console.error('❌ [Bookings] Snapshot error:', err);
          setLoading(false);
        });
      } catch (err) { 
        console.error('❌ [Bookings] Subscription failed:', err);
        setLoading(false); 
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      if (unsub) {
        console.log(`🔌 [Bookings] Unsubscribing from global: ${currentRestaurant.id}`);
        unsub();
      }
    };
  }, [currentMonth, currentRestaurant, organization]);

  useEffect(() => {
    if (!focusBookingId || focusHandled) return;
    if (loading) return;
    const found = bookings.find((b) => b.id === focusBookingId);
    if (!found) return;
    try {
      const d = parseISO(found.bookingDate);
      if (!Number.isNaN(d.getTime())) {
        setSelectedDate(d);
        setCurrentMonth(d);
      }
    } catch {
      // ignore
    }
    setEditBooking(found);
    setFocusHandled(true);
  }, [focusBookingId, focusHandled, loading, bookings]);

  const daysInMonth = useMemo(() =>
    eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
  [currentMonth]);

  const startOffset = (getDay(startOfMonth(currentMonth)) + 6) % 7;
  const numWeeks = Math.ceil((startOffset + daysInMonth.length) / 7);

  const hasShift = (day: Date) =>
    !shiftDates || shiftDates.includes(format(day, 'yyyy-MM-dd'));

  const countForDay = (day: Date) =>
    hasShift(day) ? bookings.filter((b) => isSameDay(parseISO(b.bookingDate), day)).length : 0;

  // Statystyki miesiąca: ile się już odbyło (data < dziś LUB czas minął dziś) vs łącznie
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const nowTime  = format(new Date(), 'HH:mm');
  const monthTotal = bookings.length;
  const monthPast  = bookings.filter((b) =>
    b.bookingDate < todayStr ||
    (b.bookingDate === todayStr && b.bookingTime <= nowTime),
  ).length;

  const handleCancelRequest = (id: string) => {
    const booking = bookings.find((b) => b.id === id) ?? null;
    setCancelTarget(booking);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(cancelTarget.id);
    try {
      await updateDoc(
        doc(db, 'bookings', cancelTarget.id),
        { status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp() },
      );
    } finally {
      setCancelling(null);
      setCancelTarget(null);
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // ── Siatka kalendarza ───────────────────────────────────────────────────────
  const calendarGrid = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Nawigacja miesiąca */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.25,
        bgcolor: 'background.paper',
        borderBottomStyle: 'solid', borderBottomWidth: UI.borderWidth.hair, borderBottomColor: 'divider',
        flexShrink: 0,
      }}>
        <IconButton size="small" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={800} color="text.primary"
          sx={{ textTransform: 'capitalize', letterSpacing: 0.2 }}>
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </Typography>
        <IconButton size="small" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Nagłówki dni tygodnia */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        px: 1, pt: 1, pb: 0.25, flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        {t('bookings_view.weekdays').split(',').map((d: string, i: number) => (
          <Typography key={d} variant="caption" textAlign="center" fontWeight={700}
            sx={{ fontSize: '0.68rem', pb: 0.5, color: i >= 5 ? 'error.main' : 'text.secondary' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Siatka dni */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 1, pb: 1, bgcolor: 'background.default', overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${numWeeks}, 1fr)`, gap: 0.5, flex: 1 }}>
          {Array.from({ length: startOffset }).map((_, i) => (
            <Box key={`e-${i}`} />
          ))}
          {daysInMonth.map((day) => {
            const cnt     = countForDay(day);
            const sel     = isSameDay(day, selectedDate);
            const tod     = isToday(day);
            const weekend = getDay(day) === 0 || getDay(day) === 6;
            const onShift = hasShift(day);
            return (
              <Box
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                sx={{
                  borderRadius: 2,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-start',
                  pt: 0.75, pb: 0.5, px: 0.25,
                  cursor: 'pointer',
                  opacity: onShift ? 1 : 0.35,
                  bgcolor: sel ? 'primary.main' : (occupancyBg(cnt) ?? 'background.paper'),
                  borderStyle: 'solid',
                  borderWidth: UI.borderWidth.thin,
                  borderColor: sel ? 'primary.main' : tod ? 'primary.light' : (onShift && shiftDates ? 'success.light' : 'transparent'),
                  transition: 'all 0.12s',
                  '&:hover': { bgcolor: sel ? 'primary.dark' : 'action.hover' },
                  userSelect: 'none', gap: 0.25,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={tod || sel ? 800 : 500}
                  sx={{
                    fontSize: { xs: '0.78rem', sm: '0.82rem' }, lineHeight: 1,
                    color: sel ? 'primary.contrastText' : weekend ? 'error.main' : 'text.primary',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                {cnt > 0 && (
                  <Box
                    sx={{
                      minWidth: 16, height: 16, borderRadius: 1,
                      px: 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: sel ? 'rgba(255,255,255,0.22)' : occupancyDot(cnt),
                      mt: 0.25,
                    }}
                  >
                    <Typography sx={{
                      fontSize: '0.6rem', fontWeight: 800, lineHeight: 1,
                      color: sel ? 'primary.contrastText' : '#fff',
                    }}>
                      {cnt}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Statystyki miesiąca */}
      <Box sx={{
        px: 2, py: 1.25, borderTopStyle: 'solid', borderTopWidth: UI.borderWidth.hair, borderTopColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, bgcolor: 'background.paper', gap: 1,
      }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {t('bookings_view.month_stats_label')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {loading ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>…</Typography>
          ) : (
            <>
              <Typography variant="caption" fontWeight={800} color="text.primary"
                sx={{ fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
                {monthPast}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>/</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                {monthTotal}
              </Typography>
              {monthTotal > 0 && (
                <Box sx={{
                  ml: 0.5, px: 0.75, py: 0.1, borderRadius: 1,
                  bgcolor: occupancyDot(Math.round(monthTotal / daysInMonth.length)) + '28',
                }}>
                  <Typography variant="caption" fontWeight={700}
                    sx={{ fontSize: '0.65rem', color: occupancyDot(Math.round(monthTotal / daysInMonth.length)) }}>
                    {t('bookings_view.completed_pct', { pct: Math.round((monthPast / monthTotal) * 100) })}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100%', overflow: { xs: 'auto', md: 'hidden' } }}>

      <Box sx={{
        width: { xs: '100%', md: '55%' }, flexShrink: 0,
        borderRightStyle: { md: 'solid' },
        borderRightWidth: { md: UI.borderWidth.hair },
        borderRightColor: { md: 'divider' },
        display: 'flex', flexDirection: 'column',
        height: { xs: '58vh', sm: '62vh', md: '100%' },
        overflow: 'hidden',
      }}>
        {calendarGrid}
      </Box>

      {isDesktop ? (
        <Box sx={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}>
          <DayPanel
            selectedDate={selectedDate} bookings={bookings} loading={loading}
            cancelling={cancelling} onCancel={handleCancelRequest}
            onAdd={() => setAddOpen(true)}
            onEdit={(b) => setEditBooking(b)}
            isShiftDay={hasShift(selectedDate)}
          />
        </Box>
      ) : (
        <MobileDayStrip
          selectedDate={selectedDate} bookings={bookings} loading={loading}
          cancelling={cancelling} onCancel={handleCancelRequest}
          onAdd={() => setAddOpen(true)}
          onEdit={(b) => setEditBooking(b)}
          isShiftDay={hasShift(selectedDate)}
        />
      )}

      {/* ── Dialog potwierdzenia anulowania ── */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('bookings_view.cancel_confirm')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('bookings_view.cancel_body_prefix')} <strong>{cancelTarget?.name}</strong>{' '}
            ({cancelTarget?.bookingDate} {cancelTarget?.bookingTime}){t('bookings_view.cancel_body_suffix')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>{t('bookings_view.no')}</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm} disabled={!!cancelling}>
            {cancelling ? <CircularProgress size={16} /> : t('bookings_view.confirm_cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <BookingDialog
        open={addOpen || !!editBooking}
        mode={editBooking ? 'edit' : 'add'}
        booking={editBooking}
        defaultDate={selectedDateStr}
        restaurantId={currentRestaurant?.id}
        existingBookings={bookings}
        onClose={() => { setAddOpen(false); setEditBooking(null); }}
      />
    </Box>
  );
}
