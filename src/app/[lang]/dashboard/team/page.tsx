'use client';

import { useTranslation } from '@/lib/i18n/client';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Avatar, Chip, Select, MenuItem,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Alert, Tooltip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useNotification } from '@/app/[lang]/components/Notification';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { PERMISSIONS, ROLE_PERMISSIONS, MemberRole, Member } from '@/types/organization';
import { vh, vmin } from '@/styles/units';

// ─── Stałe ────────────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES: MemberRole[] = ['manager', 'waiter', 'chef', 'staff', 'supervisor', 'bartender', 'sommelier', 'kitchen', 'cashier', 'delivery'];

const ROLE_COLORS: Record<MemberRole, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  owner:      'error',
  admin:      'primary',
  manager:    'secondary',
  waiter:     'success',
  chef:       'warning',
  staff:      'default',
  supervisor: 'secondary',
  bartender:  'success',
  sommelier:  'success',
  kitchen:    'warning',
  cashier:    'primary',
  delivery:   'default',
};

// Pogrupowane wiersze matrycy — 5 kompaktowych obszarów
function getFeatureGroups(t: (key: string) => string): { group: string; rows: { label: string; permission: string | null }[] }[] {
  return [
    {
      group: t('team.group_floor'),
      rows: [
        { label: t('team.perm_dashboard'),              permission: null },
        { label: t('team.perm_bookings_view'),          permission: PERMISSIONS.BOOKINGS_VIEW },
        { label: t('team.perm_bookings_create'),        permission: PERMISSIONS.BOOKINGS_CREATE },
        { label: t('team.perm_bookings_update'),        permission: PERMISSIONS.BOOKINGS_UPDATE },
        { label: t('team.perm_bookings_export'),        permission: PERMISSIONS.BOOKINGS_EXPORT },
        { label: t('team.perm_tables_view'),            permission: PERMISSIONS.TABLES_VIEW },
        { label: t('team.perm_tables_status'),          permission: PERMISSIONS.TABLES_STATUS },
        { label: t('team.perm_tables_manage'),          permission: PERMISSIONS.TABLES_MANAGE },
        { label: t('team.perm_orders_view'),            permission: PERMISSIONS.ORDERS_VIEW },
        { label: t('team.perm_orders_create'),          permission: PERMISSIONS.ORDERS_CREATE },
        { label: t('team.perm_orders_close'),           permission: PERMISSIONS.ORDERS_CLOSE },
        { label: t('team.perm_orders_void'),            permission: PERMISSIONS.ORDERS_VOID },
      ],
    },
    {
      group: t('team.group_kitchen'),
      rows: [
        { label: t('team.perm_menu_view'),              permission: PERMISSIONS.MENU_VIEW },
        { label: t('team.perm_menu_manage'),            permission: PERMISSIONS.MENU_MANAGE },
        { label: t('team.perm_allergens_manage'),       permission: PERMISSIONS.ALLERGENS_MANAGE },
        { label: t('team.perm_kitchen_view'),           permission: PERMISSIONS.KITCHEN_VIEW },
        { label: t('team.perm_kitchen_manage'),         permission: PERMISSIONS.KITCHEN_MANAGE },
        { label: t('team.perm_inventory_view'),         permission: PERMISSIONS.INVENTORY_VIEW },
        { label: t('team.perm_inventory_manage'),       permission: PERMISSIONS.INVENTORY_MANAGE },
        { label: t('team.perm_suppliers_view'),         permission: PERMISSIONS.SUPPLIERS_VIEW },
        { label: t('team.perm_suppliers_manage'),       permission: PERMISSIONS.SUPPLIERS_MANAGE },
      ],
    },
    {
      group: t('team.group_finances'),
      rows: [
        { label: t('team.perm_payments_process'),       permission: PERMISSIONS.PAYMENTS_PROCESS },
        { label: t('team.perm_payments_refund'),        permission: PERMISSIONS.PAYMENTS_REFUND },
        { label: t('team.perm_discounts_apply'),        permission: PERMISSIONS.DISCOUNTS_APPLY },
        { label: t('team.perm_discounts_manage'),       permission: PERMISSIONS.DISCOUNTS_MANAGE },
        { label: t('team.perm_cash_drawer'),            permission: PERMISSIONS.CASH_DRAWER },
        { label: t('team.perm_reports_view'),           permission: PERMISSIONS.REPORTS_VIEW },
        { label: t('team.perm_reports_financial'),      permission: PERMISSIONS.REPORTS_FINANCIAL },
        { label: t('team.perm_analytics_view'),         permission: PERMISSIONS.ANALYTICS_VIEW },
        { label: t('team.perm_payroll_view'),           permission: PERMISSIONS.PAYROLL_VIEW },
        { label: t('team.perm_payroll_manage'),         permission: PERMISSIONS.PAYROLL_MANAGE },
      ],
    },
    {
      group: t('team.group_people'),
      rows: [
        { label: t('team.perm_staff_view'),             permission: PERMISSIONS.STAFF_VIEW },
        { label: t('team.perm_schedule_view'),          permission: PERMISSIONS.SCHEDULE_VIEW },
        { label: t('team.perm_schedule_manage'),        permission: PERMISSIONS.SCHEDULE_MANAGE },
        { label: t('team.perm_timeclock_view'),         permission: PERMISSIONS.TIMECLOCK_VIEW },
        { label: t('team.perm_timeclock_manage'),       permission: PERMISSIONS.TIMECLOCK_MANAGE },
        { label: t('team.perm_customers_view'),         permission: PERMISSIONS.CUSTOMERS_VIEW },
        { label: t('team.perm_loyalty_view'),           permission: PERMISSIONS.LOYALTY_VIEW },
        { label: t('team.perm_chat_view'),              permission: PERMISSIONS.CHAT_VIEW },
        { label: t('team.perm_incidents_report'),       permission: PERMISSIONS.INCIDENTS_REPORT },
        { label: t('team.perm_incidents_manage'),       permission: PERMISSIONS.INCIDENTS_MANAGE },
      ],
    },
    {
      group: t('team.group_admin'),
      rows: [
        { label: t('team.perm_settings_view'),          permission: PERMISSIONS.SETTINGS_VIEW },
        { label: t('team.perm_settings_manage'),        permission: PERMISSIONS.SETTINGS_MANAGE },
        { label: t('team.perm_integrations_view'),      permission: PERMISSIONS.INTEGRATIONS_VIEW },
        { label: t('team.perm_integrations_manage'),    permission: PERMISSIONS.INTEGRATIONS_MANAGE },
        { label: t('team.perm_members_view'),           permission: PERMISSIONS.MEMBERS_VIEW },
        { label: t('team.perm_members_manage'),         permission: PERMISSIONS.MEMBERS_MANAGE },
        { label: t('team.perm_locations_view'),         permission: PERMISSIONS.LOCATIONS_VIEW },
        { label: t('team.perm_locations_manage'),       permission: PERMISSIONS.LOCATIONS_MANAGE },
        { label: t('team.perm_organization_manage'),    permission: PERMISSIONS.ORGANIZATION_MANAGE },
        { label: t('team.perm_audit_view'),             permission: PERMISSIONS.AUDIT_VIEW },
      ],
    },
  ];
}

