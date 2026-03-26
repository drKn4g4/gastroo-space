'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Checkbox, Button, Stack, CircularProgress, Tooltip, Alert, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockIcon from '@mui/icons-material/Lock';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useParams } from 'next/navigation';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  PERMISSIONS, ROLE_PERMISSIONS, ROLE_LABELS,
  type MemberRole, type Permission,
} from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';

const P = PERMISSIONS;

// ── Matrix section definitions ────────────────────────────────────────────────

interface MatrixRow {
  permission: Permission;
  label: string;
}

interface MatrixSection {
  key: string;
  label: string;
  rows: MatrixRow[];
}

function getMatrixSections(t: (key: string) => string): MatrixSection[] {
  return [
    {
      key: 'menu',
      label: t('dashboard.permissions.section_menu'),
      rows: [
        { permission: P.MENU_VIEW,        label: t('dashboard.permissions.perm_view') },
        { permission: P.MENU_MANAGE,      label: t('dashboard.permissions.perm_menu_manage') },
        { permission: P.MENU_PUBLISH,     label: t('dashboard.permissions.perm_menu_publish') },
        { permission: P.ALLERGENS_MANAGE, label: t('dashboard.permissions.perm_allergens_manage') },
      ],
    },
    {
      key: 'bookings',
      label: t('dashboard.permissions.section_bookings'),
      rows: [
        { permission: P.BOOKINGS_VIEW,   label: t('dashboard.permissions.perm_view') },
        { permission: P.BOOKINGS_CREATE, label: t('dashboard.permissions.perm_bookings_create') },
        { permission: P.BOOKINGS_UPDATE, label: t('dashboard.permissions.perm_bookings_update') },
        { permission: P.BOOKINGS_DELETE, label: t('dashboard.permissions.perm_bookings_delete') },
        { permission: P.BOOKINGS_EXPORT, label: t('dashboard.permissions.perm_bookings_export') },
      ],
    },
    {
      key: 'sala',
      label: t('dashboard.permissions.section_sala'),
      rows: [
        { permission: P.TABLES_VIEW,   label: t('dashboard.permissions.perm_view') },
        { permission: P.TABLES_STATUS, label: t('dashboard.permissions.perm_tables_status') },
        { permission: P.TABLES_MANAGE, label: t('dashboard.permissions.perm_tables_manage') },
      ],
    },
    {
      key: 'orders',
      label: t('dashboard.permissions.section_orders'),
      rows: [
        { permission: P.ORDERS_VIEW,   label: t('dashboard.permissions.perm_view') },
        { permission: P.ORDERS_CREATE, label: t('dashboard.permissions.perm_orders_create') },
        { permission: P.ORDERS_UPDATE, label: t('dashboard.permissions.perm_orders_update') },
        { permission: P.ORDERS_CLOSE,  label: t('dashboard.permissions.perm_orders_close') },
        { permission: P.ORDERS_VOID,   label: t('dashboard.permissions.perm_orders_void') },
      ],
    },
    {
      key: 'payments',
      label: t('dashboard.permissions.section_payments'),
      rows: [
        { permission: P.PAYMENTS_VIEW,    label: t('dashboard.permissions.perm_view') },
        { permission: P.PAYMENTS_PROCESS, label: t('dashboard.permissions.perm_payments_process') },
        { permission: P.PAYMENTS_REFUND,  label: t('dashboard.permissions.perm_payments_refund') },
        { permission: P.PAYMENTS_SPLIT,   label: t('dashboard.permissions.perm_payments_split') },
        { permission: P.DISCOUNTS_APPLY,  label: t('dashboard.permissions.perm_discounts_apply') },
        { permission: P.DISCOUNTS_MANAGE, label: t('dashboard.permissions.perm_discounts_manage') },
        { permission: P.CASH_DRAWER,      label: t('dashboard.permissions.perm_cash_drawer') },
      ],
    },
    {
      key: 'kitchen',
      label: t('dashboard.permissions.section_kitchen'),
      rows: [
        { permission: P.KITCHEN_VIEW,    label: t('dashboard.permissions.perm_kitchen_view') },
        { permission: P.KITCHEN_MANAGE,  label: t('dashboard.permissions.perm_kitchen_manage') },
        { permission: P.INVENTORY_VIEW,  label: t('dashboard.permissions.perm_inventory_view') },
        { permission: P.INVENTORY_MANAGE,label: t('dashboard.permissions.perm_inventory_manage') },
        { permission: P.INVENTORY_ADJUST,label: t('dashboard.permissions.perm_inventory_adjust') },
      ],
    },
    {
      key: 'staff',
      label: t('dashboard.permissions.section_staff'),
      rows: [
        { permission: P.STAFF_VIEW,        label: t('dashboard.permissions.perm_view') },
        { permission: P.STAFF_MANAGE,      label: t('dashboard.permissions.perm_staff_manage') },
        { permission: P.SCHEDULE_VIEW,     label: t('dashboard.permissions.perm_schedule_view') },
        { permission: P.SCHEDULE_MANAGE,   label: t('dashboard.permissions.perm_schedule_manage') },
        { permission: P.TIMECLOCK_VIEW,    label: t('dashboard.permissions.perm_timeclock_view') },
        { permission: P.TIMECLOCK_MANAGE,  label: t('dashboard.permissions.perm_timeclock_manage') },
      ],
    },
    {
      key: 'promotions',
      label: t('dashboard.permissions.section_promotions'),
      rows: [
        { permission: P.PROMOTIONS_VIEW,   label: t('dashboard.permissions.perm_view') },
        { permission: P.PROMOTIONS_MANAGE, label: t('dashboard.permissions.perm_promotions_manage') },
      ],
    },
    {
      key: 'customers',
      label: t('dashboard.permissions.section_customers'),
      rows: [
        { permission: P.CUSTOMERS_VIEW,   label: t('dashboard.permissions.perm_customers_view') },
        { permission: P.CUSTOMERS_MANAGE, label: t('dashboard.permissions.perm_customers_manage') },
        { permission: P.LOYALTY_VIEW,     label: t('dashboard.permissions.perm_loyalty_view') },
        { permission: P.LOYALTY_SCAN,     label: t('dashboard.permissions.perm_loyalty_scan') },
        { permission: P.LOYALTY_REDEEM,   label: t('dashboard.permissions.perm_loyalty_redeem') },
        { permission: P.LOYALTY_MANAGE,   label: t('dashboard.permissions.perm_loyalty_manage') },
      ],
    },
    {
      key: 'reports',
      label: t('dashboard.permissions.section_reports'),
      rows: [
        { permission: P.REPORTS_VIEW,      label: t('dashboard.permissions.perm_reports_view') },
        { permission: P.REPORTS_FINANCIAL, label: t('dashboard.permissions.perm_reports_financial') },
        { permission: P.REPORTS_EXPORT,    label: t('dashboard.permissions.perm_reports_export') },
        { permission: P.ANALYTICS_VIEW,    label: t('dashboard.permissions.perm_analytics_view') },
      ],
    },
    {
      key: 'admin',
      label: t('dashboard.permissions.section_admin'),
      rows: [
        { permission: P.MEMBERS_VIEW,       label: t('dashboard.permissions.perm_members_view') },
        { permission: P.MEMBERS_MANAGE,     label: t('dashboard.permissions.perm_members_manage') },
        { permission: P.SETTINGS_VIEW,      label: t('dashboard.permissions.perm_settings_view') },
        { permission: P.SETTINGS_MANAGE,    label: t('dashboard.permissions.perm_settings_manage') },
        { permission: P.INTEGRATIONS_VIEW,  label: t('dashboard.permissions.perm_integrations_view') },
        { permission: P.INTEGRATIONS_MANAGE,label: t('dashboard.permissions.perm_integrations_manage') },
        { permission: P.ORGANIZATION_MANAGE,label: t('dashboard.permissions.perm_organization_manage') },
        { permission: P.AUDIT_VIEW,         label: t('dashboard.permissions.perm_audit_view') },
        { permission: P.API_MANAGE,         label: t('dashboard.permissions.perm_api_manage') },
      ],
    },
  ];
}

