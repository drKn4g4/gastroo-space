'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Stack, Typography, Chip } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { useOrganization } from '../../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

type MenuItemDoc = {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  currencyCode?: string;
  categoryId?: string;
  visible?: boolean;
  archived?: boolean;
  itemType?: string;
  ingredientsList?: string;
};

export default function MenuItemDetailsPage() {
  const { user, loading } = useAuth();
  const { organization, currentRestaurant } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string; menuItemId?: string }>();
  const lang = params?.lang ?? 'pl';
  const menuItemId = params?.menuItemId ?? '';
  const { t } = useTranslation(lang, 'menu');

  const [fetching, setFetching] = useState(true);
  const [item, setItem] = useState<MenuItemDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organization?.id || !currentRestaurant?.id || !menuItemId) { setFetching(false); return; }
      setFetching(true);
      setNotFound(false);
      try {
        const snap = await getDoc(doc(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/menuItems/${menuItemId}`));
        if (cancelled) return;
        if (!snap.exists()) {
          setItem(null);
          setNotFound(true);
          return;
        }
        setItem(snap.data() as MenuItemDoc);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [organization?.id, currentRestaurant?.id, menuItemId]);

  const currency = useMemo(() => {
    return item?.currency ?? item?.currencyCode ?? 'PLN';
  }, [item]);

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

  if (notFound || !item) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('menu.no_results')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
            {item.name ?? menuItemId}
          </Typography>
          {item.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {item.description}
            </Typography>
          ) : null}
        </Box>
        <Typography sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>
          {typeof item.price === 'number' ? `${item.price.toFixed(2)} ${currency}` : `— ${currency}`}
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            {item.itemType ? <Chip label={t(`menu.types.${item.itemType}`, { defaultValue: item.itemType })} size="small" variant="outlined" /> : null}
            {item.categoryId ? <Typography variant="caption" color="text.secondary">categoryId: {item.categoryId}</Typography> : null}
            {item.archived ? <Chip label="archived" size="small" color="warning" /> : null}
            {item.visible === false ? <Chip label={t('menu.unavailable_chip', { defaultValue: 'Niedostępne' })} size="small" color="warning" /> : null}
            {item.ingredientsList ? (
              <Typography variant="body2" color="text.secondary">
                {item.ingredientsList}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
