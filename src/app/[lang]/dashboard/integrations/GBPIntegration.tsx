// src/app/[lang]/dashboard/integrations/GBPIntegration.tsx
'use client';

import React, { useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, Button, Chip, Stack,
  Alert, CircularProgress, Avatar, Box, List, ListItem, ListItemText,
  ListItemIcon, Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useGBPIntegration } from '@/lib/hooks/useGBPIntegration';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

export default function GBPIntegration() {
  const theme = useTheme();
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const { organization } = useOrganization();
  const { status, loading, connecting, error, connect, getLocations, ensureLocation } = useGBPIntegration();
  const [locations, setLocations] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!organization?.id) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const locs = await getLocations(organization.id);
      setLocations(locs);
    } catch (e) {
      console.error(e);
      setSyncError(e instanceof Error ? e.message : t('dashboard.integrations.gbp_locations_error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleEnsureLocation = async () => {
    if (!organization?.id) return;
    setEnsuring(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const result = await ensureLocation(organization.id);
      setSyncMessage(result.created
        ? t('dashboard.integrations.gbp_created')
        : t('dashboard.integrations.gbp_linked'));
      const locs = await getLocations(organization.id);
      setLocations(locs);
    } catch (e) {
      console.error(e);
      setSyncError(e instanceof Error ? e.message : t('dashboard.integrations.gbp_sync_error'));
    } finally {
      setEnsuring(false);
    }
  };

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: status.connected ? 'primary.main' : 'divider',
        ...(status.connected && {
          background: alpha(theme.palette.primary.main, 0.04),
        }),
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar sx={{ bgcolor: '#4285F4', width: 48, height: 48 }}>
            <BusinessIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Google Business Profile</Typography>
              {status.connected ? (
                <Chip icon={<CheckCircleIcon />} label={t('dashboard.integrations.connected')} color="primary" size="small" sx={{ fontWeight: 600 }} />
              ) : (
                <Chip label={t('dashboard.integrations.not_connected')} size="small" variant="outlined" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.integrations.gbp_desc')}
            </Typography>

            {!organization?.id && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('dashboard.integrations.gbp_select_org')}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {syncError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {syncError}
              </Alert>
            )}

            {syncMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {syncMessage}
              </Alert>
            )}

            {status.connected && locations.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>{t('dashboard.integrations.gbp_detected_locations')}</Typography>
                <List dense>
                  {locations.map((loc, i) => (
                    <ListItem key={i}>
                      <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={loc.title} secondary={loc.storefrontAddress?.addressLines?.join(', ')} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {!status.connected ? (
          <Button
            variant="contained"
            size="small"
            startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : <BusinessIcon />}
            onClick={() => connect(organization?.id)}
            disabled={connecting || !organization?.id}
          >
            {t('dashboard.integrations.gbp_connect_btn')}
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={ensuring ? <CircularProgress size={14} color="inherit" /> : <BusinessIcon />}
              onClick={handleEnsureLocation}
              disabled={ensuring || !organization?.id}
            >
              {t('dashboard.integrations.gbp_find_or_create')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing || !organization?.id}
            >
              {t('dashboard.integrations.gbp_sync_data')}
            </Button>
          </Stack>
        )}
      </CardActions>
    </Card>
  );
}
