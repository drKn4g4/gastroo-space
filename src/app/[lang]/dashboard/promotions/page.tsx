'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useAuth } from '../../providers/AuthProvider';
import { useOrganization } from '../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import SearchResultDetailsDialog from '../components/SearchResultDetailsDialog';
import type { SearchResult } from '../components/search.types';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function PromotionsPage() {
  const { user, loading } = useAuth();
  const { organization } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang ?? 'pl';
  const sp = useSearchParams();
  const focusId = sp?.get('promotionId');
  const { t } = useTranslation(lang, 'dashboard');

  const [items, setItems] = useState<SearchResult[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organization?.id) { setFetching(false); setItems([]); return; }
      setFetching(true);
      try {
        const snap = await getDocs(
          query(
            collectionGroup(db, 'promotions'),
            where('organizationId', '==', organization.id),
            limit(250),
          ),
        );
        if (cancelled) return;
        setItems(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'promotion',
              title: (data.name || data.title || '—') as string,
              subtitle: (data.description || '') as string,
              meta: (data.status || undefined) as string | undefined,
              raw: data as Record<string, unknown>,
            } satisfies SearchResult;
          }),
        );
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [organization?.id]);

  useEffect(() => {
    if (!focusId) return;
    const found = items.find((i) => i.id === focusId);
    if (!found) return;
    setSelected(found);
    setDetailsOpen(true);
  }, [focusId, items]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.title.localeCompare(b.title, lang));
  }, [items, lang]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <LocalOfferOutlinedIcon color="success" />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {t('dashboard.search.promotions')}
        </Typography>
      </Stack>

      {fetching ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={24} />
        </Box>
      ) : sorted.length === 0 ? (
        <Typography color="text.secondary">
          {t('dashboard.search.no_results')}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {sorted.map((p) => (
            <Card
              key={p.id}
              variant="outlined"
              onClick={() => { setSelected(p); setDetailsOpen(true); }}
              sx={{
                cursor: 'pointer',
                borderColor: focusId === p.id ? 'success.main' : undefined,
                '&:hover': { borderColor: 'success.light' },
              }}
              data-promotion-id={p.id}
            >
              <CardContent sx={{ pb: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }} noWrap>
                  {p.title}
                </Typography>
                {p.subtitle ? (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {p.subtitle}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <SearchResultDetailsDialog
        open={detailsOpen}
        result={selected}
        onClose={() => setDetailsOpen(false)}
        t={t}
      />
    </PageContainer>
  );
}
