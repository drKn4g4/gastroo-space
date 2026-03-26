'use client';

import {
  Box, Typography, Stack, Chip, Card, CardContent, Avatar, Tabs, Tab, Divider,
  TextField, Button, CircularProgress, Alert,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { vmin } from '@/styles/units';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useApiClient } from '@/lib/hooks/useApiClient';
import { PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';

const MESSAGES = [
  { author: 'Tomek B.', time: '12:41', text: 'Kuchnia potwierdza — dziś bez zupy dnia.', me: false },
  { author: 'Anna K.',  time: '12:38', text: 'Stolik 7 pyta o czas oczekiwania na stek.', me: false },
  { author: 'Ja',       time: '12:35', text: 'Ok, zaktualizowałem menu na dziś.', me: true  },
  { author: 'Marek W.', time: '12:30', text: 'Mamy braki w konfiturze — wchodzi surówka z buraka.', me: false },
];

const INCIDENTS = [
  { id: 'INC-03', title: 'Uszkodzona lodówka bar #2',      severity: 'high',   status: 'open',   reporter: 'Tomek B.', time: '11:20' },
  { id: 'INC-02', title: 'Gość zgłosił alergen w daniu',   severity: 'medium', status: 'review', reporter: 'Anna K.',  time: '09:45' },
  { id: 'INC-01', title: 'Zepsuta drukarka paragonów',      severity: 'low',    status: 'closed', reporter: 'Zofia P.', time: '08:10' },
];

const SEV_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  high: 'error', medium: 'warning', low: 'default',
};

export function ChatPageClient() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');
  const { organization, hasPermission } = useOrganization();
  const { apiCall } = useApiClient();
  const [tab, setTab] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  const canManageIntegrations = hasPermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const canSendChat = hasPermission(PERMISSIONS.CHAT_SEND);

  useEffect(() => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoadingConfig(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoadingConfig(true);
      const res = await apiCall<{ configured: boolean; webhookUrl: string | null }>(`/api/google-chat/webhook?orgId=${orgId}`);
      if (!active) return;

      if (res.ok && res.data) {
        setConfigured(Boolean(res.data.configured));
        setWebhookUrl(res.data.webhookUrl ?? '');
      }
      setLoadingConfig(false);
    };

    load();
    return () => { active = false; };
  }, [apiCall, organization?.id]);

  const saveWebhook = async () => {
    const orgId = organization?.id;
    if (!orgId || !webhookUrl.trim()) return;

    setSavingConfig(true);
    setStatusInfo(null);
    try {
      const res = await apiCall(`/api/google-chat/webhook`, {
        method: 'PATCH',
        data: { orgId, webhookUrl: webhookUrl.trim() },
      });
      if (res.ok) {
        setConfigured(true);
        setStatusInfo(t('dashboard.chat.webhook_saved'));
      } else {
        setStatusInfo(res.error || t('dashboard.chat.webhook_save_error'));
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const sendToGoogleChat = async () => {
    const orgId = organization?.id;
    if (!orgId || !message.trim()) return;

    setSending(true);
    setStatusInfo(null);
    try {
      const res = await apiCall(`/api/google-chat/webhook`, {
        method: 'POST',
        data: { orgId, text: message.trim() },
      });
      if (res.ok) {
        setMessage('');
        setStatusInfo(t('dashboard.chat.message_sent'));
      } else {
        setStatusInfo(res.error || t('dashboard.chat.message_send_error'));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <ChatIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">{t('dashboard.chat.title')}</Typography>
        <Chip label="Mockup" size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: 11 }} />
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}>
        <Tab label={`💬 ${t('dashboard.chat.tab_team_chat')}`} />
        <Tab label={`⚠️ ${t('dashboard.chat.tab_incidents')}`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack spacing={0} divider={<Divider />}>
                {[...MESSAGES].reverse().map((m, i) => (
                  <Stack
                    key={i}
                    direction={m.me ? 'row-reverse' : 'row'}
                    alignItems="flex-start"
                    spacing={1.25}
                    sx={{ p: 1.5 }}
                  >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: m.me ? 'primary.main' : 'secondary.main', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {m.author[0]}
                    </Avatar>
                    <Box sx={{ maxWidth: '75%' }}>
                      <Stack direction={m.me ? 'row-reverse' : 'row'} spacing={0.75} alignItems="baseline" mb={0.25}>
                        <Typography variant="caption" fontWeight={700}>{m.author}</Typography>
                        <Typography variant="caption" color="text.disabled">{m.time}</Typography>
                      </Stack>
                      <Box
                        sx={{
                          bgcolor: m.me ? 'primary.main' : 'action.hover',
                          color: m.me ? 'primary.contrastText' : 'text.primary',
                          px: 1.5, py: 0.75,
                          borderRadius: m.me
                            ? `${vmin(12)} ${vmin(12)} ${vmin(4)} ${vmin(12)}`
                            : `${vmin(12)} ${vmin(12)} ${vmin(12)} ${vmin(4)}`,
                        }}
                      >
                        <Typography variant="body2" fontSize="0.82rem">{m.text}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" fontWeight={700}>Google Chat</Typography>
                {loadingConfig ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : (
                  <>
                    <Chip
                      label={configured ? t('dashboard.chat.webhook_connected') : t('dashboard.chat.webhook_missing')}
                      color={configured ? 'success' : 'warning'}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                    {canManageIntegrations && (
                      <>
                        <TextField
                          label="Google Chat webhook URL"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://chat.googleapis.com/v1/spaces/..."
                          size="small"
                          fullWidth
                        />
                        <Button variant="outlined" onClick={saveWebhook} disabled={savingConfig || !webhookUrl.trim()}>
                          {savingConfig ? <CircularProgress size={18} /> : t('dashboard.chat.save_webhook')}
                        </Button>
                      </>
                    )}

                    <TextField
                      label={t('dashboard.chat.send_message_label')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={sendToGoogleChat}
                      disabled={!configured || sending || !message.trim() || !canSendChat}
                    >
                      {sending ? <CircularProgress size={18} /> : t('dashboard.chat.send_btn')}
                    </Button>
                    {!canSendChat && (
                      <Alert severity="warning">{t('dashboard.chat.no_send_permission')}</Alert>
                    )}
                  </>
                )}
                {statusInfo && <Alert severity="info">{statusInfo}</Alert>}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={1}>
          {INCIDENTS.map((inc) => (
            <Card key={inc.id} variant="outlined" sx={{ borderColor: inc.severity === 'high' && inc.status !== 'closed' ? 'error.main' : 'divider' }}>
              <CardContent sx={{ py: 1.25, px: 2, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {inc.status === 'closed'
                      ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      : <WarningAmberIcon sx={{ fontSize: 18, color: inc.severity === 'high' ? 'error.main' : 'warning.main' }} />
                    }
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{inc.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inc.id} · {inc.reporter} · {inc.time}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={inc.status === 'closed' ? t('dashboard.chat.status_closed') : inc.status === 'review' ? t('dashboard.chat.status_review') : t('dashboard.chat.status_open')}
                    size="small"
                    color={inc.status === 'closed' ? 'success' : SEV_COLOR[inc.severity]}
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.disabled" textAlign="center">
        {t('dashboard.chat.coming_soon')}
      </Typography>
    </Box>
  );
}