// ── Role display config ───────────────────────────────────────────────────────

const DISPLAY_ROLES: MemberRole[] = [
  'owner', 'admin', 'manager', 'waiter', 'chef',
  'bartender', 'sommelier', 'supervisor', 'kitchen', 'cashier', 'delivery', 'staff',
];

const IMMUTABLE_ROLES = new Set<MemberRole>(['owner', 'admin']);

function getRoleAbbr(t: (key: string) => string): Record<MemberRole, string> {
  return {
    owner: t('dashboard.permissions.abbr_owner'),
    admin: t('dashboard.permissions.abbr_admin'),
    manager: t('dashboard.permissions.abbr_manager'),
    waiter: t('dashboard.permissions.abbr_waiter'),
    chef: t('dashboard.permissions.abbr_chef'),
    bartender: t('dashboard.permissions.abbr_bartender'),
    sommelier: t('dashboard.permissions.abbr_sommelier'),
    supervisor: t('dashboard.permissions.abbr_supervisor'),
    kitchen: t('dashboard.permissions.abbr_kitchen'),
    cashier: t('dashboard.permissions.abbr_cashier'),
    delivery: t('dashboard.permissions.abbr_delivery'),
    staff: t('dashboard.permissions.abbr_staff'),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type OverrideMap = Partial<Record<MemberRole, { add: Permission[]; remove: Permission[] }>>;
type PermSet = Record<MemberRole, Set<Permission>>;

type MatrixSaveStatus = 'idle' | 'saved' | 'error' | 'forbidden';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDefaultPermSet(): PermSet {
  return Object.fromEntries(
    DISPLAY_ROLES.map((role) => [role, new Set<Permission>(ROLE_PERMISSIONS[role] ?? [])]),
  ) as PermSet;
}

function applyOverrides(defaults: PermSet, overrides: OverrideMap): PermSet {
  const result: PermSet = {} as PermSet;
  for (const role of DISPLAY_ROLES) {
    const base = new Set(defaults[role]);
    const ov = overrides[role];
    if (ov) {
      for (const p of ov.add) base.add(p as Permission);
      for (const p of ov.remove) base.delete(p as Permission);
    }
    result[role] = base;
  }
  return result;
}

function computeOverrides(current: PermSet, defaults: PermSet): OverrideMap {
  const result: OverrideMap = {};
  for (const role of DISPLAY_ROLES) {
    if (IMMUTABLE_ROLES.has(role)) continue;
    const cur = current[role];
    const def = defaults[role];
    const add: Permission[] = [];
    const remove: Permission[] = [];
    for (const p of cur) { if (!def.has(p)) add.push(p); }
    for (const p of def) { if (!cur.has(p)) remove.push(p); }
    if (add.length > 0 || remove.length > 0) result[role] = { add, remove };
  }
  return result;
}

function normalizeOverrideMap(input: OverrideMap): OverrideMap {
  const normalized: OverrideMap = {};
  for (const role of DISPLAY_ROLES) {
    const entry = input[role];
    if (!entry) continue;
    const add = Array.from(new Set((entry.add ?? []).slice().sort()));
    const remove = Array.from(new Set((entry.remove ?? []).slice().sort()));
    if (add.length > 0 || remove.length > 0) {
      normalized[role] = { add, remove };
    }
  }
  return normalized;
}

function areOverridesEqual(left: OverrideMap, right: OverrideMap): boolean {
  return JSON.stringify(normalizeOverrideMap(left)) === JSON.stringify(normalizeOverrideMap(right));
}

function buildPermissionsBySection(sections: MatrixSection[]): Record<string, Set<Permission>> {
  const map: Record<string, Set<Permission>> = {};
  for (const section of sections) {
    map[section.key] = new Set(section.rows.map((row) => row.permission));
  }
  return map;
}

function collectChangedPermissions(prev: OverrideMap, next: OverrideMap): Set<Permission> {
  const changed = new Set<Permission>();
  for (const role of DISPLAY_ROLES) {
    const before = prev[role] ?? { add: [], remove: [] };
    const after = next[role] ?? { add: [], remove: [] };

    for (const permission of before.add) {
      if (!after.add.includes(permission)) changed.add(permission);
    }
    for (const permission of after.add) {
      if (!before.add.includes(permission)) changed.add(permission);
    }

    for (const permission of before.remove) {
      if (!after.remove.includes(permission)) changed.add(permission);
    }
    for (const permission of after.remove) {
      if (!before.remove.includes(permission)) changed.add(permission);
    }
  }
  return changed;
}

function buildAuditChanges(prev: OverrideMap, next: OverrideMap) {
  const changes: Array<{ role: MemberRole; add: Permission[]; remove: Permission[] }> = [];
  for (const role of DISPLAY_ROLES) {
    const before = prev[role] ?? { add: [], remove: [] };
    const after = next[role] ?? { add: [], remove: [] };

    const add: Permission[] = [];
    const remove: Permission[] = [];

    for (const permission of after.add) {
      if (!before.add.includes(permission)) add.push(permission);
    }
    for (const permission of before.remove) {
      if (!after.remove.includes(permission)) add.push(permission);
    }

    for (const permission of before.add) {
      if (!after.add.includes(permission)) remove.push(permission);
    }
    for (const permission of after.remove) {
      if (!before.remove.includes(permission)) remove.push(permission);
    }

    if (add.length > 0 || remove.length > 0) {
      changes.push({ role, add, remove });
    }
  }
  return changes;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PermissionsMatrixView() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');
  const { organization, member } = useOrganization();
  const perms = usePermissions();

  const canView = perms.isOwner || perms.isAdmin || perms.canViewMembers || perms.canViewSettings;
  const canEdit = perms.isOwner || perms.isAdmin || (perms.isManager && (perms.canManageMembers || perms.canManageSettings));
  const isManager = perms.isManager && !perms.isOwner && !perms.isAdmin;

  const matrixSections = useMemo(() => getMatrixSections(t), [t]);
  const roleAbbr = useMemo(() => getRoleAbbr(t), [t]);

  const permissionsBySection = useMemo(() => buildPermissionsBySection(matrixSections), [matrixSections]);
  const managerEditablePermissions = useMemo(() => {
    const editableSectionKeys = ['menu', 'bookings', 'sala', 'orders', 'staff', 'promotions'];
    const allowed = new Set<Permission>();
    for (const sectionKey of editableSectionKeys) {
      const sectionPermissions = permissionsBySection[sectionKey];
      if (!sectionPermissions) continue;
      for (const permission of sectionPermissions) allowed.add(permission);
    }
    return allowed;
  }, [permissionsBySection]);

  const defaults = useMemo(() => buildDefaultPermSet(), []);

  const [matrix, setMatrix] = useState<PermSet>(defaults);
  const [loadedOverrides, setLoadedOverrides] = useState<OverrideMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<MatrixSaveStatus>('idle');

  const canEditPermission = useCallback((permission: Permission) => {
    if (!canEdit) return false;
    if (!isManager) return true;
    return managerEditablePermissions.has(permission);
  }, [canEdit, isManager, managerEditablePermissions]);

  // Load org-level overrides from Firestore
  useEffect(() => {
    if (!organization) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    getDoc(doc(db, `organizations/${organization.id}/settings`, 'permissionsMatrix'))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          const overrides = (data.overrides ?? {}) as OverrideMap;
          setLoadedOverrides(overrides);
          setMatrix(applyOverrides(defaults, overrides));
        } else {
          setMatrix(buildDefaultPermSet());
        }
      })
      .catch(() => { if (!cancelled) setMatrix(buildDefaultPermSet()); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [organization, defaults]);

  const toggleCell = useCallback((role: MemberRole, permission: Permission) => {
    if (!canEditPermission(permission) || IMMUTABLE_ROLES.has(role)) return;
    setMatrix((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(permission)) {
        next[role].delete(permission);
      } else {
        next[role].add(permission);
      }
      return next;
    });
    setSaveStatus('idle');
  }, [canEditPermission]);

  const applyPresetForRole = useCallback((role: MemberRole) => {
    if (!canEdit || IMMUTABLE_ROLES.has(role)) return;
    setMatrix((prev) => ({
      ...prev,
      [role]: new Set<Permission>(ROLE_PERMISSIONS[role] ?? []),
    }));
    setSaveStatus('idle');
  }, [canEdit]);

  const handleSave = async () => {
    if (!organization || !member) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const overrides = computeOverrides(matrix, defaults);

      // Manager can modify only operational permissions in the matrix.
      if (isManager) {
        const changedPermissions = collectChangedPermissions(loadedOverrides, overrides);
        const hasForbiddenChange = Array.from(changedPermissions)
          .some((permission) => !managerEditablePermissions.has(permission));
        if (hasForbiddenChange) {
          setSaveStatus('forbidden');
          setSaving(false);
          return;
        }
      }

      await setDoc(
        doc(db, `organizations/${organization.id}/settings`, 'permissionsMatrix'),
        { overrides, updatedAt: serverTimestamp(), updatedBy: member.userId },
        { merge: false },
      );

      const auditChanges = buildAuditChanges(loadedOverrides, overrides);
      if (auditChanges.length > 0) {
        await addDoc(collection(db, `organizations/${organization.id}/logs`), {
          orgId: organization.id,
          action: 'permissions.matrix.updated',
          source: 'dashboard.permissionsMatrix',
          actorUid: member.userId,
          actorRole: member.role,
          changes: auditChanges,
          previousOverrides: normalizeOverrideMap(loadedOverrides),
          nextOverrides: normalizeOverrideMap(overrides),
          createdAt: serverTimestamp(),
        });
      }

      setLoadedOverrides(overrides);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMatrix(applyOverrides(defaults, loadedOverrides));
    setSaveStatus('idle');
  };

  const hasUnsaved = useMemo(() => {
    const currentOverrides = computeOverrides(matrix, defaults);
    return !areOverridesEqual(currentOverrides, loadedOverrides);
  }, [matrix, defaults, loadedOverrides]);

  if (!canView) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <LockIcon sx={{ fontSize: '2rem', mb: 1 }} />
        <Typography variant="body2">{t('dashboard.permissions.no_access')}</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Column widths
  const labelColW = '13rem';
  const cellW = '3.8rem';

  return (
    <Box sx={{ width: '100%' }}>
      {/* Toolbar */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, px: 0.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1, fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}>
          {t('dashboard.permissions.title')}
        </Typography>

        {canEdit && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AutoFixHighIcon sx={{ fontSize: '0.9rem' }} />}
              onClick={() => applyPresetForRole('waiter')}
              disabled={saving}
            >
              {t('dashboard.permissions.preset_waiter')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AutoFixHighIcon sx={{ fontSize: '0.9rem' }} />}
              onClick={() => applyPresetForRole('bartender')}
              disabled={saving}
            >
              {t('dashboard.permissions.preset_bartender')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AutoFixHighIcon sx={{ fontSize: '0.9rem' }} />}
              onClick={() => applyPresetForRole('chef')}
              disabled={saving}
            >
              {t('dashboard.permissions.preset_chef')}
            </Button>
          </Stack>
        )}

        {canEdit && (
          <>
            {hasUnsaved && (
              <Chip label={t('dashboard.permissions.unsaved_changes')} size="small" color="warning" variant="outlined" />
            )}
            <Button
              size="small" variant="outlined" startIcon={<RestartAltIcon />}
              onClick={handleReset} disabled={!hasUnsaved || saving}
            >
              {t('dashboard.permissions.reset')}
            </Button>
            <Button
              size="small" variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
              onClick={() => { void handleSave(); }} disabled={!hasUnsaved || saving}
            >
              {t('dashboard.permissions.save')}
            </Button>
          </>
        )}

        {!canEdit && (
          <Chip
            icon={<LockIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={t('dashboard.permissions.view_only')} size="small" variant="outlined"
          />
        )}
      </Stack>

      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSaveStatus('idle')}>
          {t('dashboard.permissions.save_success')}
        </Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setSaveStatus('idle')}>
          {t('dashboard.permissions.save_error')}
        </Alert>
      )}
      {saveStatus === 'forbidden' && (
        <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setSaveStatus('idle')}>
          {t('dashboard.permissions.save_forbidden')}
        </Alert>
      )}

      {/* Scrollable table */}
      <TableContainer
        sx={{
          overflowX: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          maxHeight: 'calc(100vh - 18rem)',
          overflowY: 'auto',
        }}
      >
        <Table size="small" stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          {/* Header row */}
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  minWidth: labelColW, width: labelColW,
                  position: 'sticky', left: 0, zIndex: 4,
                  bgcolor: 'background.paper',
                  borderBottom: '2px solid', borderColor: 'divider',
                  fontWeight: 800, fontSize: '0.72rem',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}
              >
                {t('dashboard.permissions.col_feature_role')}
              </TableCell>
              {DISPLAY_ROLES.map((role) => (
                <TableCell
                  key={role}
                  align="center"
                  sx={{
                    width: cellW, minWidth: cellW, maxWidth: cellW,
                    px: 0, py: 1,
                    borderBottom: '2px solid', borderColor: 'divider',
                    bgcolor: 'background.paper',
                    zIndex: 3,
                  }}
                >
                  <Tooltip title={ROLE_LABELS[role]?.pl ?? role} placement="top">
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block', textAlign: 'center',
                        fontWeight: IMMUTABLE_ROLES.has(role) ? 900 : 600,
                        fontSize: '0.65rem',
                        color: IMMUTABLE_ROLES.has(role) ? 'text.disabled' : 'text.primary',
                        lineHeight: 1.2,
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      {roleAbbr[role]}
                    </Typography>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {matrixSections.map((section, sIdx) => (
              <React.Fragment key={section.key}>
                {/* Section header row */}
                <TableRow>
                  <TableCell
                    colSpan={DISPLAY_ROLES.length + 1}
                    sx={{
                      position: 'sticky', left: 0,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderTop: sIdx > 0 ? '2px solid' : undefined,
                      borderTopColor: 'divider',
                      py: 0.75, px: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 900, fontSize: '0.68rem',
                        textTransform: 'uppercase', letterSpacing: 1,
                        color: 'text.secondary',
                      }}
                    >
                      {section.label}
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* Permission rows */}
                {section.rows.map((row, rIdx) => {
                  const isLast = rIdx === section.rows.length - 1;
                  return (
                    <TableRow
                      key={row.permission}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(isLast ? {} : {}),
                      }}
                    >
                      {/* Label cell */}
                      <TableCell
                        sx={{
                          position: 'sticky', left: 0, zIndex: 1,
                          bgcolor: 'background.paper',
                          py: 0.4, pl: 2.5, pr: 1,
                          borderBottom: '1px solid', borderColor: 'divider',
                          minWidth: labelColW, width: labelColW,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                          {row.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1.1 }}
                        >
                          {row.permission}
                        </Typography>
                      </TableCell>

                      {/* Checkbox cells per role */}
                      {DISPLAY_ROLES.map((role) => {
                        const isImmutable = IMMUTABLE_ROLES.has(role);
                        const checked = isImmutable ? true : (matrix[role]?.has(row.permission) ?? false);
                        const defaultChecked = defaults[role]?.has(row.permission) ?? false;
                        const isModified = !isImmutable && checked !== defaultChecked;

                        return (
                          <TableCell
                            key={role}
                            align="center"
                            sx={{
                              width: cellW, minWidth: cellW, maxWidth: cellW,
                              px: 0, py: 0.25,
                              borderBottom: '1px solid', borderColor: 'divider',
                              bgcolor: isModified
                                ? (checked ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.06)')
                                : 'transparent',
                            }}
                          >
                            {isImmutable ? (
                              <Tooltip title={t('dashboard.permissions.immutable_role_tooltip')} placement="top">
                                <LockIcon sx={{ fontSize: '0.85rem', color: 'text.disabled', display: 'block', mx: 'auto' }} />
                              </Tooltip>
                            ) : (
                              <Checkbox
                                size="small"
                                checked={checked}
                                disabled={!canEditPermission(row.permission)}
                                onChange={() => toggleCell(role, row.permission)}
                                sx={{
                                  p: 0.3,
                                  color: isModified ? (checked ? 'success.main' : 'error.main') : undefined,
                                  '&.Mui-checked': {
                                    color: isModified ? 'success.main' : 'primary.main',
                                  },
                                  '& .MuiSvgIcon-root': { fontSize: '1rem' },
                                }}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mt: 1.5, px: 0.5, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'rgba(76, 175, 80, 0.2)', border: '1px solid', borderColor: 'success.light' }} />
          <Typography variant="caption" color="text.secondary">{t('dashboard.permissions.legend_added')}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'rgba(244, 67, 54, 0.12)', border: '1px solid', borderColor: 'error.light' }} />
          <Typography variant="caption" color="text.secondary">{t('dashboard.permissions.legend_removed')}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <LockIcon sx={{ fontSize: '0.85rem', color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">{t('dashboard.permissions.legend_immutable')}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
