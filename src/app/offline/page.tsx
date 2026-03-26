'use client';

import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    window.location.reload();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
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
        <CloudOffIcon
          sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }}
        />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          No internet connection
          <Typography component="span" variant="h6" display="block" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
            Brak połączenia z internetem
          </Typography>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
          It looks like you don&apos;t have an internet connection.
          Check your connection and try again.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wygląda na to, że nie masz połączenia z internetem.
          Sprawdź swoje połączenie i spróbuj ponownie.
        </Typography>
        <Stack spacing={2} direction="row" justifyContent="center">
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size="large"
          >
            Try again / Spróbuj ponownie
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            size="large"
          >
            Go back / Wróć
          </Button>
        </Stack>
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            💡 Tip: Some features may be available offline thanks to cached data.
            Try refreshing the page once the connection is restored.
            <br />
            Wskazówka: Niektóre funkcje mogą być dostępne offline dzięki pamięci podręcznej.
            Spróbuj odświeżyć stronę, gdy połączenie zostanie przywrócone.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
