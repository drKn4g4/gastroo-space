'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import LoginIcon from '@mui/icons-material/Login';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { differenceInMinutes, subDays } from 'date-fns';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useDriveIntegration } from '@/lib/hooks/useDriveIntegration';
import { useTranslation } from 'react-i18next';

type AuditEntry = {
  id: string;
  action?: string;
  actorUid?: string;
  actorRole?: string;
  targetUid?: string;
  delta?: number;
  restaurantName?: string | null;
  restaurantId?: string | null;
  createdAt?: Date;
};

type GroupBy = 'none' | 'action' | 'day' | 'actor';
type ActionFilter = 'all' | 'favorites.restaurant.added' | 'favorites.restaurant.removed' | 'loyalty.points.granted' | 'loyalty.points.redeemed' | 'auth.organization.accessed';

type ShiftAudit = {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  status: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
};

type ShiftSummary = {
  staffId: string;
  staffName: string;
  shiftCount: number;
  completedCount: number;
  lateStartMinutes: number;
  earlyStartMinutes: number;
  overtimeMinutes: number;
  undertimeMinutes: number;
  missingClockOut: number;
};

type PeriodPreset = '1' | '7' | '30' | '90' | 'custom';

const ALLOWED_ACTIONS = new Set([
  'favorites.restaurant.added',
  'favorites.restaurant.removed',
  'loyalty.points.granted',
  'loyalty.points.redeemed',
  'auth.organization.accessed',
]);

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

function actionMeta(action: string | undefined, t: TFunc) {
  switch (action) {
    case 'favorites.restaurant.added':
      return { label: t('audit.favorites_added'), icon: <FavoriteIcon fontSize="small" color="error" />, color: 'error' as const };
    case 'favorites.restaurant.removed':
      return { label: t('audit.favorites_removed'), icon: <FavoriteIcon fontSize="small" />, color: 'default' as const };
    case 'loyalty.points.granted':
      return { label: t('audit.loyalty_granted'), icon: <StarIcon fontSize="small" color="warning" />, color: 'success' as const };
    case 'loyalty.points.redeemed':
      return { label: t('audit.loyalty_redeemed'), icon: <StarIcon fontSize="small" color="warning" />, color: 'warning' as const };
    case 'auth.organization.accessed':
      return { label: t('audit.org_accessed'), icon: <LoginIcon fontSize="small" color="primary" />, color: 'primary' as const };
    default:
      return { label: action ?? t('audit.event'), icon: <AccessTimeIcon fontSize="small" />, color: 'default' as const };
  }
}

function renderDetails(entry: AuditEntry, t: TFunc): string {
  if (entry.action?.startsWith('favorites.restaurant.')) {
    const venue = entry.restaurantName || entry.restaurantId || t('audit.venue_fallback');
    return t('audit.favorites_detail', { actor: entry.actorUid ?? 'unknown', venue });
  }

  if (entry.action?.startsWith('loyalty.points.')) {
    return t('audit.entry_summary', { actor: entry.actorUid ?? 'unknown', target: entry.targetUid ?? 'unknown', delta: entry.delta ?? 0 });
  }

  if (entry.action === 'auth.organization.accessed') {
    return t('audit.accessed_detail', { actor: entry.actorUid ?? 'unknown', role: entry.actorRole ?? 'unknown' });
  }

  return t('audit.details_unavailable');
}

