'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    Grid,
    CircularProgress,
    useTheme,
    Divider,
    Avatar,
    Stack,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Tooltip,
} from '@mui/material';
import {
    Event,
    Person,
    Phone,
    Notes,
    Group,
    AccessTime,
    CalendarToday,
    Delete,
} from '@mui/icons-material';
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import { useNotification } from './Notification';
import { handleFirebaseError, logError } from '@/lib/utils/errorHandler';
import { validateBooking } from '@/lib/validation/bookingSchema';
import { vmin } from '@/styles/units';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';

// Removed TEST_DATA - use empty form on initialization

type Booking = {
    id: string;
    name: string;
    phone: string;
    guestCount: number;
    bookingDate: string;
    bookingTime: string;
    notes?: string;
    createdAt?: { toDate(): Date } | Date | null;
};

export default function ManualBookingForm() {
    const theme = useTheme();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const params = useParams();
    const lang = (params?.lang as string) || 'pl';
    const { t } = useTranslation(lang, 'dashboard');

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [guests, setGuests] = useState(1);
    const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('12:00');
    const [notes, setNotes] = useState('');

    // UI state
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Bookings state
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [fetching, setFetching] = useState(false);

    // Fetch bookings from Firestore
    const fetchBookings = useCallback(async () => {
        if (!user) return;

        setFetching(true);
        try {
            const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data: Booking[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            })) as Booking[];
            setBookings(data);
        } catch (error) {
            logError(error, 'fetchBookings');
            const errorInfo = handleFirebaseError(error);
            showNotification(errorInfo.message, 'error');
        } finally {
            setFetching(false);
        }
    }, [user, showNotification]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Add booking
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!user) {
            showNotification(t('manual_booking.must_be_logged_in'), 'error');
            return;
        }

        // Validate form data
        const formData = {
            name,
            phone,
            guestCount: Number(guests),
            bookingDate: date,
            bookingTime: time,
            notes,
        };

        const validation = validateBooking(formData);

        if (!validation.success) {
            const fieldErrors: Record<string, string> = {};
            validation.error.issues.forEach((err: { path: PropertyKey[]; message: string }) => {
                if (err.path[0]) {
                    fieldErrors[String(err.path[0])] = err.message;
                }
            });
            setErrors(fieldErrors);
            showNotification(t('manual_booking.fix_form_errors'), 'warning');
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            await addDoc(collection(db, 'bookings'), {
                ...validation.data,
                source: 'manual',
                userId: user.uid,
                createdAt: serverTimestamp(),
            });

            setName('');
            setPhone('');
            setGuests(1);
            setDate(new Date().toISOString().split('T')[0]);
            setTime('12:00');
            setNotes('');
            setSuccess(true);
            showNotification(t('manual_booking.booking_added'), 'success');
            setTimeout(() => setSuccess(false), 3000);
            fetchBookings();
        } catch (error) {
            logError(error, 'handleSubmit');
            const errorInfo = handleFirebaseError(error);
            showNotification(errorInfo.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Delete booking
    const handleDelete = async (id: string) => {
        if (!window.confirm(t('manual_booking.confirm_delete'))) return;

        try {
            await deleteDoc(doc(db, 'bookings', id));
            setBookings((prev) => prev.filter((b) => b.id !== id));
            showNotification(t('manual_booking.booking_deleted'), 'success');
        } catch (error) {
            logError(error, 'handleDelete');
            const errorInfo = handleFirebaseError(error);
            showNotification(errorInfo.message, 'error');
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 4,
                alignItems: 'flex-start',
                bgcolor: theme.palette.background.default,
                minHeight: '70vh',
                p: { xs: 1, md: 4 },
            }}
        >
            {/* FORM 70% */}
            <Box sx={{ flex: 7, maxWidth: 600 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                        <Event sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {t('manual_booking.add_new_booking')}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Box component="form" onSubmit={handleSubmit} autoComplete="off">
                        <Grid container spacing={3}>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_name')}
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                                    }}
                                    fullWidth
                                    required
                                    error={!!errors.name}
                                    helperText={errors.name}
                                    InputProps={{
                                        startAdornment: <Person sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_phone')}
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                                    }}
                                    fullWidth
                                    error={!!errors.phone}
                                    helperText={errors.phone}
                                    InputProps={{
                                        startAdornment: <Phone sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_guests')}
                                    type="number"
                                    value={guests}
                                    onChange={(e) => {
                                        setGuests(Number(e.target.value));
                                        if (errors.guestCount) setErrors((prev) => ({ ...prev, guestCount: '' }));
                                    }}
                                    fullWidth
                                    required
                                    error={!!errors.guestCount}
                                    helperText={errors.guestCount}
                                    InputProps={{
                                        inputProps: { min: 1, max: 100 },
                                        startAdornment: <Group sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_date')}
                                    type="date"
                                    value={date}
                                    onChange={(e) => {
                                        setDate(e.target.value);
                                        if (errors.bookingDate) setErrors((prev) => ({ ...prev, bookingDate: '' }));
                                    }}
                                    fullWidth
                                    required
                                    error={!!errors.bookingDate}
                                    helperText={errors.bookingDate}
                                    InputLabelProps={{ shrink: true }}
                                    InputProps={{
                                        startAdornment: <CalendarToday sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_time')}
                                    type="time"
                                    value={time}
                                    onChange={(e) => {
                                        setTime(e.target.value);
                                        if (errors.bookingTime) setErrors((prev) => ({ ...prev, bookingTime: '' }));
                                    }}
                                    fullWidth
                                    required
                                    error={!!errors.bookingTime}
                                    helperText={errors.bookingTime}
                                    InputLabelProps={{ shrink: true }}
                                    InputProps={{
                                        startAdornment: <AccessTime sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <TextField
                                    label={t('manual_booking.field_notes')}
                                    value={notes}
                                    onChange={(e) => {
                                        setNotes(e.target.value);
                                        if (errors.notes) setErrors((prev) => ({ ...prev, notes: '' }));
                                    }}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    error={!!errors.notes}
                                    helperText={errors.notes}
                                    InputProps={{
                                        startAdornment: <Notes sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                    }}
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 4, position: 'relative' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                fullWidth
                                sx={{
                                    fontWeight: 600,
                                    py: 1.5,
                                    bgcolor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    boxShadow: 2,
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.dark,
                                    },
                                }}
                            >
                                {t('manual_booking.save_booking')}
                            </Button>
                            {loading && (
                                <CircularProgress
                                    size={28}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        marginTop: `calc(-1 * ${vmin(14)})`,
                                        marginLeft: `calc(-1 * ${vmin(14)})`,
                                    }}
                                />
                            )}
                        </Box>
                        {success && (
                            <Typography color="success.main" sx={{ mt: 3, textAlign: 'center', fontWeight: 500 }}>
                                {t('manual_booking.booking_added')}
                            </Typography>
                        )}
                    </Box>
                </Paper>

                {/* BOOKINGS LIST */}
                <Paper elevation={1} sx={{ mt: 5, p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                        {t('manual_booking.existing_bookings')}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {fetching ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : bookings.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            {t('manual_booking.no_bookings')}
                        </Typography>
                    ) : (
                        <List>
                            {bookings.map((b) => (
                                <ListItem key={b.id} alignItems="flex-start" sx={{ mb: 1, borderRadius: 2, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                                            <Person />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography fontWeight={500}>{b.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {b.phone}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Group fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                                                    <Typography variant="body2">{b.guestCount} os.</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CalendarToday fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                                                    <Typography variant="body2">{b.bookingDate}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <AccessTime fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                                                    <Typography variant="body2">{b.bookingTime}</Typography>
                                                </Box>
                                                {b.notes && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Notes fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                                                        <Typography variant="body2">{b.notes}</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Tooltip title={t('manual_booking.delete_booking')}>
                                            <IconButton edge="end" color="error" onClick={() => handleDelete(b.id)}>
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Box>

            {/* PREVIEW 30% */}
            <Box
                sx={{
                    flex: 3,
                    minWidth: 280,
                    maxWidth: 360,
                    position: 'sticky',
                    top: { xs: 0, md: 32 },
                    alignSelf: 'flex-start',
                }}
            >
                <Paper
                    elevation={2}
                    sx={{
                        p: 3,
                        borderRadius: 3,
                        bgcolor: theme.palette.background.paper,
                        boxShadow: `0 ${vmin(2)} ${vmin(12)} 0 rgba(60,64,67,.08)`,
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                        {t('manual_booking.preview_title')}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2} alignItems="flex-start">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                                <Person />
                            </Avatar>
                            <Box>
                                <Typography variant="body1" fontWeight={500}>{name}</Typography>
                                <Typography variant="body2" color="text.secondary">{phone}</Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.secondary.light }}>
                                <Group />
                            </Avatar>
                            <Typography variant="body1">{t('manual_booking.guests_count', { count: guests })}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.info.light }}>
                                <CalendarToday />
                            </Avatar>
                            <Typography variant="body1">{date}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.warning.light }}>
                                <AccessTime />
                            </Avatar>
                            <Typography variant="body1">{time}</Typography>
                        </Stack>
                        {notes && (
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: theme.palette.success.light }}>
                                    <Notes />
                                </Avatar>
                                <Typography variant="body2" color="text.secondary">{notes}</Typography>
                            </Stack>
                        )}
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}
