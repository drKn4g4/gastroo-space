'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  collection, query, where,
  doc, updateDoc, addDoc, Timestamp,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useAuth } from '../../providers/AuthProvider';
import { useOrganization } from '../../providers/OrganizationProvider';
import { useTranslation } from '@/lib/i18n/client';
import {
  Box, Typography, Button, Stack, Chip, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress,
} from '@mui/material';
import PlayArrowIcon       from '@mui/icons-material/PlayArrow';
import StopIcon            from '@mui/icons-material/Stop';
import PauseIcon           from '@mui/icons-material/Pause';
import PlayCircleIcon      from '@mui/icons-material/PlayCircle';
import BeachAccessIcon     from '@mui/icons-material/BeachAccess';
import SwapHorizIcon       from '@mui/icons-material/SwapHoriz';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PersonIcon          from '@mui/icons-material/Person';
import { format, differenceInMinutes } from 'date-fns';
import type { Shift, BookingSummary, TableStatus } from '@/types/pos';
import TodoList from './TodoList';
import T        from '@/styles/pos.tokens';
import { vmin } from '@/styles/units';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

function computeShiftVarianceLabel(shift: Shift | null, t: TFn): { label: string; severity: 'success' | 'warning' | 'error' } | null {
  if (!shift?.actualStart) return null;

  const startVariance = differenceInMinutes(shift.actualStart, shift.scheduledStart);

  if (shift.status === 'completed' && shift.actualEnd) {
    const endVariance = differenceInMinutes(shift.actualEnd, shift.scheduledEnd);
    const totalVariance = endVariance - startVariance;

    if (Math.abs(totalVariance) <= 5) {
      return { label: t('dashboard.quick_panel.variance_on_time'), severity: 'success' };
    }

    if (totalVariance > 0) {
      return { label: t('dashboard.quick_panel.variance_overtime', { duration: fmtDuration(totalVariance) }), severity: 'warning' };
    }

    return { label: t('dashboard.quick_panel.variance_undertime', { duration: fmtDuration(Math.abs(totalVariance)) }), severity: 'error' };
  }

  if (startVariance > 5) {
    return { label: t('dashboard.quick_panel.variance_late_start', { duration: fmtDuration(startVariance) }), severity: 'warning' };
  }

  if (startVariance < -5) {
    return { label: t('dashboard.quick_panel.variance_early_start', { duration: fmtDuration(Math.abs(startVariance)) }), severity: 'success' };
  }

  return { label: t('dashboard.quick_panel.variance_on_time'), severity: 'success' };
}

function SectionHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: '0.1em', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      {right}
    </Box>
  );
}

interface ShiftBarProps {
  shift: Shift | null;
  onStart: () => void;
  onStop: () => void;
  onBreakToggle: () => void;
  now: Date;
  t: TFn;
}

