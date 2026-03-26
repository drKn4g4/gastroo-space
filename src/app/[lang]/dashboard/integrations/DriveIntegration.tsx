// src/app/[lang]/dashboard/integrations/DriveIntegration.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Button, Chip, Stack,
  Alert, CircularProgress, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip,
  Divider, Avatar,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloudIcon from '@mui/icons-material/Cloud';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDriveIntegration, DriveFile } from '@/lib/hooks/useDriveIntegration';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { GoogleDriveIntegrationDoc } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
  if (mimeType === 'application/vnd.google-apps.folder') return <FolderIcon color="warning" />;
  return <InsertDriveFileIcon color="action" />;
}

function formatBytes(size?: string) {
  if (!size) return '';
  const n = parseInt(size);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Connect Dialog ──────────────────────────────────────────────────────────
function ConnectDialog({ open, onClose, onConnect, t }: {
  open: boolean;
  onClose: () => void;
  onConnect: (folderId: string) => void | Promise<void>;
  t: (key: string) => string;
}) {
  const [folderId, setFolderId] = useState('');

  const extractId = (val: string) => {
    // Support both direct ID and full Drive URL
    const match = val.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : val.trim();
  };

  const handleConnect = () => {
    const id = extractId(folderId);
    if (id) { onConnect(id); onClose(); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dashboard.integrations.drive_connect_title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            <strong>{t('dashboard.integrations.drive_how_it_works')}</strong><br />
            1. {t('dashboard.integrations.drive_step1')} <em>„Gastroo - Moja Restauracja"</em><br />
            2. {t('dashboard.integrations.drive_step2')}<br />
            3. {t('dashboard.integrations.drive_step3')}
          </Alert>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {t('dashboard.integrations.drive_folder_structure')}
            </Typography>
            <Box
              component="pre"
              sx={{
                p: '1.5vh',
                bgcolor: 'action.hover',
                borderRadius: '1vw',
                fontSize: 'clamp(0.75rem, 0.9vw, 0.9rem)',
                overflow: 'auto',
              }}
            >
{`📁 Gastroo - Moja Restauracja/
  ├── 📄 config.json      ← dane lokalu
  ├── 📄 staff.json       ← pracownicy
  └── 📁 menu/
      ├── 🖼️ pizza.jpg
      └── 📄 menu.json`}
            </Box>
          </Box>
          <TextField
            label={t('dashboard.integrations.drive_folder_link')}
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/XXXXX"
            helperText={t('dashboard.integrations.drive_folder_hint')}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dashboard.integrations.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={!folderId.trim()}
          startIcon={<CloudIcon />}
        >
          {t('dashboard.integrations.drive_authorize')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── File Browser ─────────────────────────────────────────────────────────────
function FileBrowser({ folderId, orgId, title, t }: { folderId: string; orgId: string; title: string; t: (key: string) => string }) {
  const { listFiles } = useDriveIntegration();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFiles(folderId, orgId);
      setFiles(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [listFiles, folderId, orgId]);

  if (!loaded) {
    return (
      <Button size="small" startIcon={<FolderIcon />} onClick={load} disabled={loading}>
        {loading ? t('dashboard.integrations.drive_loading_files') : t('dashboard.integrations.drive_preview_files')}
      </Button>
    );
  }

  return (
    <Box sx={{ mt: '2vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1vh' }}>
        <Typography variant="subtitle2" fontWeight={600}>{title} ({files.length})</Typography>
        <Tooltip title={t('dashboard.integrations.drive_refresh')}>
          <Button size="small" onClick={load} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </Button>
        </Tooltip>
      </Box>
      {files.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('dashboard.integrations.drive_folder_empty')}</Typography>
      ) : (
        <List dense disablePadding>
          {files.map((f) => (
            <ListItem key={f.id} disablePadding sx={{ py: '0.4vh' }}>
              <ListItemIcon sx={{ minWidth: '3vw' }}>{fileIcon(f.mimeType)}</ListItemIcon>
              <ListItemText
                primary={f.name}
                secondary={formatBytes(f.size)}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {(f.webContentLink || f.mimeType === 'application/vnd.google-apps.folder') && (
                <Tooltip title={t('dashboard.integrations.drive_open_in_drive')}>
                  <Button
                    size="small"
                    href={f.mimeType === 'application/vnd.google-apps.folder'
                      ? `https://drive.google.com/drive/folders/${f.id}`
                      : `https://drive.google.com/file/d/${f.id}/view`}
                    target="_blank"
                    rel="noopener"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </Button>
                </Tooltip>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function DriveIntegration() {
  const theme = useTheme();
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const { status, loading, connecting, error, connect, disconnect, provision } = useDriveIntegration();
  const { organization } = useOrganization();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [integration, setIntegration] = useState<GoogleDriveIntegrationDoc | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);

  const loadIntegration = useCallback(async () => {
    if (!organization?.id) {
      setIntegration(null);
      return;
    }

    setIntegrationLoading(true);
    try {
      const snap = await getDoc(doc(db, `organizations/${organization.id}/integrations/googleDrive`));
      setIntegration(snap.exists() ? snap.data() as GoogleDriveIntegrationDoc : null);
    } finally {
      setIntegrationLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    void loadIntegration();
  }, [loadIntegration, status.connected]);

  const handleConnect = async (id: string) => {
    if (!organization?.id) return;
    await connect({ rootFolderId: id, orgId: organization.id });
    await loadIntegration();
  };

  const handleProvision = async () => {
    if (!organization?.id) return;
    setProvisioning(true);
    try {
      await provision(`Gastroo - ${organization?.name ?? 'Nowy Lokal'}`, organization?.id);
      await loadIntegration();
    } catch (e) {
      console.error(e);
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: '4vh' }}>
          <CircularProgress size={28} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderColor: status.connected ? 'success.main' : 'divider',
          ...(status.connected && {
            background: alpha(theme.palette.success.main, 0.04),
          }),
        }}
      >
        <CardContent>
          <Stack direction="row" spacing="1.5vw" alignItems="flex-start">
            <Avatar sx={{ bgcolor: '#4285F4', width: '5vw', height: '5vw', maxWidth: 52, maxHeight: 52 }}>
              <CloudIcon sx={{ color: '#fff', fontSize: '2.5vw' }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb="0.5vh">
                <Typography variant="h6" fontWeight={700}>Google Drive</Typography>
                {status.connected ? (
                  <Chip icon={<CheckCircleIcon />} label={t('dashboard.integrations.connected')} color="success" size="small" sx={{ fontWeight: 600 }} />
                ) : (
                  <Chip label={t('dashboard.integrations.not_connected')} size="small" variant="outlined" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.integrations.drive_desc')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mt: '1.5vh' }}>{error}</Alert>
              )}

              {!organization?.id && (
                <Alert severity="warning" sx={{ mt: '1.5vh' }}>
                  {t('dashboard.integrations.drive_select_org')}
                </Alert>
              )}

              {status.connected && organization?.id && integrationLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: '1.5vh' }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">{t('dashboard.integrations.drive_loading_config')}</Typography>
                </Box>
              )}

              {status.connected && organization?.id && integration?.rootFolderId && (
                <>
                  <Divider sx={{ my: '2vh' }} />
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: '1vh' }}>
                    {t('dashboard.integrations.drive_org_folder')} {integration.rootFolderId}
                  </Typography>
                  <FileBrowser folderId={integration.rootFolderId} orgId={organization.id} title={t('dashboard.integrations.drive_venue_files')} t={t} />
                  {integration.menuFolderId && integration.menuFolderId !== integration.rootFolderId && (
                    <FileBrowser folderId={integration.menuFolderId} orgId={organization.id} title={t('dashboard.integrations.drive_menu_folder')} t={t} />
                  )}
                </>
              )}

              {status.connected && organization?.id && !integration?.rootFolderId && !integrationLoading && (
                <Alert severity="info" sx={{ mt: '1.5vh' }}>
                  {t('dashboard.integrations.drive_no_folder_alert')}
                </Alert>
              )}
            </Box>
          </Stack>
        </CardContent>
        <CardActions sx={{ px: '2vw', pb: '2vh' }}>
          {status.connected ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                size="small"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={() => setDisconnectConfirm(true)}
              >
                {t('dashboard.integrations.drive_disconnect_btn')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={provisioning ? <CircularProgress size={14} color="inherit" /> : <FolderIcon />}
                onClick={handleProvision}
                disabled={provisioning}
              >
                {t('dashboard.integrations.drive_provision')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              size="small"
              startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : <CloudIcon />}
              onClick={() => setConnectDialogOpen(true)}
              disabled={connecting || !organization?.id}
            >
              {connecting ? t('dashboard.integrations.connecting') : t('dashboard.integrations.drive_connect_btn')}
            </Button>
          )}
        </CardActions>
      </Card>

      <ConnectDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onConnect={handleConnect}
        t={t}
      />

      {/* Disconnect confirm */}
      <Dialog open={disconnectConfirm} onClose={() => setDisconnectConfirm(false)} maxWidth="xs">
        <DialogTitle>{t('dashboard.integrations.drive_disconnect_title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.integrations.drive_disconnect_desc')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectConfirm(false)}>{t('dashboard.integrations.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => { disconnect(); setDisconnectConfirm(false); }}>
            {t('dashboard.integrations.disconnect')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
