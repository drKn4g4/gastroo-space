'use client';

import { useMemo, useState } from 'react';
import {
  Box, Typography, Stack, Chip, Card, CardContent, Divider, Tab, Tabs, Avatar,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import TableChartIcon from '@mui/icons-material/TableChart';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SettingsIcon from '@mui/icons-material/Settings';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import PermissionsMatrixView from './PermissionsMatrixView';
import OwnerAuditLogsView from './OwnerAuditLogsView';
import { useTranslation } from '@/lib/i18n/client';

// ─── Quick stat card ──────────────────────────────────────────────────────────

function StatTile({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card sx={{ flex: 1, minWidth: '7rem' }}>
      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 40, height: 40, borderRadius: '10px' }}>
            {icon}
          </Avatar>
          <Box>
            <Typography
              sx={{ fontWeight: 800, fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', lineHeight: 1 }}
            >
              {value}
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2, fontSize: '0.6rem' }}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdminPanelViewProps {
  lang: string;
}

export default function AdminPanelView({ lang }: AdminPanelViewProps) {
  const { t } = useTranslation(lang, 'dashboard');
  const { organization, member, restaurants } = useOrganization();
  const perms = usePermissions();
  const [tab, setTab] = useState<'permissions' | 'ownerLogs' | 'settings'>('permissions');
  const canSeeOwnerLogs = member?.role === 'owner' || member?.role === 'admin';

  const adminTabs = useMemo(() => [
    { key: 'permissions', label: t('dashboard.admin.tab_permissions'), icon: <LockPersonIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'ownerLogs', label: t('dashboard.admin.tab_owner_logs'), icon: <ReceiptLongIcon sx={{ fontSize: '1rem' }} /> },
    { key: 'settings', label: t('dashboard.admin.tab_settings'), icon: <SettingsIcon sx={{ fontSize: '1rem' }} /> },
  ] as const, [t]);

  const roleLabel = useMemo(() => {
    if (!member?.role) return '';
    return t(`dashboard.roles.${member.role}`, { defaultValue: member.role });
  }, [member?.role, t]);

  return (
    <Box sx={{ p: 2.5, pb: 4 }}>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <BusinessIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {t('dashboard.admin.title')}
          </Typography>
        </Stack>
        {organization && (
          <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'flex', alignItems: 'center' }}>
            {organization.name}
            {roleLabel && (
              <Chip
                label={roleLabel}
                size="small"
                variant="outlined"
                sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Typography>
        )}
      </Stack>

      {/* Quick stats */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <StatTile icon={<RestaurantIcon sx={{ fontSize: '1.1rem' }} />} label={t('dashboard.admin.venues')} value={restaurants.length} />
        {perms.canViewMembers && (
          <StatTile icon={<PeopleIcon sx={{ fontSize: '1.1rem' }} />} label={t('dashboard.admin.members')} value="–" />
        )}
        <StatTile icon={<TableChartIcon sx={{ fontSize: '1.1rem' }} />} label={t('dashboard.admin.plan')} value={organization?.plan ?? '–'} />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as typeof tab)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.75, borderRadius: '10px' } }}
      >
        {adminTabs.filter((tab_) => tab_.key !== 'ownerLogs' || canSeeOwnerLogs).map((tab_) => (
          <Tab
            key={tab_.key}
            value={tab_.key}
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                {tab_.icon}
                <span>{tab_.label}</span>
              </Stack>
            }
          />
        ))}
      </Tabs>

      {/* Tab content */}
      {tab === 'permissions' && <PermissionsMatrixView />}

      {tab === 'ownerLogs' && canSeeOwnerLogs && <OwnerAuditLogsView />}

      {tab === 'settings' && (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <SettingsIcon sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.35 }} />
          <Typography variant="body2">
            {t('dashboard.admin.settings_coming_soon')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