function ShiftBar({ shift, onStart, onStop, onBreakToggle, now, t }: ShiftBarProps) {
  const isActive    = shift?.status === 'active';
  const isBreak     = shift?.status === 'on_break';
  const isScheduled = shift?.status === 'scheduled';
  const isDone      = shift?.status === 'completed';

  const elapsed   = shift?.actualStart ? differenceInMinutes(now, shift.actualStart) : 0;
  const scheduled = shift ? differenceInMinutes(shift.scheduledEnd, shift.scheduledStart) : 0;
  const progress  = scheduled > 0 ? Math.min(100, (elapsed / scheduled) * 100) : 0;
  const breakElapsed = isBreak && shift?.breaks?.length
    ? differenceInMinutes(now, shift.breaks[shift.breaks.length - 1].start) : 0;
  const varianceLabel = computeShiftVarianceLabel(shift, t);

  const shiftStatusLabel = isActive
    ? t('dashboard.quick_panel.shift_status_active')
    : isBreak
    ? t('dashboard.quick_panel.shift_status_break')
    : isDone
    ? t('dashboard.quick_panel.shift_status_done')
    : t('dashboard.quick_panel.shift_status_scheduled');

  return (
    <Box
      data-section="shift-bar"
      sx={{
        p: 2.5, borderRadius: 3,
        background: (theme: any) =>
          isActive ? (theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg,rgba(74,222,128,.12) 0%,rgba(34,197,94,.05) 100%)'
            : 'linear-gradient(135deg,rgba(22,163,74,.10) 0%,rgba(16,185,129,.04) 100%)')
          : isBreak ? (theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg,rgba(251,191,36,.12) 0%,rgba(245,158,11,.05) 100%)'
            : 'linear-gradient(135deg,rgba(217,119,6,.10) 0%,rgba(245,158,11,.04) 100%)')
          : 'action.hover',
        border: 1,
        borderColor: isActive ? 'success.main' : isBreak ? 'warning.main' : 'divider',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              label={shiftStatusLabel}
              size="small"
              color={isActive ? 'success' : isBreak ? 'warning' : isDone ? 'default' : 'primary'}
              variant="outlined"
              sx={{ fontWeight: 700, height: vmin(20), fontSize: T.captionFont }}
            />
            {shift && (
              <Typography variant="caption" color="text.secondary">
                {format(shift.scheduledStart, 'HH:mm')} – {format(shift.scheduledEnd, 'HH:mm')}
              </Typography>
            )}
          </Box>
          {(isActive || isBreak) ? (
            <Typography sx={{ fontSize: T.dashClockFont, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: isActive ? 'success.main' : 'warning.main' }}>
              {fmtDuration(elapsed)}
              <Typography component="span" sx={{ fontSize: T.captionFont, fontWeight: 500, color: 'text.disabled', ml: 0.75 }}>
                / {fmtDuration(scheduled)}
              </Typography>
            </Typography>
          ) : shift ? (
            <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {fmtDuration(scheduled)} {t('dashboard.quick_panel.shift_planned')}
            </Typography>
          ) : (
            <Typography color="text.disabled">
              {t('dashboard.quick_panel.no_shift_today')}
            </Typography>
          )}
          {isBreak && (
            <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mt: 0.25 }}>
              {t('dashboard.quick_panel.break_duration', { duration: fmtDuration(breakElapsed) })}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.75}>
          {isScheduled && (
            <Button
              variant="contained" color="success" size="small"
              startIcon={<PlayArrowIcon />} onClick={onStart}
              aria-label={t('dashboard.quick_panel.shift_btn_start')}
            >
              {t('dashboard.quick_panel.shift_btn_start')}
            </Button>
          )}
          {isActive && <>
            <Button
              variant="outlined" size="small"
              startIcon={<PauseIcon />} onClick={onBreakToggle}
              aria-label={t('dashboard.quick_panel.shift_btn_break')}
              sx={{ borderColor: 'success.main', color: 'success.main' }}
            >
              {t('dashboard.quick_panel.shift_btn_break')}
            </Button>
            <Button
              variant="contained" color="error" size="small"
              startIcon={<StopIcon />} onClick={onStop}
              aria-label={t('dashboard.quick_panel.shift_btn_end')}
            >
              {t('dashboard.quick_panel.shift_btn_end')}
            </Button>
          </>}
          {isBreak && (
            <Button
              variant="contained" color="warning" size="small"
              startIcon={<PlayCircleIcon />} onClick={onBreakToggle}
              aria-label={t('dashboard.quick_panel.shift_btn_resume')}
            >
              {t('dashboard.quick_panel.shift_btn_resume')}
            </Button>
          )}
        </Stack>
      </Box>
      {(isActive || isBreak || isDone) && (
        <LinearProgress
          variant="determinate" value={progress}
          color={isBreak ? 'warning' : isDone ? 'inherit' : 'success'}
          sx={{ height: vmin(6), borderRadius: 3, bgcolor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        />
      )}
      {varianceLabel && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            display: 'block',
            color:
              varianceLabel.severity === 'error'
                ? 'error.main'
                : varianceLabel.severity === 'warning'
                ? 'warning.main'
                : 'success.main',
          }}
        >
          {varianceLabel.label}
        </Typography>
      )}
    </Box>
  );
}

interface TableStats { free: number; occupied: number; reserved: number; total: number }

