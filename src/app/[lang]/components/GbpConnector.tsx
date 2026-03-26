// src/app/[lang]/components/GbpConnector.tsx
'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Alert,
    CircularProgress,
    Stack
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNotification } from './Notification';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

interface GbpConnectorProps {
    onConnect: () => void;
    isConnected?: boolean;
}

export default function GbpConnector({ onConnect, isConnected = false }: GbpConnectorProps) {
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const params = useParams();
    const lang = (params?.lang as string) || 'pl';
    const { t } = useTranslation(lang, 'dashboard');

    const handleConnect = async () => {
        setLoading(true);
        try {
            // Simulate OAuth flow - in production, this would redirect to Google OAuth
            await new Promise((resolve) => setTimeout(resolve, 2000));
            showNotification(t('gbp_connector.notify_connected'), 'success');
            onConnect();
        } catch {
            showNotification(t('gbp_connector.notify_error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isConnected) {
        return (
            <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <CheckCircleIcon color="success" fontSize="large" />
                    <Box>
                        <Typography variant="h5" gutterBottom>
                            {t('gbp_connector.connected_title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('gbp_connector.connected_desc')}
                        </Typography>
                    </Box>
                </Stack>
                <Alert severity="success">
                    {t('gbp_connector.profile_active_alert')}
                </Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                {t('gbp_connector.connect_title')}
            </Typography>
            <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('gbp_connector.connect_info')}
                </Alert>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" dangerouslySetInnerHTML={{ __html: t('gbp_connector.demo_warning') }} />
                </Alert>
                <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
                    onClick={handleConnect}
                    disabled={loading}
                    size="large"
                >
                    {loading ? t('gbp_connector.connecting') : t('gbp_connector.connect_button')}
                </Button>
            </Box>
        </Paper>
    );
}