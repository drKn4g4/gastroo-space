import { z } from 'zod';

export const GcalConnectSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  orgId: z.string().optional(),
  redirectUri: z.string().url().optional(),
});

export const CalendarBookingInputSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)').optional(),
  partySize: z.number().int().positive().optional(),
  guestName: z.string().optional(),
  restaurantName: z.string().optional(),
  notes: z.string().optional(),
});

export const GcalSyncBookingsSchema = z.object({
  bookings: z.array(CalendarBookingInputSchema).min(1, 'At least one booking is required'),
  calendarId: z.string().optional().default('primary'),
});

export const CalendarShiftInputSchema = z.object({
  id: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  staffName: z.string().optional(),
  role: z.string().optional(),
  restaurantName: z.string().optional(),
  notes: z.string().optional(),
});

export const GcalSyncShiftsSchema = z.object({
  shifts: z.array(CalendarShiftInputSchema).min(1, 'At least one shift is required'),
  calendarId: z.string().optional().default('primary'),
});

export const CalendarEventInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  description: z.string().optional(),
  restaurantName: z.string().optional(),
});

export const GcalSyncEventsSchema = z.object({
  events: z.array(CalendarEventInputSchema).min(1, 'At least one event is required'),
  calendarId: z.string().optional().default('primary'),
});

export const GcalListEventsSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
});
