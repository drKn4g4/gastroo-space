'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Typography,
    Slide,
    Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import AppleIcon from '@mui/icons-material/Apple';
import AndroidIcon from '@mui/icons-material/Android';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
    const params = useParams();
    const lang = (params?.lang as string) || 'pl';
    const { t } = useTranslation(lang, 'common');
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(ios);

        // Check if already dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

            // Show again after 7 days
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show prompt after 30 seconds
            setTimeout(() => {
                setShowInstallPrompt(true);
            }, 30000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallPrompt(false);
        }

        setDeferredPrompt(null);
    };

    const handleClose = () => {
        setShowInstallPrompt(false);
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    };

    if (isInstalled || !showInstallPrompt) {
        return null;
    }

    return (
        <Slide direction="up" in={showInstallPrompt}>
            <Paper
                elevation={6}
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    right: 16,
                    p: 2,
                    zIndex: 1300,
                    maxWidth: 600,
                    mx: 'auto',
                }}
            >
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            {isIOS ? (
                                <AppleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            ) : (
                                <AndroidIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            )}
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {t('pwa.install_title')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('pwa.install_subtitle')}
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {isIOS ? (
                        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2">
                                {t('pwa.ios_instructions')}
                            </Typography>
                            <Typography variant="body2" component="ol" sx={{ pl: 2, mt: 1 }}>
                                <li>{t('pwa.ios_step1_prefix')} <Box component="span" sx={{ fontWeight: 600 }}>⎙</Box></li>
                                <li>{t('pwa.ios_step2_prefix')} <Box component="span" sx={{ fontWeight: 600 }}>"{t('pwa.ios_step2_action')}"</Box></li>
                                <li>{t('pwa.ios_step3_prefix')} <Box component="span" sx={{ fontWeight: 600 }}>"{t('pwa.ios_step3_action')}"</Box></li>
                            </Typography>
                        </Box>
                    ) : (
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                startIcon={<GetAppIcon />}
                                onClick={handleInstallClick}
                                fullWidth
                            >
                                {t('pwa.install_now')}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleClose}
                            >
                                {t('pwa.later')}
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Slide>
    );
}