function hasPerm(role: MemberRole, permission: string | null): boolean {
  if (permission === null) return true; // zawsze dostępne
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission as any);
}

// ─── Typy ────────────────────────────────────────────────────────────────────

interface MemberWithMeta extends Member {
  displayName?: string;
}

// ─── Komponent matrycy ────────────────────────────────────────────────────────

function PermissionMatrix({
  members,
  currentMemberId,
  canManage,
  onRoleChange,
}: {
  members: MemberWithMeta[];
  currentMemberId: string | undefined;
  canManage: boolean;
  onRoleChange: (member: MemberWithMeta, role: MemberRole) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleRoleChange = async (member: MemberWithMeta, role: MemberRole) => {
    setSaving(member.userId);
    await onRoleChange(member, role);
    setSaving(null);
  };

  const STICKY_COL: any = {
    position: 'sticky',
    left: 0,
    bgcolor: 'background.paper',
    zIndex: 1,
    borderRight: 1,
    borderColor: 'divider',
  };

  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const sp = useSearchParams();
  const focusMemberId = sp?.get('memberId');
  const { t } = useTranslation(lang, 'team');
  const featureGroups = getFeatureGroups(t);

  useEffect(() => {
    if (!focusMemberId) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-member-id="${focusMemberId}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }, [focusMemberId, activeTab, members.length]);

  if (members.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
        <PeopleIcon sx={{ fontSize: 56, mb: 1, opacity: 0.35 }} />
        <Typography variant="body2">{t('team.empty_team')}</Typography>
      </Box>
    );
  }

  const activeGroup = featureGroups[activeTab];

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Taby obszarów ── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 44,
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: 0,
            textTransform: 'none',
            px: 2,
          },
        }}
      >
        {featureGroups.map((g, i) => (
          <Tab key={i} label={g.group} />
        ))}
      </Tabs>

      {/* ── Tabela dla aktywnej grupy ── */}
      <TableContainer sx={{ maxHeight: `calc(100dvh - ${vh(290)})`, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          {/* Nagłówek — kolumny = użytkownicy */}
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  ...STICKY_COL,
                  zIndex: 3,
                  minWidth: 210,
                  bgcolor: 'background.paper',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  color: 'text.disabled',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('team.role')}
              </TableCell>

              {members.map((m) => {
                const label = m.displayName ?? m.email ?? m.userId;
                const initial = label[0]?.toUpperCase() ?? '?';
                const isMe = m.userId === currentMemberId;
                const canEdit = canManage && m.role !== 'owner' && !isMe;

                return (
                  <TableCell
                    key={m.userId}
                    align="center"
                    data-member-id={m.userId}
                    sx={{
                      minWidth: 130,
                      verticalAlign: 'top',
                      pb: 1.5,
                      bgcolor: focusMemberId === m.userId ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <Stack alignItems="center" spacing={0.75} sx={{ pt: 0.5 }}>
                      <Avatar
                        sx={{
                          width: 34, height: 34,
                          bgcolor: `${ROLE_COLORS[m.role]}.main`,
                          fontSize: 14, fontWeight: 700,
                        }}
                      >
                        {initial}
                      </Avatar>

                      <Tooltip title={m.email ?? m.userId} placement="top">
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                        >
                          {label}{isMe && ` (${t('team.me')})`}
                        </Typography>
                      </Tooltip>

                      {canEdit ? (
                        saving === m.userId ? (
                          <CircularProgress size={14} />
                        ) : (
                          <Select
                            value={m.role}
                            size="small"
                            variant="standard"
                            disableUnderline
                            onChange={(e) => handleRoleChange(m, e.target.value as MemberRole)}
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              '& .MuiSelect-select': { py: 0.25, pr: `${vmin(18)} !important` },
                            }}
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <MenuItem key={r} value={r} sx={{ fontSize: '0.75rem' }}>
                                {t(`team.roles.${r}`, { defaultValue: r })}
                              </MenuItem>
                            ))}
                          </Select>
                        )
                      ) : (
                        <Chip
                          label={t(`team.roles.${m.role}`, { defaultValue: m.role })}
                          size="small"
                          color={ROLE_COLORS[m.role]}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          {/* Wiersze aktywnej grupy */}
          <TableBody>
            {activeGroup.rows.map(({ label, permission }) => (
              <TableRow key={label} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell sx={{ ...STICKY_COL, py: 1, fontSize: '0.8rem', fontWeight: 500 }}>
                  {label}
                </TableCell>
                {members.map((m) => {
                  const has = hasPerm(m.role, permission);
                  return (
                    <TableCell key={m.userId} align="center" sx={{ py: 0.75 }}>
                      {has ? (
                        <CheckCircleIcon
                          sx={{ fontSize: 18, color: 'success.main', opacity: 0.9 }}
                          aria-label={t('team.has_access')}
                        />
                      ) : (
                        <RemoveCircleOutlineIcon
                          sx={{ fontSize: 18, color: 'text.disabled', opacity: 0.4 }}
                          aria-label={t('team.no_access')}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ─── Główny widok ─────────────────────────────────────────────────────────────

function TeamPageContent() {
  const { organization, member: currentMember, hasPermission } = useOrganization();
  const { showNotification } = useNotification();
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'team');

  const [members, setMembers] = useState<MemberWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('waiter');
  const [inviting, setInviting] = useState(false);

  const canManage = hasPermission(PERMISSIONS.MEMBERS_MANAGE);

  const loadMembers = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, `organizations/${organization.id}/members`)),
      );
      const items = snap.docs
        .map((d) => ({ ...d.data(), userId: d.id } as MemberWithMeta))
        .sort((a, b) => {
          const aTs = (a as any).joinedAt?.toMillis?.() ?? 0;
          const bTs = (b as any).joinedAt?.toMillis?.() ?? 0;
          return aTs - bTs;
        });
      setMembers(items);
    } catch {
      showNotification(t('team.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [organization, showNotification]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleRoleChange = async (member: MemberWithMeta, newRole: MemberRole) => {
    if (!organization) return;
    try {
      const newPerms = ROLE_PERMISSIONS[newRole] ?? [];
      await updateDoc(
        doc(db, `organizations/${organization.id}/members`, member.userId),
        { role: newRole, permissions: newPerms },
      );
      setMembers((prev) =>
        prev.map((m) => m.userId === member.userId ? { ...m, role: newRole } : m),
      );
      showNotification(t('team.role_updated'), 'success');
    } catch {
      showNotification(t('team.role_update_error'), 'error');
    }
  };

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await setDoc(doc(collection(db, `organizations/${organization.id}/invites`)), {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        restaurantIds: [],
        token: Math.random().toString(36).slice(2),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: currentMember?.userId,
        createdAt: serverTimestamp(),
      });
      showNotification(t('team.invite_sent', { email: inviteEmail }), 'success');
      setInviteDialog(false);
      setInviteEmail('');
    } catch {
      showNotification(t('team.invite_error'), 'error');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Nagłówek ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <PeopleIcon color="primary" />
          <Typography variant="h6" fontWeight={700} color="text.primary">{t('team.title')}</Typography>
          <Chip label={members.length} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        </Stack>
        <PermissionGate permission={PERMISSIONS.MEMBERS_MANAGE}>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setInviteDialog(true)}>
            {t('team.invite')}
          </Button>
        </PermissionGate>
      </Stack>

      {/* ── Matryca ── */}
      <PermissionMatrix
        members={members}
        currentMemberId={currentMember?.userId}
        canManage={canManage}
        onRoleChange={handleRoleChange}
      />

      {/* ── Historia pracy gastroLudków ── */}

      {/* ── Historia pracy gastroLudka (widoczna tylko dla siebie, manager po zgodzie) ── */}
      {currentMember && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>
            {t('team.work_history_title')}
          </Typography>
          {(() => {
            // Gastroludek widzi tylko swoją historię
            const myHistory = members.find((m) => m.userId === currentMember.userId)?.history ?? [];
            if (myHistory.length === 0) {
              return <Typography color="text.disabled">{t('team.work_history_empty')}</Typography>;
            }
            return (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('team.work_history_col_venue')}</TableCell>
                      <TableCell>{t('team.work_history_col_role')}</TableCell>
                      <TableCell>{t('team.work_history_col_from')}</TableCell>
                      <TableCell>{t('team.work_history_col_to')}</TableCell>
                      <TableCell>{t('team.work_history_col_tables')}</TableCell>
                      <TableCell>{t('team.work_history_col_shifts')}</TableCell>
                      <TableCell>{t('team.work_history_col_notes')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myHistory.map((h, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{h.restaurantId}</TableCell>
                        <TableCell>{t(`team.roles.${h.role}`, { defaultValue: h.role })}</TableCell>
                        <TableCell>{h.from ? new Date(h.from).toLocaleDateString() : ''}</TableCell>
                        <TableCell>{h.to ? new Date(h.to).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{h.tablesServed ?? '-'}</TableCell>
                        <TableCell>{h.shifts ?? '-'}</TableCell>
                        <TableCell>{h.notes ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}

          {/* Placeholder: manager może poprosić o rekomendację, nie widzi historii bez zgody */}
          {canManage && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ fontSize: 13, mb: 2 }}>
                {t('team.work_history_private_info')}
              </Alert>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // TODO: wyślij prośbę o rekomendację do wszystkich byłych pracodawców gastroLudka
                  showNotification(t('team.recommendation_sent'), 'info');
                }}
              >
                {t('team.send_recommendation')}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Dialog zaproszenia ── */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('team.invite_title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={t('team.invite_email_label')}
              placeholder="nazwa@example.com"
              type="email"
              fullWidth
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>{t('team.role')}</InputLabel>
              <Select
                value={inviteRole}
                label={t('team.role')}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`team.roles.${r}`, { defaultValue: r })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            sx={{ position: 'relative' }}
          >
            {inviting ? <CircularProgress size={20} sx={{ position: 'absolute' }} /> : t('team.send_invite')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function TeamPage() {
  return (
    <RequireOrganization>
      <TeamPageContent />
    </RequireOrganization>
  );
}
