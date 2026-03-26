'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import PageContainer from '@/app/[lang]/components/PageContainer';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; exists: boolean; data?: Record<string, unknown> }
  | { status: 'error'; message: string };

function formatScalar(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toLocaleString();
  if (value instanceof Timestamp) return value.toDate().toLocaleString();
  return null;
}

function formatValue(value: unknown): string | null {
  const scalar = formatScalar(value);
  if (scalar != null) return scalar;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const scalars = value.map((v) => formatScalar(v)).filter((v): v is string => Boolean(v));
    if (scalars.length === value.length) return scalars.join(', ');
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return null;
    }
  }
  return null;
}

function KeyValue({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.02em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 650, textAlign: 'right', whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function FirestoreDocDetails({
  title,
  docPath,
  t,
}: {
  title: string;
  docPath: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang ?? 'pl';

  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!docPath) return;
      setState({ status: 'loading' });
      try {
        const snap = await getDoc(doc(db, docPath));
        if (cancelled) return;
        if (!snap.exists()) {
          setState({ status: 'ready', exists: false });
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        setState({ status: 'ready', exists: true, data });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!cancelled) setState({ status: 'error', message });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [docPath]);

  const sortedEntries = useMemo(() => {
    if (state.status !== 'ready' || !state.exists || !state.data) return [];
    return Object.entries(state.data).sort(([a], [b]) => a.localeCompare(b));
  }, [state]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!docPath) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.search.no_results', { defaultValue: 'Brak wyników' })}</Typography>
      </PageContainer>
    );
  }

  if (state.status === 'loading') {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <PageContainer sx={{ gap: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{t('dashboard.error', { defaultValue: 'Błąd' })}: {state.message}</Typography>
        <Box>
          <Button size="small" variant="outlined" onClick={() => router.back()}>
            {t('dashboard.back', { defaultValue: 'Wstecz' })}
          </Button>
        </Box>
      </PageContainer>
    );
  }

  if (!state.exists) {
    return (
      <PageContainer sx={{ gap: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">Not found</Typography>
        <Box>
          <Button size="small" variant="outlined" onClick={() => router.back()}>
            {t('dashboard.back', { defaultValue: 'Wstecz' })}
          </Button>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
            {docPath}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => router.back()}>
          {t('dashboard.back', { defaultValue: 'Wstecz' })}
        </Button>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          {sortedEntries.length === 0 ? (
            <Typography color="text.secondary">—</Typography>
          ) : (
            <Stack spacing={1}>
              {sortedEntries.map(([k, v], idx) => (
                <Box key={k}>
                  {idx > 0 ? <Divider sx={{ my: 1 }} /> : null}
                  <KeyValue label={k} value={formatValue(v)} />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