function toCsvValue(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export default function OwnerAuditLogsView() {
  const { t } = useTranslation('dashboard');
  const { organization, currentRestaurant } = useOrganization();
  const drive = useDriveIntegration();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftAudit[]>([]);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('7');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<GroupBy>('action');
  const [exportMessage, setExportMessage] = useState<string>('');
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportingSchedule, setExportingSchedule] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    if (!organization) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const logsQuery = query(
          collection(db, `organizations/${organization.id}/logs`),
          orderBy('createdAt', 'desc'),
          limit(100),
        );
        const snap = await getDocs(logsQuery);
        if (cancelled) return;

        const mapped = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              action: typeof data.action === 'string' ? data.action : undefined,
              actorUid: typeof data.actorUid === 'string' ? data.actorUid : undefined,
              actorRole: typeof data.actorRole === 'string' ? data.actorRole : undefined,
              targetUid: typeof data.targetUid === 'string' ? data.targetUid : undefined,
              delta: typeof data.delta === 'number' ? data.delta : undefined,
              restaurantName: typeof data.restaurantName === 'string' ? data.restaurantName : null,
              restaurantId: typeof data.restaurantId === 'string' ? data.restaurantId : null,
              createdAt: data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === 'function'
                ? (data.createdAt as { toDate: () => Date }).toDate()
                : undefined,
            } as AuditEntry;
          })
          .filter((entry) => ALLOWED_ACTIONS.has(entry.action ?? ''));

        setEntries(mapped);
      } catch {
        if (!cancelled) {
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  useEffect(() => {
    if (!organization || !currentRestaurant) {
      setShifts([]);
      setShiftLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setShiftLoading(true);
      try {
        const snap = await getDocs(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/shifts`),
        );
        if (cancelled) return;
        const mapped = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const scheduledStart = data.scheduledStart && typeof (data.scheduledStart as { toDate?: () => Date }).toDate === 'function'
            ? (data.scheduledStart as { toDate: () => Date }).toDate()
            : undefined;
          const scheduledEnd = data.scheduledEnd && typeof (data.scheduledEnd as { toDate?: () => Date }).toDate === 'function'
            ? (data.scheduledEnd as { toDate: () => Date }).toDate()
            : undefined;
          const actualStart = data.actualStart && typeof (data.actualStart as { toDate?: () => Date }).toDate === 'function'
            ? (data.actualStart as { toDate: () => Date }).toDate()
            : undefined;
          const actualEnd = data.actualEnd && typeof (data.actualEnd as { toDate?: () => Date }).toDate === 'function'
            ? (data.actualEnd as { toDate: () => Date }).toDate()
            : undefined;

          return {
            id: d.id,
            staffId: typeof data.staffId === 'string' ? data.staffId : 'unknown',
            staffName: typeof data.staffName === 'string' ? data.staffName : t('audit.unknown_staff'),
            date: typeof data.date === 'string' ? data.date : '',
            status: typeof data.status === 'string' ? data.status : 'scheduled',
            scheduledStart,
            scheduledEnd,
            actualStart,
            actualEnd,
          } as ShiftAudit;
        });
        setShifts(mapped);
      } catch {
        if (!cancelled) {
          setShifts([]);
        }
      } finally {
        if (!cancelled) {
          setShiftLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [organization, currentRestaurant, t]);

  const periodRange = useMemo(() => {
    if (periodPreset === 'custom') {
      const fallbackFrom = subDays(new Date(), 7);
      const fromRaw = customFromDate ? new Date(`${customFromDate}T00:00:00`) : fallbackFrom;
      const toRaw = customToDate ? new Date(`${customToDate}T23:59:59.999`) : new Date();
      const from = Number.isNaN(fromRaw.getTime()) ? fallbackFrom : fromRaw;
      const to = Number.isNaN(toRaw.getTime()) ? new Date() : toRaw;
      return from <= to ? { from, to } : { from: to, to: from };
    }

    const days = Number(periodPreset);
    return {
      from: subDays(new Date(), days),
      to: new Date(),
    };
  }, [periodPreset, customFromDate, customToDate]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => (actionFilter === 'all' ? true : entry.action === actionFilter))
      .filter((entry) => (entry.createdAt ? entry.createdAt >= periodRange.from && entry.createdAt <= periodRange.to : false));
  }, [entries, actionFilter, periodRange]);

  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: t('audit.all_events'), items: filteredEntries }];
    }

    const map = new Map<string, AuditEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = groupBy === 'action'
        ? (entry.action ?? 'inne')
        : groupBy === 'day'
          ? (entry.createdAt ? entry.createdAt.toISOString().slice(0, 10) : 'no-date')
          : (entry.actorUid ?? 'unknown');
      map.set(key, [...(map.get(key) ?? []), entry]);
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: groupBy === 'action'
        ? actionMeta(key, t).label
        : groupBy === 'day'
          ? (key === 'no-date' ? t('audit.no_date') : new Date(`${key}T00:00:00`).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
          : t('audit.by_user_label', { uid: key }),
      items,
    }));
  }, [filteredEntries, groupBy, t]);

  const scheduleSummary = useMemo<ShiftSummary[]>(() => {
    const recent = shifts.filter((entry) => {
      const dateRef = entry.scheduledStart ?? (entry.date ? new Date(`${entry.date}T00:00:00`) : undefined);
      return dateRef ? dateRef >= periodRange.from && dateRef <= periodRange.to : false;
    });

    const byStaff = new Map<string, ShiftSummary>();

    recent.forEach((entry) => {
      const key = entry.staffId;
      const summary = byStaff.get(key) ?? {
        staffId: entry.staffId,
        staffName: entry.staffName || t('audit.unknown_staff'),
        shiftCount: 0,
        completedCount: 0,
        lateStartMinutes: 0,
        earlyStartMinutes: 0,
        overtimeMinutes: 0,
        undertimeMinutes: 0,
        missingClockOut: 0,
      };

      summary.shiftCount += 1;
      if (entry.status === 'completed') summary.completedCount += 1;

      if (entry.scheduledStart && entry.actualStart) {
        const startDelta = differenceInMinutes(entry.actualStart, entry.scheduledStart);
        if (startDelta > 0) summary.lateStartMinutes += startDelta;
        if (startDelta < 0) summary.earlyStartMinutes += Math.abs(startDelta);
      }

      if (entry.scheduledStart && entry.scheduledEnd && entry.actualStart && entry.actualEnd) {
        const planned = Math.max(0, differenceInMinutes(entry.scheduledEnd, entry.scheduledStart));
        const actual = Math.max(0, differenceInMinutes(entry.actualEnd, entry.actualStart));
        const delta = actual - planned;
        if (delta > 0) summary.overtimeMinutes += delta;
        if (delta < 0) summary.undertimeMinutes += Math.abs(delta);
      }

      if (entry.actualStart && !entry.actualEnd) {
        summary.missingClockOut += 1;
      }

      byStaff.set(key, summary);
    });

    return Array.from(byStaff.values()).sort((a, b) => b.overtimeMinutes - a.overtimeMinutes || b.lateStartMinutes - a.lateStartMinutes);
  }, [shifts, periodRange, t]);

  const logsCsv = useMemo(() => {
    const header = ['createdAt', 'action', 'actorUid', 'actorRole', 'targetUid', 'delta', 'restaurantId', 'restaurantName'];
    const rows = filteredEntries.map((entry) => [
      entry.createdAt ? entry.createdAt.toISOString() : '',
      entry.action ?? '',
      entry.actorUid ?? '',
      entry.actorRole ?? '',
      entry.targetUid ?? '',
      entry.delta ?? '',
      entry.restaurantId ?? '',
      entry.restaurantName ?? '',
    ]);
    return [header, ...rows].map((line) => line.map((value) => toCsvValue(value as string | number | null | undefined)).join(',')).join('\n');
  }, [filteredEntries]);

  const scheduleCsv = useMemo(() => {
    const header = ['staffId', 'staffName', 'shiftCount', 'completedCount', 'lateStartMinutes', 'earlyStartMinutes', 'overtimeMinutes', 'undertimeMinutes', 'missingClockOut'];
    const rows = scheduleSummary.map((entry) => [
      entry.staffId,
      entry.staffName,
      entry.shiftCount,
      entry.completedCount,
      entry.lateStartMinutes,
      entry.earlyStartMinutes,
      entry.overtimeMinutes,
      entry.undertimeMinutes,
      entry.missingClockOut,
    ]);
    return [header, ...rows].map((line) => line.map((value) => toCsvValue(value as string | number | null | undefined)).join(',')).join('\n');
  }, [scheduleSummary]);

  const ensureDriveConnected = async () => {
    if (drive.status.connected || !organization) return true;
    await drive.connect({ orgId: organization.id });
    return true;
  };

  const handleExportLogs = async () => {
    if (!organization || !filteredEntries.length) return;
    setExportingLogs(true);
    setExportMessage('');
    try {
      await ensureDriveConnected();
      const result = await drive.uploadReportCsv({
        orgId: organization.id,
        reportType: 'owner-logs',
        fileName: `owner-logs-${organization.id}-${new Date().toISOString().slice(0, 10)}`,
        csvContent: logsCsv,
      });
      setExportMessage(t('audit.export_logs_success', { path: result.folderPath }));
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : t('audit.export_logs_error'));
    } finally {
      setExportingLogs(false);
    }
  };

  const handleExportSchedule = async () => {
    if (!organization || !scheduleSummary.length) return;
    setExportingSchedule(true);
    setExportMessage('');
    try {
      await ensureDriveConnected();
      const result = await drive.uploadReportCsv({
        orgId: organization.id,
        reportType: 'schedule',
        fileName: `schedule-variance-${organization.id}-${new Date().toISOString().slice(0, 10)}`,
        csvContent: scheduleCsv,
      });
      setExportMessage(t('audit.export_schedule_success', { path: result.folderPath }));
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : t('audit.export_schedule_error'));
    } finally {
      setExportingSchedule(false);
    }
  };

  const handleExportAll = async () => {
    if (!organization || (!filteredEntries.length && !scheduleSummary.length)) return;

    setExportingAll(true);
    setExportMessage('');

    try {
      await ensureDriveConnected();
      const outcomes: string[] = [];

      if (filteredEntries.length) {
        const logsResult = await drive.uploadReportCsv({
          orgId: organization.id,
          reportType: 'owner-logs',
          fileName: `owner-logs-${organization.id}-${new Date().toISOString().slice(0, 10)}`,
          csvContent: logsCsv,
        });
        outcomes.push(`logi (${logsResult.folderPath})`);
      }

      if (scheduleSummary.length) {
        const scheduleResult = await drive.uploadReportCsv({
          orgId: organization.id,
          reportType: 'schedule',
          fileName: `schedule-variance-${organization.id}-${new Date().toISOString().slice(0, 10)}`,
          csvContent: scheduleCsv,
        });
        outcomes.push(`grafik (${scheduleResult.folderPath})`);
      }

      setExportMessage(t('audit.export_all_success', { outcomes: outcomes.join(', ') }));
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : t('audit.export_all_error'));
    } finally {
      setExportingAll(false);
    }
  };

  if (loading || shiftLoading) {
    return (
      <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: '12rem' }}>
          <InputLabel id="owner-logs-action-label">{t('audit.log_type_label')}</InputLabel>
          <Select
            labelId="owner-logs-action-label"
            label={t('audit.log_type_label')}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
          >
            <MenuItem value="all">{t('audit.all_logs')}</MenuItem>
            <MenuItem value="favorites.restaurant.added">{t('audit.favorites_added')}</MenuItem>
            <MenuItem value="favorites.restaurant.removed">{t('audit.favorites_removed')}</MenuItem>
            <MenuItem value="loyalty.points.granted">{t('audit.loyalty_granted')}</MenuItem>
            <MenuItem value="loyalty.points.redeemed">{t('audit.loyalty_redeemed')}</MenuItem>
            <MenuItem value="auth.organization.accessed">{t('audit.org_accessed')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: '9rem' }}>
          <InputLabel id="owner-logs-period-label">{t('audit.period_label')}</InputLabel>
          <Select
            labelId="owner-logs-period-label"
            label={t('audit.period_label')}
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
          >
            <MenuItem value="1">24h</MenuItem>
            <MenuItem value="7">7 dni</MenuItem>
            <MenuItem value="30">30 dni</MenuItem>
            <MenuItem value="90">90 dni</MenuItem>
            <MenuItem value="custom">{t('audit.custom_range')}</MenuItem>
          </Select>
        </FormControl>

        {periodPreset === 'custom' && (
          <>
            <TextField
              size="small"
              label={t('schedule.from')}
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: '11rem' }}
            />
            <TextField
              size="small"
              label={t('schedule.to')}
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: '11rem' }}
            />
          </>
        )}

        <FormControl size="small" sx={{ minWidth: '10rem' }}>
          <InputLabel id="owner-logs-group-label">{t('audit.group_label')}</InputLabel>
          <Select
            labelId="owner-logs-group-label"
            label={t('audit.group_label')}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <MenuItem value="none">{t('audit.group_none')}</MenuItem>
            <MenuItem value="action">{t('audit.group_action')}</MenuItem>
            <MenuItem value="day">{t('audit.group_day')}</MenuItem>
            <MenuItem value="actor">{t('audit.group_actor')}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          startIcon={exportingAll ? <CircularProgress size={14} /> : <CloudUploadIcon />}
          onClick={() => { void handleExportAll(); }}
          disabled={exportingAll || (!filteredEntries.length && !scheduleSummary.length) || !organization}
        >
          {t('audit.export_all_btn')}
        </Button>

        <Button
          variant="outlined"
          startIcon={exportingLogs ? <CircularProgress size={14} /> : <CloudUploadIcon />}
          onClick={() => { void handleExportLogs(); }}
          disabled={exportingLogs || !filteredEntries.length || !organization}
        >
          {t('audit.export_logs_btn')}
        </Button>

        <Button
          variant="outlined"
          startIcon={exportingSchedule ? <CircularProgress size={14} /> : <CloudUploadIcon />}
          onClick={() => { void handleExportSchedule(); }}
          disabled={exportingSchedule || !scheduleSummary.length || !organization}
        >
          {t('audit.export_schedule_btn')}
        </Button>
      </Stack>

      {exportMessage && <Alert severity="info">{exportMessage}</Alert>}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Chip size="small" label={t('audit.visible_logs', { count: filteredEntries.length })} color="primary" variant="outlined" />
        <Chip size="small" label={drive.status.connected ? t('audit.drive_connected_yes') : t('audit.drive_connected_no')} color={drive.status.connected ? 'success' : 'warning'} variant="outlined" />
        {currentRestaurant && <Chip size="small" label={t('audit.venue_label', { name: currentRestaurant.name })} variant="outlined" />}
      </Stack>

      {!filteredEntries.length ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">{t('audit.no_logs')}</Typography>
        </Box>
      ) : (
        groupedEntries.map((group) => (
          <Stack key={group.key} spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
              {group.label} ({group.items.length})
            </Typography>
            {group.items.map((entry) => {
              const meta = actionMeta(entry.action, t);
              return (
                <Card key={entry.id} variant="outlined">
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      {meta.icon}
                      <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        {entry.createdAt ? entry.createdAt.toLocaleString('pl-PL') : 'brak daty'}
                      </Typography>
                    </Stack>
                    <Divider sx={{ mb: 0.75 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {renderDetails(entry, t)}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        ))
      )}

      <Divider />

      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
        {t('audit.schedule_title')}
      </Typography>

      {!scheduleSummary.length ? (
        <Typography variant="body2" color="text.secondary">
          {t('audit.no_shift_data')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {scheduleSummary.map((row) => (
            <Card key={row.staffId} variant="outlined">
              <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {row.staffName}
                  </Typography>
                  <Chip size="small" label={t('audit.shifts_label', { count: row.shiftCount })} variant="outlined" />
                  <Chip size="small" label={t('audit.completed_label', { count: row.completedCount })} color="success" variant="outlined" />
                  <Chip size="small" label={t('audit.late_label', { minutes: row.lateStartMinutes })} color={row.lateStartMinutes > 0 ? 'warning' : 'default'} variant="outlined" />
                  <Chip size="small" label={t('audit.overtime_label', { minutes: row.overtimeMinutes })} color={row.overtimeMinutes > 0 ? 'warning' : 'default'} variant="outlined" />
                  <Chip size="small" label={t('audit.undertime_label', { minutes: row.undertimeMinutes })} color={row.undertimeMinutes > 0 ? 'error' : 'default'} variant="outlined" />
                  {row.missingClockOut > 0 && <Chip size="small" label={t('audit.missing_clockout_label', { count: row.missingClockOut })} color="error" />}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
