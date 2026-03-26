'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { collectionGroup, documentId, getDocs, limit, query, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { useOrganization } from '../../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import SearchResultDetailsDialog from '../../components/SearchResultDetailsDialog';
import type { SearchResult } from '../../components/search.types';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function PromotionDetailsPage() {
  const { user, loading } = useAuth();
  const { organization } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string; promotionId?: string }>();
  const lang = params?.lang ?? 'pl';
  const promotionId = params?.promotionId ?? '';
  const { t } = useTranslation(lang, 'dashboard');

  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organization?.id || !promotionId) { setFetching(false); return; }
      setFetching(true);
      try {
        const snap = await getDocs(
          query(
            collectionGroup(db, 'promotions'),
            where('organizationId', '==', organization.id),
            where(documentId(), '==', promotionId),
            limit(1),
          ),
        );
        if (cancelled) return;
        const docSnap = snap.docs[0];
        if (!docSnap) {
          setSelected(null);
          return;
        }
        const data = docSnap.data();
        setSelected({
          id: docSnap.id,
          type: 'promotion',
          title: String(data.name || data.title || '—'),
          subtitle: String(data.description || ''),
          meta: data.status ? String(data.status) : undefined,
          raw: data as Record<string, unknown>,
        });
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [organization?.id, promotionId]);

  const title = useMemo(() => {
    return selected?.title ?? promotionId;
  }, [selected, promotionId]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetching) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selected) {
    return (
      <PageContainer>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t('dashboard.search.promotions', { defaultValue: 'Promocje' })}
        </Typography>
        <Typography color="text.secondary">Not found: {promotionId}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
        {t('dashboard.search.type.promotion', { defaultValue: 'Promocja' })} · {title}
      </Typography>
      <SearchResultDetailsDialog
        open
        result={selected}
        onClose={() => router.push(`/${lang}/dashboard/promotions`)}
        t={t}
      />
    </PageContainer>
  );
}
