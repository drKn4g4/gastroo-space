'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { addDoc, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Stack, Chip, Card, CardContent,
  TextField, Button, CircularProgress, Alert,
} from '@mui/material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { vh } from '@/styles/units';
import { db, safeOnSnapshot } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useNotification } from '@/app/[lang]/components/Notification';
import { buildGoogleCalendarEventUrl } from '@/lib/googleCalendar';
import { useTranslation } from '@/lib/i18n/client';
import { useParams, useRouter } from 'next/navigation';

// UWAGA: Jeśli RequireOrganization lub PermissionGate importują coś, co łączy się z Firebase,
// na moment testów możesz je zakomentować i wyrenderować samą <ScheduleTable />.
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import PageContainer from '@/app/[lang]/components/PageContainer';

const SECTIONS = [
  {
    name: 'SALA',
    staff: [
      { id: '1', name: 'Anna Kowalska', role: 'Kelner', color: '#2e7d32' },
      { id: '3', name: 'Zofia Polak', role: 'Kelner', color: '#2e7d32' }
    ]
  },
  {
    name: 'KUCHNIA',
    staff: [
      { id: '2', name: 'Marek Wójcik', role: 'Kucharz', color: '#ed6c02' }
    ]
  }
];

// Statyczne dane - zero połączeń z DB
const MOCK_SHIFTS: Record<string, string> = {
  "1-2026-03-01": "08:00-16:00",
  "1-2026-03-02": "08:00-16:00",
  "2-2026-03-01": "10:00-22:00",
  "3-2026-03-02": "14:00-22:00",
};

interface AvailabilityRequest {
  id: string;
  userId: string;
  fromDate: string;
  toDate: string;
  preferredStart?: string;
  preferredEnd?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
}

function AvailabilityPanel({ t }: { t: (key: string) => string }) {
  const { organization, currentRestaurant, member } = useOrganization();
  const { showNotification } = useNotification();
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preferredStart, setPreferredStart] = useState('');
  const [preferredEnd, setPreferredEnd] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AvailabilityRequest[]>([]);

  const orgId = organization?.id;
  const restId = currentRestaurant?.id;
  const userId = member?.userId;
  const isOwner = member?.role === 'owner';

  useEffect(() => {
    if (!orgId || !restId || !userId || isOwner) {
      setItems([]);
      return;
    }

    const reqPath = `organizations/${orgId}/restaurants/${restId}/availabilityRequests`;
    const q = query(
      collection(db, reqPath),
      where('userId', '==', userId),
      orderBy('fromDate', 'desc'),
    );

    return safeOnSnapshot(q, (snap: any) => {
      const parsed = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as AvailabilityRequest[];
      setItems(parsed);
    });
  }, [orgId, restId, userId, isOwner]);

  if (isOwner) return null;

  const handleSubmit = async () => {
    if (!orgId || !restId || !userId || !fromDate || !toDate) return;
    setSaving(true);
    try {
      const reqPath = `organizations/${orgId}/restaurants/${restId}/availabilityRequests`;
      await addDoc(collection(db, reqPath), {
        userId,
        fromDate,
        toDate,
        preferredStart: preferredStart || null,
        preferredEnd: preferredEnd || null,
        note: note.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFromDate('');
      setToDate('');
      setPreferredStart('');
      setPreferredEnd('');
      setNote('');
      showNotification(t('dashboard.schedule.submitted_success'), 'success');
    } catch {
      showNotification(t('dashboard.schedule.submit_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>{t('dashboard.schedule.availability_title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.schedule.availability_desc')}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label={t('dashboard.schedule.from')}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('dashboard.schedule.to')}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('dashboard.schedule.time_from')}
              type="time"
              value={preferredStart}
              onChange={(e) => setPreferredStart(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('dashboard.schedule.time_to')}
              type="time"
              value={preferredEnd}
              onChange={(e) => setPreferredEnd(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <TextField
            label={t('dashboard.schedule.notes')}
            multiline
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('dashboard.schedule.notes_placeholder')}
          />

          <Box>
            <Button variant="contained" onClick={handleSubmit} disabled={saving || !fromDate || !toDate}>
              {saving ? <CircularProgress size={18} /> : t('dashboard.schedule.submit')}
            </Button>
          </Box>

          {items.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>{t('dashboard.schedule.your_requests')}</Typography>
              {items.map((item) => (
                <Alert
                  key={item.id}
                  severity={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'info'}
                  onClick={() => {
                    if (!orgId || !restId) return;
                    const segs = [
                      'organizations', orgId,
                      'restaurants', restId,
                      'availabilityRequests', item.id,
                    ].map((s) => encodeURIComponent(s));
                    router.push(`/${lang}/dashboard/doc/${segs.join('/')}`);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  {item.fromDate} → {item.toDate}
                  {item.preferredStart && item.preferredEnd ? `, ${item.preferredStart}-${item.preferredEnd}` : ''}
                  {item.note ? `, ${item.note}` : ''}
                </Alert>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ScheduleTable({ t }: { t: (key: string, opts?: Record<string, string>) => string }) {
  const [month] = useState(() => new Date());

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayNames = t('dashboard.schedule.day_names').split(',');

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: `calc(100vh - ${vh(220)})` }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>{t('dashboard.schedule.team_column')}</TableCell>
              {days.map((d) => (
                <TableCell key={d.toISOString()} align="center" sx={{ fontWeight: 800, minWidth: 44 }}>
                  <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1 }}>
                    {format(d, 'd')}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.1 }}>
                    {dayNames[getDay(d)]}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {SECTIONS.map((section) => (
              <React.Fragment key={section.name}>
                <TableRow>
                  <TableCell colSpan={days.length + 1} sx={{ bgcolor: 'action.hover', fontWeight: 900 }}>
                    {section.name}
                  </TableCell>
                </TableRow>
                {section.staff.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, bgcolor: s.color, fontSize: 12 }}>
                          {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{s.name}</Typography>
                          <Chip label={s.role} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, mt: 0.5 }} />
                        </Box>
                      </Stack>
                    </TableCell>
                    {days.map((d) => {
                      const key = `${s.id}-${format(d, 'yyyy-MM-dd')}`;
                      const shift = MOCK_SHIFTS[key];
                      return (
                        <TableCell key={key} align="center">
                          {shift ? (
                            <Chip
                              component="a"
                              clickable
                              href={buildGoogleCalendarEventUrl({
                                title: t('dashboard.schedule.shift_title', { name: s.name }),
                                date: format(d, 'yyyy-MM-dd'),
                                startTime: shift.split('-')[0],
                                endTime: shift.split('-')[1],
                                description: t('dashboard.schedule.shift_description', { role: s.role }),
                                location: 'gastroo.space',
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              label={`${shift} ↗`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: `${s.color}22`,
                                color: s.color,
                                fontWeight: 800,
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" color="text.disabled">
          {t('dashboard.schedule.demo_notice')}
        </Typography>
      </Box>
    </Paper>
  );
}

function SchedulePageContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <Stack spacing={2}>
      <ScheduleTable t={t} />
      <AvailabilityPanel t={t} />
    </Stack>
  );
}

export default function SchedulePage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

  return (
    <RequireOrganization>
      <PermissionGate permission={PERMISSIONS.SCHEDULE_VIEW} fallback={
        <PageContainer sx={{ textAlign: 'center' }}>
          <Typography color="text.secondary">{t('dashboard.schedule.no_access')}</Typography>
        </PageContainer>
      }>
        <SchedulePageContent />
      </PermissionGate>
    </RequireOrganization>
  );
}
