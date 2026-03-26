'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography, InputBase, Paper } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import type { Restaurant } from '@/types/organization';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import SearchIcon from '@mui/icons-material/Search';
import PageContainer from '@/app/[lang]/components/PageContainer';

type RestaurantRecord = Restaurant & {
  organizationId?: string | null;
  tableCount?: number;
  tags?: string[];
};

type PromotionRecord = {
  id: string;
  organizationId?: string;
  name?: string;
  description?: string;
  status?: string;
  type?: string;
  discountPercentage?: number;
  fixedPrice?: { amount?: number; currency?: string };
  discountAmount?: { amount?: number; currency?: string };
};

interface StartEntry {
  restaurant: RestaurantRecord;
  distanceKm: number;
  score: number;
}

const FALLBACK_ORIGIN = { lat: 52.2297, lng: 21.0122 };

function getTableCount(restaurant: RestaurantRecord): number {
  return typeof restaurant.tableCount === 'number' ? restaurant.tableCount : 0;
}

function calcDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function hashScore(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}

function formatPromotionValue(promotion: PromotionRecord): string | null {
  if (typeof promotion.discountPercentage === 'number') return `-${promotion.discountPercentage}%`;
  if (typeof promotion.fixedPrice?.amount === 'number') return `${(promotion.fixedPrice.amount / 100).toFixed(2)} ${promotion.fixedPrice.currency ?? 'PLN'}`;
  if (typeof promotion.discountAmount?.amount === 'number') return `-${(promotion.discountAmount.amount / 100).toFixed(2)} ${promotion.discountAmount.currency ?? 'PLN'}`;
  return null;
}

