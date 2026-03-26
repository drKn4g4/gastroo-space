'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import LunchDiningOutlinedIcon from '@mui/icons-material/LunchDiningOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import { collection, getDocs } from 'firebase/firestore';
import type { Restaurant } from '@/types/organization';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import SpacePageContainer from './SpacePageContainer';
import { UI } from '@/styles/theme';
import { vmin } from '@/styles/units';

type RestaurantRecord = Restaurant & { organizationId?: string | null };

type FavoriteMenuItemDoc = {
  restaurantId: string;
  restaurantName?: string;
  menuItemId: string;
  menuItemName: string;
};

type LoyaltyEntry = {
  restaurantId: string;
  orgId?: string;
  points: number;
  totalEarned: number;
};

export default function FavoritesLoyaltyView({
  uid,
  restaurants,
  lang,
}: {
  uid: string;
  restaurants: Restaurant[];
  lang: string;
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const [activeTab, setActiveTab] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteMenuItems, setFavoriteMenuItems] = useState<FavoriteMenuItemDoc[]>([]);
  const [loyaltyEntries, setLoyaltyEntries] = useState<LoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [favoritesSnap, favoriteItemsSnap, loyaltySnap] = await Promise.all([
          getDocs(collection(db, `users/${uid}/favoriteRestaurants`)),
          getDocs(collection(db, `users/${uid}/favoriteMenuItems`)),
          getDocs(collection(db, `users/${uid}/loyaltyPoints`)),
        ]);
        if (cancelled) return;

        setFavoriteIds(
          favoritesSnap.docs
            .map((entry) => {
              const data = entry.data() as { restaurantId?: string };
              return data.restaurantId ?? entry.id;
            })
            .filter((v): v is string => Boolean(v)),
        );
        setFavoriteMenuItems(favoriteItemsSnap.docs.map((entry) => entry.data() as FavoriteMenuItemDoc));

        const entries: LoyaltyEntry[] = loyaltySnap.docs.map((entry) => {
          const data = entry.data() as { points?: number; totalEarned?: number; restaurantId?: string; orgId?: string };
          return {
            restaurantId: data.restaurantId ?? entry.id,
            orgId: data.orgId,
            points: typeof data.points === 'number' ? data.points : 0,
            totalEarned: typeof data.totalEarned === 'number' ? data.totalEarned : 0,
          };
        });
        entries.sort((a, b) => b.points - a.points);
        setLoyaltyEntries(entries);
      } catch {
        if (!cancelled) {
          setFavoriteIds([]);
          setFavoriteMenuItems([]);
          setLoyaltyEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [uid]);

  const restaurantRecords = restaurants as RestaurantRecord[];

  const restaurantById = useMemo(() => {
    const map = new Map<string, RestaurantRecord>();
    restaurantRecords.forEach((r) => map.set(r.id, r));
    return map;
  }, [restaurantRecords]);

  const favoriteRestaurants = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return restaurantRecords.filter((r) => favoriteSet.has(r.id));
  }, [favoriteIds, restaurantRecords]);

  const pointsMap = useMemo(() => {
    const m: Record<string, number> = {};
    loyaltyEntries.forEach((e) => { m[e.restaurantId] = e.points; });
    return m;
  }, [loyaltyEntries]);

  const totalPoints = useMemo(() => loyaltyEntries.reduce((sum, e) => sum + e.points, 0), [loyaltyEntries]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <SpacePageContainer>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
          {t('dashboard.favorites.title')}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.625rem' }}
        >
          {t('dashboard.favorites.subtitle')}
        </Typography>
      </Box>

      {/* Points Summary */}
      <Card variant="outlined" sx={{ borderRadius: UI.radius.xl, textAlign: 'center' }}>
        <CardContent sx={{ py: 3 }}>
          <Stack spacing={0.5} alignItems="center">
            <EmojiEventsOutlinedIcon sx={{ color: 'primary.main', fontSize: '2rem' }} />
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{totalPoints}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
              {t('dashboard.profile.total_points')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          mb: 2,
          '& .MuiTab-root': { textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.05em' },
        }}
      >
        <Tab
          icon={<EmojiEventsOutlinedIcon sx={{ fontSize: '1rem' }} />}
          iconPosition="start"
          label={t('dashboard.favorites.tab_points')}
        />
        <Tab
          icon={<FavoriteOutlinedIcon sx={{ fontSize: '1rem' }} />}
          iconPosition="start"
          label={t('dashboard.favorites.tab_venues')}
        />
        <Tab
          icon={<LunchDiningOutlinedIcon sx={{ fontSize: '1rem' }} />}
          iconPosition="start"
          label={t('dashboard.favorites.tab_dishes')}
        />
      </Tabs>

      {/* Loyalty points per restaurant tab */}
      {activeTab === 0 && (
        <Stack spacing={1.5}>
          {loyaltyEntries.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('dashboard.loyalty.empty_hint')}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            loyaltyEntries.map((entry) => {
              const restaurant = restaurantById.get(entry.restaurantId);
              const name = restaurant?.name ?? entry.restaurantId;
              const address = restaurant
                ? [restaurant.address?.street, restaurant.address?.city].filter(Boolean).join(', ')
                : undefined;
              const maxEarned = Math.max(...loyaltyEntries.map((e) => e.totalEarned), 1);
              const progress = (entry.totalEarned / maxEarned) * 100;

              return (
                <Card key={entry.restaurantId} variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                          {name}
                        </Typography>
                        {address && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {address}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        icon={<StarOutlineIcon />}
                        size="small"
                        color="primary"
                        label={`${entry.points} pkt`}
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                      />
                    </Stack>

                    <Box sx={{ mt: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {t('dashboard.favorites.total_earned')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                          {entry.totalEarned}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: vmin(6),
                          borderRadius: vmin(3),
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { borderRadius: vmin(3) },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      )}

      {/* Favorite restaurants tab */}
      {activeTab === 1 && (
        <Stack spacing={1.5}>
          {favoriteRestaurants.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('dashboard.favorites.empty_hint')}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            favoriteRestaurants.map((restaurant) => (
              <Card key={restaurant.id} variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{restaurant.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[restaurant.address?.street, restaurant.address?.city].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                    <Chip
                      icon={<StarOutlineIcon />}
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${pointsMap[restaurant.id] ?? 0} pkt`}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {/* Favorite dishes tab */}
      {activeTab === 2 && (
        <Stack spacing={1.5}>
          {favoriteMenuItems.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('dashboard.profile.no_favorite_dishes')}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            favoriteMenuItems.map((item) => (
              <Card key={`${item.restaurantId}:${item.menuItemId}`} variant="outlined" sx={{ borderRadius: UI.radius.xl }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.menuItemName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.restaurantName ?? item.restaurantId}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}
    </SpacePageContainer>
  );
}
