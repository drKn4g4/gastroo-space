'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { collection, doc, deleteDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import type { Restaurant } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import { format, addDays } from 'date-fns';

type RestaurantRecord = Restaurant & {
  organizationId?: string | null;
};

interface MenuItemPreview {
  id: string;
  name: string;
  price: number;
  dietary?: { vegan?: boolean };
}

export default function RestaurantDetailView({
  uid,
  restaurant,
  lang,
  onClose,
}: {
  uid: string;
  restaurant: RestaurantRecord;
  lang: string;
  onClose: () => void;
}) {
  const { t } = useTranslation(lang, 'dashboard');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItemPreview[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('19:00');
  const [guestCount, setGuestCount] = useState('2');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  // Load favorite status, loyalty points, and menu items
  useEffect(() => {
    let cancelled = false;

    const loadRestaurantData = async () => {
      try {
        setMenuLoading(true);

        // Check if favorite
        try {
          const favSnap = await getDocs(collection(db, `users/${uid}/favoriteRestaurants`));
          if (!cancelled) {
            setIsFavorite(favSnap.docs.some((d) => d.id === restaurant.id));
          }
        } catch {
          if (!cancelled) setIsFavorite(false);
        }

        // Load loyalty points for this restaurant
        try {
          const loyaltySnap = await getDocs(
            query(collection(db, `users/${uid}/loyaltyPoints`), where('__name__', '==', restaurant.id)),
          );
          if (!cancelled && loyaltySnap.docs.length > 0) {
            const data = loyaltySnap.docs[0].data() as { points?: number };
            setLoyaltyPoints(typeof data.points === 'number' ? data.points : 0);
          }
        } catch {
          if (!cancelled) setLoyaltyPoints(0);
        }

        // Load menu items for this restaurant
        if (restaurant.organizationId) {
          const menuSnap = await getDocs(
            collection(
              db,
              `organizations/${restaurant.organizationId}/restaurants/${restaurant.id}/menuItems`,
            ),
          );
          if (!cancelled) {
            const items = menuSnap.docs
              .slice(0, 5)
              .map((d) => ({
                id: d.id,
                name: (d.data() as any).name ?? 'Unknown',
                price: (d.data() as any).price ?? 0,
                dietary: (d.data() as any).dietary,
              }));
            setMenuItems(items);
          }
        }
      } catch (error) {
        console.error('Failed to load restaurant data:', error);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    };

    void loadRestaurantData();

    return () => {
      cancelled = true;
    };
  }, [uid, restaurant.id, restaurant.organizationId]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await deleteDoc(doc(db, `users/${uid}/favoriteRestaurants/${restaurant.id}`));
      } else {
        await setDoc(
          doc(db, `users/${uid}/favoriteRestaurants/${restaurant.id}`),
          {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            organizationId: restaurant.organizationId ?? null,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleBooking = async () => {
    if (!guestName.trim()) {
      setBookingError(t('dashboard.detail.booking_error_name'));
      return;
    }

    if (!guestEmail.trim()) {
      setBookingError(t('dashboard.detail.booking_error_email'));
      return;
    }

    if (parseInt(guestCount, 10) < 1) {
      setBookingError(t('dashboard.detail.booking_error_guests'));
      return;
    }

    try {
      setBookingSubmitting(true);
      setBookingError('');

      const bookingRef = doc(collection(db, 'bookings'));
      await setDoc(bookingRef, {
        id: bookingRef.id,
        organizationId: restaurant.organizationId,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        userId: uid,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestCount: parseInt(guestCount, 10),
        bookingDate,
        bookingTime,
        notes: guestNotes.trim(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setBookingSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setBookingError(t('dashboard.detail.booking_error_failed'));
    } finally {
      setBookingSubmitting(false);
    }
  };

  const address = [restaurant.address?.street, restaurant.address?.postalCode, restaurant.address?.city]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {restaurant.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {address}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Info cards */}
          <Stack direction="row" spacing={1}>
            {loyaltyPoints > 0 && (
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('dashboard.detail.my_points')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {loyaltyPoints}
                  </Typography>
                </CardContent>
              </Card>
            )}
            <Button
              size="small"
              onClick={() => {
                void toggleFavorite();
              }}
              startIcon={isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              color={isFavorite ? 'error' : 'inherit'}
              variant="outlined"
            >
              {isFavorite ? 'Ulub.' : 'Ulub.'}
            </Button>
          </Stack>

          {/* Menu preview */}
          {menuLoading ? (
            <Box sx={{ py: 2, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            menuItems.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  {t('dashboard.detail.menu_preview')}
                </Typography>
                <Stack spacing={0.75}>
                  {menuItems.map((item) => (
                    <Card key={item.id} sx={{ borderRadius: '0.5rem' }}>
                      <CardContent sx={{ py: 0.75, px: 1.5, '&:last-child': { pb: 0.75 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {item.dietary?.vegan && <Chip label="vegan" size="small" variant="outlined" />}
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: '4ch', textAlign: 'right' }}>
                              {(item.price / 100).toFixed(2)} zł
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )
          )}

          {/* Booking form */}
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
              {t('dashboard.detail.booking_form')}
            </Typography>

            {bookingSuccess ? (
              <Box sx={{ py: 2, textAlign: 'center', color: 'success.main' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  ✓ {t('dashboard.detail.booking_confirmed')}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_date')}
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  inputProps={{ min: minDate, max: maxDate }}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_time')}
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_guests')}
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  inputProps={{ min: '1', max: '20' }}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_name')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_email')}
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                <TextField
                  size="small"
                  label={t('dashboard.detail.booking_notes')}
                  multiline
                  rows={2}
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  disabled={bookingSubmitting}
                  fullWidth
                />

                {bookingError && <Typography color="error.main" variant="caption">{bookingError}</Typography>}

                <Button
                  variant="contained"
                  onClick={() => {
                    void handleBooking();
                  }}
                  disabled={bookingSubmitting}
                  fullWidth
                >
                  {bookingSubmitting ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} /> 
                  ) : null}
                  {bookingSubmitting
                    ? t('dashboard.detail.booking_submitting')
                    : t('dashboard.detail.booking_submit')}
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
