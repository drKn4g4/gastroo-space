'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

interface ErrorFallbackProps {
    error: Error | null;
    onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
    const params = useParams<{ lang: string }>();
    const lang = params?.lang ?? 'en';
    const { t } = useTranslation(lang, 'common');

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
                p: 3,
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    maxWidth: 600,
                    textAlign: 'center',
                }}
            >
                <ErrorOutlineIcon
                    sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
                />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {t('errors.something_went_wrong')}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('errors.unexpected_error')}
                </Typography>
                {process.env.NODE_ENV === 'development' && error && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            mb: 3,
                            textAlign: 'left',
                            bgcolor: 'grey.100',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            overflowX: 'auto',
                        }}
                    >
                        <Typography variant="caption" component="pre">
                            {error.toString()}
                            {error.stack && `\n${error.stack}`}
                        </Typography>
                    </Paper>
                )}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                    >
                        {t('errors.refresh_page')}
                    </Button>
                    <Button variant="outlined" onClick={onReset}>
                        {t('errors.try_again')}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
