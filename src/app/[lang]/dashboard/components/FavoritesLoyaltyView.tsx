'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Restaurant } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';

/** Shape of `users/{uid}/loyaltyPoints/{restaurantId}` */
interface LoyaltyPointsDoc {
  points: number;
  totalEarned: number;
}

interface FavoriteRestaurantDoc {
  restaurantId: string;
  organizationId?: string | null;
}

interface FavoriteMenuItemDoc {
  restaurantId: string;
  restaurantName?: string;
  menuItemId: string;
  menuItemName: string;
}

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteMenuItems, setFavoriteMenuItems] = useState<FavoriteMenuItemDoc[]>([]);
  /** restaurantId → current points balance */
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});

  // ── Fetch favorite restaurants from Firestore ────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, `users/${uid}/favoriteRestaurants`));
        setFavorites(
          snap.docs
            .map((entry) => (entry.data() as Partial<FavoriteRestaurantDoc>).restaurantId ?? entry.id)
            .filter((value): value is string => Boolean(value)),
        );
      } catch {
        setFavorites([]);
      }
    };
    void run();
  }, [uid]);

  // ── Fetch favorite menu items from Firestore ─────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, `users/${uid}/favoriteMenuItems`));
        setFavoriteMenuItems(
          snap.docs.map((entry) => entry.data() as FavoriteMenuItemDoc),
        );
      } catch {
        setFavoriteMenuItems([]);
      }
    };
    void run();
  }, [uid]);

  // ── Fetch all loyalty points for this user from Firestore ─────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, `users/${uid}/loyaltyPoints`));
        const map: Record<string, number> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data() as Partial<LoyaltyPointsDoc>;
          map[doc.id] = typeof data.points === 'number' ? data.points : 0;
        });
        setPointsMap(map);
      } catch {
        setPointsMap({});
      }
    };
    void run();
  }, [uid]);

  const toggleFavorite = async (restaurantId: string) => {
    const next = favorites.includes(restaurantId)
      ? favorites.filter((id) => id !== restaurantId)
      : [...favorites, restaurantId];
    setFavorites(next);

    try {
      const restaurant = restaurants.find((entry) => entry.id === restaurantId);
      const organizationId = (restaurant as (Restaurant & { organizationId?: string | null }) | undefined)?.organizationId ?? null;
      const favoriteRef = doc(db, `users/${uid}/favoriteRestaurants/${restaurantId}`);

      if (next.includes(restaurantId)) {
        await setDoc(favoriteRef, {
          userId: uid,
          restaurantId,
          organizationId,
          restaurantName: restaurant?.name ?? restaurantId,
          updatedAt: new Date(),
        }, { merge: true });
      } else {
        await deleteDoc(favoriteRef);
      }
    } catch {
      setFavorites(favorites);
    }
  };

  const favSet = new Set(favorites);

  // Favorites first, then the rest
  const sorted = [
    ...restaurants.filter((r) => favSet.has(r.id)),
    ...restaurants.filter((r) => !favSet.has(r.id)),
  ];

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
        {t('dashboard.favorites.title', { defaultValue: 'Ulubione i lojalność' })}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('dashboard.favorites.subtitle', {
          defaultValue: 'Zbieraj punkty lojalnościowe w każdym lokalu i wymieniaj je na nagrody.',
        })}
      </Typography>

      {restaurants.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.favorites.no_restaurants', { defaultValue: 'Brak lokali do wyświetlenia.' })}
        </Typography>
      )}

      <Stack spacing={1}>
        {sorted.map((restaurant) => {
          const isFavorite = favSet.has(restaurant.id);
          const points = pointsMap[restaurant.id] ?? null;
          const address = [restaurant.address?.street, restaurant.address?.city]
            .filter(Boolean)
            .join(', ');

          return (
            <Card key={restaurant.id} sx={{ borderRadius: '0.875rem' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {/* Favorite toggle */}
                  <IconButton
                    size="small"
                    color={isFavorite ? 'error' : 'default'}
                    onClick={() => { void toggleFavorite(restaurant.id); }}
                    aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                  >
                    {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                  </IconButton>

                  {/* Name + address */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {restaurant.name}
                    </Typography>
                    {address ? (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {address}
                      </Typography>
                    ) : null}
                  </Box>

                  {/* Loyalty points badge */}
                  {points !== null && points > 0 ? (
                    <Chip
                      icon={<StarIcon sx={{ fontSize: '0.9rem !important' }} />}
                      label={`${points} pkt`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                      {t('dashboard.favorites.no_points', { defaultValue: '— pkt' })}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {restaurants.length > 0 && favSet.size === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {t('dashboard.favorites.empty_hint', {
            defaultValue: 'Stuknij serce przy lokalu, żeby dodać go do ulubionych.',
          })}
        </Typography>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          {t('dashboard.favorites.favorite_dishes', { defaultValue: 'Ulubione dania' })}
        </Typography>
        {favoriteMenuItems.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.favorites.no_favorite_dishes', { defaultValue: 'Brak zapisanych ulubionych dań.' })}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {favoriteMenuItems.map((item) => (
              <Card key={`${item.restaurantId}-${item.menuItemId}`} sx={{ borderRadius: '0.875rem' }}>
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <LunchDiningIcon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                        {item.menuItemName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.restaurantName ?? item.restaurantId}
                      </Typography>
                    </Box>
                    <Chip size="small" label={t('dashboard.favorites.favorite_badge', { defaultValue: 'Ulubione' })} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