export default function DiscoverStartView({
  uid,
  restaurants,
  lang,
  loading = false,
  profile,
}: {
  uid: string;
  restaurants: Restaurant[];
  lang: string;
  loading?: boolean;
  profile?: { name?: string };
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setOrigin(FALLBACK_ORIGIN);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConsumerMeta = async () => {
      try {
        setMetaLoading(true);
        const [favoritesSnap, promotionsSnap] = await Promise.all([
          getDocs(collection(db, `users/${uid}/favoriteRestaurants`)),
          getDocs(collectionGroup(db, 'promotions')),
        ]);

        if (cancelled) return;

        setFavoriteIds(
          favoritesSnap.docs
            .map((entry) => {
              const data = entry.data() as { restaurantId?: string };
              return data.restaurantId ?? entry.id;
            })
            .filter((value): value is string => Boolean(value)),
        );

        setPromotions(
          promotionsSnap.docs
            .map((entry) => {
              const data = entry.data();
              return { ...data, id: entry.id } as PromotionRecord;
            })
            .filter((entry) => entry.status === 'active' || entry.status === 'scheduled'),
        );
      } catch {
        if (!cancelled) {
          setFavoriteIds([]);
          setPromotions([]);
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };

    void loadConsumerMeta();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const records = restaurants as RestaurantRecord[];

  const entries = useMemo<StartEntry[]>(() => {
    return records
      .map((restaurant) => {
        const distanceKm = restaurant.location
          ? calcDistanceKm(origin, restaurant.location)
          : Number.POSITIVE_INFINITY;
        const score = hashScore(`${restaurant.id}:${restaurant.name}`);
        return { restaurant, distanceKm, score };
      })
      .sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name, lang));
  }, [records, origin, lang]);

  const favoriteRestaurantMap = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return new Map(
      records
        .filter((restaurant) => favoriteSet.has(restaurant.id))
        .map((restaurant) => [restaurant.organizationId ?? restaurant.id, restaurant] as const),
    );
  }, [favoriteIds, records]);

  const favoritePromotions = useMemo(() => {
    return promotions
      .map((promotion) => {
        const restaurant = favoriteRestaurantMap.get(promotion.organizationId ?? '');
        if (!restaurant) return null;
        return { promotion, restaurant };
      })
      .filter((entry): entry is { promotion: PromotionRecord; restaurant: RestaurantRecord } => Boolean(entry))
      .slice(0, 6);
  }, [favoriteRestaurantMap, promotions]);

  const nearbyPopular = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const leftFinite = Number.isFinite(a.distanceKm);
        const rightFinite = Number.isFinite(b.distanceKm);
        if (leftFinite && rightFinite && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        if (leftFinite !== rightFinite) return leftFinite ? -1 : 1;
        return getTableCount(b.restaurant) - getTableCount(a.restaurant) || b.score - a.score;
      })
      .slice(0, 6);
  }, [entries]);

  const renderAddress = (restaurant: RestaurantRecord) => {
    return [restaurant.address?.street, restaurant.address?.postalCode, restaurant.address?.city]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: '-0.02em' }}>
        {t('dashboard.start.title')}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
        {profile?.name ? t('dashboard.start.greeting', { name: profile.name }) : t('dashboard.start.greeting_fallback')}
      </Typography>
      <Paper
        component="form"
        sx={{ mb: 2, p: '2px 8px', display: 'flex', alignItems: 'center', borderRadius: 3, boxShadow: 'none', bgcolor: 'background.default', border: (theme) => `1.5px solid ${theme.palette.divider}` }}
        elevation={0}
      >
        <SearchIcon sx={{ color: 'action.active', mr: 1, ml: 0.5 }} />
        <InputBase
          sx={{ ml: 1, flex: 1, fontSize: '1rem', fontWeight: 500 }}
          placeholder={t('dashboard.start.search_placeholder')}
          inputProps={{ 'aria-label': 'szukaj' }}
          disabled
        />
      </Paper>

      {(loading || metaLoading) && (
        <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && !metaLoading && (
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <FavoriteOutlinedIcon fontSize="small" color="error" />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t('dashboard.start.favorite_promotions', { defaultValue: 'Promocje z ulubionych lokali' })}
              </Typography>
            </Stack>
            {favoritePromotions.length === 0 ? (
              <Card sx={{ borderRadius: '0.875rem' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.start.no_favorite_promotions', {
                      defaultValue: 'Brak aktywnych promocji w ulubionych lokalach. Dodaj ulubione lub zajrzyj do mapy.',
                    })}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={1}>
                {favoritePromotions.map(({ promotion, restaurant }) => (
                  <Card key={`${promotion.id}:${restaurant.id}`} sx={{ borderRadius: '0.875rem' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {promotion.name ?? t('dashboard.start.promotion', { defaultValue: 'Promocja' })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {restaurant.name}
                          </Typography>
                          {promotion.description ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {promotion.description}
                            </Typography>
                          ) : null}
                        </Box>
                        <Stack spacing={0.75} alignItems="flex-end">
                          <Chip icon={<LocalOfferOutlinedIcon />} size="small" color="secondary" label={promotion.type ?? 'offer'} />
                          {formatPromotionValue(promotion) ? (
                            <Chip size="small" color="success" label={formatPromotionValue(promotion)} />
                          ) : null}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <NearMeOutlinedIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t('dashboard.start.nearby_popular', { defaultValue: 'Popularne lokale w pobliżu' })}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {nearbyPopular.map((item) => (
                <Card key={item.restaurant.id} sx={{ borderRadius: '0.875rem' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {item.restaurant.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {renderAddress(item.restaurant) || t('dashboard.start.no_address', { defaultValue: 'Brak adresu lokalu' })}
                        </Typography>
                        {!!item.restaurant.tags?.length && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                            {item.restaurant.tags.slice(0, 3).map((tag) => (
                              <Chip key={`${item.restaurant.id}:${tag}`} size="small" variant="outlined" label={tag} />
                            ))}
                          </Stack>
                        )}
                      </Box>
                      <Stack spacing={0.75} alignItems="flex-end">
                        {Number.isFinite(item.distanceKm) ? (
                          <Chip size="small" color="primary" label={`${item.distanceKm.toFixed(1)} km`} />
                        ) : null}
                        <Chip size="small" variant="outlined" label={`${getTableCount(item.restaurant)} stol.`} />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </PageContainer>
  );
}
