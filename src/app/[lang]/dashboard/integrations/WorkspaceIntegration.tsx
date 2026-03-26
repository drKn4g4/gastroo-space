// src/app/[lang]/dashboard/integrations/WorkspaceIntegration.tsx
'use client';

import React, { useCallback, useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, Button, Chip, Stack,
  Alert, CircularProgress, Avatar, Box, Divider, List, ListItem, ListItemText,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import GridViewIcon from '@mui/icons-material/GridView';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useWorkspaceIntegration, WorkspaceSheetInfo, WorkspaceDocInfo } from '@/lib/hooks/useWorkspaceIntegration';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

export default function WorkspaceIntegration() {
  const theme = useTheme();
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const { organization } = useOrganization();
  const {
    status, loading, connecting, error,
    connect, disconnect, createSheet, createDoc, getTodos,
  } = useWorkspaceIntegration();

  const [sheetInfo, setSheetInfo] = useState<WorkspaceSheetInfo | null>(null);
  const [docInfo, setDocInfo] = useState<WorkspaceDocInfo | null>(null);
  const [todos, setTodos] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleCreateSheet = useCallback(async () => {
    if (!organization?.id) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const info = await createSheet(organization.id, `Gastroo – ${organization.name ?? organization.id}`);
      setSheetInfo(info);
      setActionMessage(t('dashboard.integrations.ws_sheet_created'));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('dashboard.integrations.ws_sheet_error'));
    } finally {
      setActionLoading(false);
    }
  }, [organization, createSheet]);

  const handleCreateDoc = useCallback(async () => {
    if (!organization?.id) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const info = await createDoc(organization.id, `Notatki – ${organization.name ?? organization.id}`);
      setDocInfo(info);
      setActionMessage(t('dashboard.integrations.ws_doc_created'));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('dashboard.integrations.ws_doc_error'));
    } finally {
      setActionLoading(false);
    }
  }, [organization, createDoc]);

  const handleGetTodos = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const items = await getTodos();
      setTodos(items);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('dashboard.integrations.ws_tasks_error'));
    } finally {
      setActionLoading(false);
    }
  }, [getTodos]);

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
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Avatar sx={{ bgcolor: '#1a73e8', width: 44, height: 44 }}>
            <GridViewIcon fontSize="small" />
          </Avatar>
          <Box flex={1}>
            <Typography fontWeight={700} variant="subtitle1">
              Google Workspace
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.integrations.ws_subtitle')}
            </Typography>
          </Box>
          <Chip
            icon={status.connected ? <CheckCircleIcon fontSize="small" /> : undefined}
            label={status.connected ? t('dashboard.integrations.connected') : t('dashboard.integrations.not_connected')}
            color={status.connected ? 'success' : 'default'}
            size="small"
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}
        {actionMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {actionMessage}
          </Alert>
        )}

        {status.connected && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" mb={1}>
              {t('dashboard.integrations.ws_available_actions')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={handleCreateSheet}
                disabled={actionLoading}
              >
                {t('dashboard.integrations.ws_new_sheet')}
              </Button>
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={handleCreateDoc}
                disabled={actionLoading}
              >
                {t('dashboard.integrations.ws_new_doc')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleGetTodos}
                disabled={actionLoading}
              >
                {t('dashboard.integrations.ws_show_tasks')}
              </Button>
            </Stack>

            {sheetInfo && (
              <Alert
                severity="info"
                sx={{ mt: 2 }}
                action={
                  <Button
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    href={sheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('dashboard.integrations.open')}
                  </Button>
                }
              >
                {sheetInfo.title}
              </Alert>
            )}

            {docInfo && (
              <Alert
                severity="info"
                sx={{ mt: 2 }}
                action={
                  <Button
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    href={docInfo.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('dashboard.integrations.open')}
                  </Button>
                }
              >
                {docInfo.title}
              </Alert>
            )}

            {todos.length > 0 && (
              <Box mt={2}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  {t('dashboard.integrations.ws_tasks_title').replace('{{count}}', String(todos.length))}
                </Typography>
                <List dense disablePadding>
                  {todos.map((t) => (
                    <ListItem key={t.id} disableGutters>
                      <ListItemText
                        primary={t.title}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'text.disabled' : 'text.primary' },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        {status.connected ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<LinkOffIcon />}
            onClick={() => disconnect()}
          >
            {t('dashboard.integrations.ws_disconnect')}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            onClick={connect}
            disabled={connecting}
            startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {connecting ? t('dashboard.integrations.connecting') : t('dashboard.integrations.ws_connect')}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