function TableOverview({ stats, t }: { stats: TableStats | null; t: TFn }) {
  if (!stats) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size="1.25rem" /></Box>;
  const items = [
    { labelKey: 'dashboard.quick_panel.tables_free',     count: stats.free,     color: '#4ade80' },
    { labelKey: 'dashboard.quick_panel.tables_occupied', count: stats.occupied,  color: '#f87171' },
    { labelKey: 'dashboard.quick_panel.tables_reserved', count: stats.reserved,  color: '#fbbf24' },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {items.map(item => (
        <Box
          key={item.labelKey}
          data-stat={item.labelKey}
          sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: T.statValueFont, color: item.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {item.count}
          </Typography>
          <Typography sx={{ fontSize: T.captionFont, color: 'text.disabled', mt: 0.25 }}>
            {t(item.labelKey)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function UpcomingBookings({ bookings, timeNow, t }: { bookings: BookingSummary[]; timeNow: string; t: TFn }) {
  const upcoming = bookings.filter(b => b.bookingTime >= timeNow).slice(0, 4);
  if (upcoming.length === 0) return (
    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', py: 1.5, textAlign: 'center' }}>
      {t('dashboard.quick_panel.no_upcoming_bookings')}
    </Typography>
  );
  return (
    <Stack spacing={0.75}>
      {upcoming.map(b => (
        <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700, fontSize: T.bookingTimeFont, fontVariantNumeric: 'tabular-nums', minWidth: '5ch', color: 'primary.main' }}>
            {b.bookingTime}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {b.name}
            </Typography>
            {b.notes && (
              <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.1, display: 'block' }}>{b.notes}</Typography>
            )}
          </Box>
          <Chip
            icon={<PersonIcon sx={{ fontSize: `${vmin(11)} !important` }} />}
            label={b.guestCount}
            size="small"
            sx={{ height: vmin(20), fontSize: T.captionFont, fontWeight: 600, bgcolor: 'action.selected' }}
          />
        </Box>
      ))}
    </Stack>
  );
}

interface QuickPanelProps {
  bookings: BookingSummary[];
  bookingsLoading: boolean;
  timeNow: string;
}

export default function QuickPanel({ bookings, bookingsLoading, timeNow }: QuickPanelProps) {
  const { user } = useAuth();
  const { organization, member, currentRestaurant } = useOrganization();

  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang ?? 'pl', 'dashboard');

  const [shift, setShift]           = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [now, setNow]               = useState<Date | null>(null);
  const [today, setToday]           = useState('');
  const [tableStats, setTableStats] = useState<TableStats | null>(null);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [incidentText, setIncidentText]     = useState('');
  const [incidentSending, setIncidentSending] = useState(false);

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setToday(format(d, 'yyyy-MM-dd'));
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user || !currentRestaurant || !today || typeof window === 'undefined') return;
    const orgId = organization?.id || 'demo-org';
    const q = query(
      collection(db, `organizations/${orgId}/restaurants/${currentRestaurant.id}/shifts`),
      where('staffId', '==', user.uid),
      where('date', '==', today),
    );
    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        unsub = safeOnSnapshot(q, (snap: any) => {
          if (!snap.empty) {
            const d = snap.docs[0].data();
            setShift({
              id: snap.docs[0].id, ...d,
              scheduledStart: d.scheduledStart?.toDate?.() ?? new Date(),
              scheduledEnd:   d.scheduledEnd?.toDate?.()   ?? new Date(),
              actualStart:    d.actualStart?.toDate?.()    ?? undefined,
              actualEnd:      d.actualEnd?.toDate?.()      ?? undefined,
              breaks: (d.breaks ?? []).map((b: { start: { toDate: () => Date }; end?: { toDate: () => Date } }) => ({
                start: b.start?.toDate?.() ?? new Date(),
                end:   b.end?.toDate?.()   ?? undefined,
              })),
            } as Shift);
          } else { setShift(null); }
          setShiftLoading(false);
        }, (err) => {
          console.error('❌ [QuickPanel-Shift] Snapshot error:', err);
          setShiftLoading(false);
        });
      } catch (err) {
        console.error('❌ [QuickPanel-Shift] Subscription failed:', err);
        setShiftLoading(false);
      }
    }, 500);

    return () => { clearTimeout(timeoutId); if (unsub) unsub(); };
  }, [user, currentRestaurant, today]);

  useEffect(() => {
    if (!currentRestaurant || typeof window === 'undefined') return;
    let unsub: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      try {
        const orgId = organization?.id || 'demo-org';
        unsub = safeOnSnapshot(
          collection(db, `organizations/${orgId}/restaurants/${currentRestaurant.id}/tables`),
          (snap: any) => {
            const c: Record<TableStatus, number> = { free: 0, occupied: 0, reserved: 0, blocked: 0 };
            snap.docs.forEach((d: any) => { const s = d.data().status as TableStatus; if (s in c) c[s]++; });
            setTableStats({ free: c.free, occupied: c.occupied, reserved: c.reserved, total: snap.size });
          },
          (err) => console.error('❌ [QuickPanel-Tables] Snapshot error:', err)
        );
      } catch (err) { console.error('❌ [QuickPanel-Tables] Subscription failed:', err); }
    }, 600);
    return () => { clearTimeout(timeoutId); if (unsub) unsub(); };
  }, [currentRestaurant]);

  const shiftRef = shift && currentRestaurant && organization
    ? doc(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/shifts`, shift.id)
    : null;

  const handleStart = async () => { if (shiftRef) await updateDoc(shiftRef, { status: 'active', actualStart: Timestamp.now() }); };
  const handleStop  = async () => { if (shiftRef) await updateDoc(shiftRef, { status: 'completed', actualEnd: Timestamp.now() }); };
  const handleBreakToggle = async () => {
    if (!shiftRef || !shift) return;
    if (shift.status === 'active') {
      await updateDoc(shiftRef, { status: 'on_break', breaks: [...(shift.breaks ?? []), { start: Timestamp.now() }] });
    } else {
      const breaks = (shift.breaks ?? []).map((b, i) => i === shift.breaks.length - 1 ? { ...b, end: Timestamp.now() } : b);
      await updateDoc(shiftRef, { status: 'active', breaks });
    }
  };

  const handleIncident = async () => {
    if (!incidentText.trim() || !user || !currentRestaurant) return;
    setIncidentSending(true);
    const orgId = organization?.id || 'demo-org';
    try {
      await addDoc(
        collection(db, `organizations/${orgId}/restaurants/${currentRestaurant.id}/incidents`),
        { reportedBy: user.uid, anonymous: true, description: incidentText.trim(), date: today, status: 'open', organizationId: orgId, createdAt: Timestamp.now() },
      );
      setIncidentText('');
      setIncidentDialog(false);
    } catch (err) {
      console.error('Failed to send incident:', err);
    } finally {
      setIncidentSending(false);
    }
  };

  const upcomingCount = bookings.filter(b => b.bookingTime >= timeNow).length;

  return (
    <Box data-panel="quick-panel" sx={{ p: 2, pb: 6, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      <Box data-section="shift">
        <SectionHeader label={t('dashboard.quick_panel.section_shift')} />
        {shiftLoading
          ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size="1.5rem" /></Box>
          : <ShiftBar shift={shift} now={now ?? new Date()} onStart={handleStart} onStop={handleStop} onBreakToggle={handleBreakToggle} t={t} />
        }
      </Box>

      <Divider />

      <Box data-section="floor">
        <SectionHeader label={t('dashboard.quick_panel.section_floor')}
          right={<Chip icon={<TableRestaurantIcon sx={{ fontSize: `${vmin(12)} !important` }} />}
            label={tableStats ? t('dashboard.quick_panel.tables_count', { count: tableStats.total }) : '…'} size="small" sx={{ height: vmin(20), fontSize: T.captionFont }} />}
        />
        <TableOverview stats={tableStats} t={t} />
      </Box>

      <Divider />

      <Box data-section="upcoming-bookings">
        <SectionHeader label={t('dashboard.quick_panel.section_upcoming')}
          right={<Typography variant="caption" color={upcomingCount > 0 ? 'primary' : 'text.disabled'}>
            {bookingsLoading ? '…' : `${upcomingCount} / ${bookings.length}`}
          </Typography>}
        />
        {bookingsLoading
          ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size="1.25rem" /></Box>
          : <UpcomingBookings bookings={bookings} timeNow={timeNow} t={t} />
        }
      </Box>

      <Divider />

      <Box data-section="actions">
        <SectionHeader label={t('dashboard.quick_panel.section_actions')} />
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<BeachAccessIcon />} fullWidth sx={{ fontSize: T.captionFont }} aria-label={t('dashboard.quick_panel.action_leave')}>{t('dashboard.quick_panel.action_leave')}</Button>
          <Button variant="outlined" size="small" startIcon={<SwapHorizIcon />} fullWidth sx={{ fontSize: T.captionFont }} aria-label={t('dashboard.quick_panel.action_swap')}>{t('dashboard.quick_panel.action_swap')}</Button>
          <Button variant="outlined" size="small" color="warning" startIcon={<WarningAmberIcon />} fullWidth
            onClick={() => setIncidentDialog(true)} sx={{ fontSize: T.captionFont }} aria-label={t('dashboard.quick_panel.action_incident')}>{t('dashboard.quick_panel.action_incident')}</Button>
        </Stack>
      </Box>

      <Divider />

      {currentRestaurant && (
        <Box data-section="tasks">
          <TodoList restaurantId={currentRestaurant.id} role={member?.role ?? ''} />
        </Box>
      )}

      <Dialog open={incidentDialog} onClose={() => setIncidentDialog(false)} maxWidth="xs" fullWidth aria-labelledby="quick-panel-incident-title">
        <DialogTitle id="quick-panel-incident-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          {t('dashboard.quick_panel.incident_title')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard.quick_panel.incident_disclaimer')}
          </Typography>
          <TextField multiline rows={4} fullWidth autoFocus placeholder={t('dashboard.quick_panel.incident_placeholder')}
            value={incidentText} onChange={(e) => setIncidentText(e.target.value)}
            inputProps={{ 'aria-label': t('dashboard.quick_panel.incident_placeholder') }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialog(false)}>{t('common.cancel', { defaultValue: 'Anuluj' })}</Button>
          <Button variant="contained" color="warning" onClick={handleIncident} disabled={!incidentText.trim() || incidentSending} aria-label={t('dashboard.quick_panel.incident_send')}>
            {incidentSending ? <CircularProgress size="1rem" /> : t('dashboard.quick_panel.incident_send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
