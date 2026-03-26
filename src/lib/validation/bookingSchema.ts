import { z } from 'zod';

export const bookingSchema = z.object({
    title: z
        .string()
        .min(2, 'Tytuł musi mieć co najmniej 2 znaki')
        .max(120, 'Tytuł może mieć maksymalnie 120 znaków')
        .trim()
        .optional()
        .or(z.literal('')),

    name: z
        .string()
        .min(2, 'Imię i nazwisko musi mieć co najmniej 2 znaki')
        .max(100, 'Imię i nazwisko może mieć maksymalnie 100 znaków')
        .trim()
        .refine((val) => val.length > 0, 'Pole wymagane'),

    phone: z
        .string()
        .regex(/^[\d\s+()-]+$/, 'Nieprawidłowy format numeru telefonu')
        .min(9, 'Numer telefonu musi mieć co najmniej 9 cyfr')
        .max(20, 'Numer telefonu może mieć maksymalnie 20 znaków')
        .trim()
        .optional()
        .or(z.literal('')),

    guestPhone: z
        .string()
        .regex(/^[\d\s+()-]+$/, 'Nieprawidłowy format numeru telefonu')
        .min(9, 'Numer telefonu musi mieć co najmniej 9 cyfr')
        .max(20, 'Numer telefonu może mieć maksymalnie 20 znaków')
        .trim()
        .optional()
        .or(z.literal('')),

    guestEmail: z
        .string()
        .email('Nieprawidłowy email')
        .max(200, 'Email może mieć maksymalnie 200 znaków')
        .trim()
        .optional()
        .or(z.literal('')),

    guestCount: z
        .number()
        .int('Liczba gości musi być liczbą całkowitą')
        .min(1, 'Liczba gości musi być większa niż 0')
        .max(100, 'Liczba gości nie może przekraczać 100'),

    bookingDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty')
        .refine(
            (date) => {
                const selectedDate = new Date(date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return selectedDate >= today;
            },
            'Data rezerwacji nie może być w przeszłości'
        ),

    bookingTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu (HH:MM)')
        .refine(
            (time) => {
                const [hours, minutes] = time.split(':').map(Number);
                return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
            },
            'Nieprawidłowa godzina (00:00 - 23:59)'
        ),

    bookingTimeEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu (HH:MM)')
        .optional()
        .or(z.literal('')),

    tableId: z.string().max(120).optional().or(z.literal('')),
    tableNumber: z.number().int().nonnegative().optional(),
    tableName: z.string().max(120).trim().optional().or(z.literal('')),

    source: z.enum(['manual', 'google', 'thefork', 'online', 'phone']).optional(),
    createdByName: z.string().max(120).trim().optional().or(z.literal('')),

    notes: z
        .string()
        .max(500, 'Notatki mogą mieć maksymalnie 500 znaków')
        .trim()
        .optional()
        .or(z.literal('')),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export function validateBooking(data: unknown) {
    return bookingSchema.safeParse(data);
}
