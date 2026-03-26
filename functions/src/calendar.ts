// functions/src/calendar.ts
// Google Calendar integration: OAuth token exchange + reservation sync
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from './firebaseAdmin';
import { google } from 'googleapis';
import {
  GcalConnectSchema,
  GcalSyncBookingsSchema,
  GcalListEventsSchema,
  GcalSyncShiftsSchema,
  GcalSyncEventsSchema,
} from './validation/calendar';

// ── Mock mode (mirrors drive.ts pattern) ─────────────────────────────────────
const MOCK_INTEGRATIONS_ON_EMULATOR =
  (process.env.MOCK_INTEGRATIONS_ON_EMULATOR ?? 'true') !== 'false';

function isIntegrationMockMode() {
  const forceOn = process.env.MOCK_INTEGRATIONS === 'true';
  const forceOff = process.env.MOCK_INTEGRATIONS === 'false';
  if (forceOn) return true;
  if (forceOff) return false;
  const isEmulator =
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  return MOCK_INTEGRATIONS_ON_EMULATOR && isEmulator;
}

// ── OAuth client ─────────────────────────────────────────────────────────────
// Calendar can share a Google OAuth app with Drive (add scopes),
// or use a dedicated one. Env vars fall back to DRIVE_* if CALENDAR_* not set.
function getOAuth2Client() {
  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? process.env.GOOGLE_DRIVE_REDIRECT_URI;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ── Firestore token store ─────────────────────────────────────────────────────
interface CalendarTokens {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  calendarId?: string;
  connected?: boolean;
}

async function getStoredTokens(uid: string): Promise<CalendarTokens | null> {
  const snap = await admin.firestore().doc(`users/${uid}/integrations/calendar`).get();
  if (!snap.exists) return null;
  return snap.data() as CalendarTokens;
}

async function getAuthClient(uid: string) {
  const tokens = await getStoredTokens(uid);
  if (!tokens?.access_token) {
    throw new HttpsError('failed-precondition', 'Google Calendar not connected');
  }
  const auth = getOAuth2Client();
  auth.setCredentials(tokens);
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60_000) {
    const { credentials } = await auth.refreshAccessToken();
    await admin.firestore().doc(`users/${uid}/integrations/calendar`).update({
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    });
    auth.setCredentials(credentials);
  }
  return auth;
}

function nowIso() {
  return new Date().toISOString();
}

function parseDate(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new HttpsError('invalid-argument', `Invalid ${label}`);
  }
  return d;
}

function linkDocId(type: 'booking' | 'shift' | 'event', id: string) {
  return type === 'booking' ? id : `${type}_${id}`;
}

// ── gcalGetStatus ─────────────────────────────────────────────────────────────
export const gcalGetStatus = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;

  if (isIntegrationMockMode()) {
    const snap = await admin.firestore().doc(`users/${uid}/integrations/calendar`).get();
    return {
      connected: snap.exists && Boolean(snap.data()?.connected),
      calendarId: snap.data()?.calendarId ?? null,
    };
  }

  const tokens = await getStoredTokens(uid);
  return {
    connected: Boolean(tokens?.access_token),
    calendarId: tokens?.calendarId ?? null,
  };
});

// ── gcalConnect ───────────────────────────────────────────────────────────────
export const gcalConnect = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { code, orgId } = GcalConnectSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    await admin.firestore().doc(`users/${uid}/integrations/calendar`).set({
      connected: true,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600_000,
      calendarId: 'primary',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (orgId) {
      await admin.firestore()
        .doc(`organizations/${orgId}/integrations/googleCalendar`)
        .set(
          { connected: true, calendarId: 'primary', status: 'connected', updatedAt: nowIso() },
          { merge: true },
        );
    }
    return { connected: true, calendarId: 'primary' };
  }

  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  if (!tokens.access_token) {
    throw new HttpsError('internal', 'Failed to obtain access token from Google');
  }

  const tokenDoc: CalendarTokens & { createdAt: string; updatedAt: string } = {
    connected: true,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    calendarId: 'primary',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await admin.firestore().doc(`users/${uid}/integrations/calendar`).set(tokenDoc);

  if (orgId) {
    await admin.firestore()
      .doc(`organizations/${orgId}/integrations/googleCalendar`)
      .set(
        { connected: true, calendarId: 'primary', status: 'connected', updatedAt: nowIso() },
        { merge: true },
      );
  }

  return { connected: true, calendarId: 'primary' };
});

// ── gcalDisconnect ────────────────────────────────────────────────────────────
export const gcalDisconnect = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  await admin.firestore().doc(`users/${uid}/integrations/calendar`).set(
    { connected: false, access_token: null, refresh_token: null, updatedAt: nowIso() },
    { merge: true },
  );
  return { disconnected: true };
});

export const gcalSyncBookings = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { bookings, calendarId } = GcalSyncBookingsSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const batch = admin.firestore().batch();
    for (const booking of bookings) {
      batch.set(admin.firestore().doc(`users/${uid}/calendarEvents/${linkDocId('booking', booking.id)}`), {
        entityType: 'booking',
        entityId: booking.id,
        bookingId: booking.id,
        calendarEventId: `mock-event-${booking.id}`,
        syncedAt: nowIso(),
      });
    }
    await batch.commit();
    return { synced: bookings.length };
  }

  const auth = await getAuthClient(uid);
  const calendar = google.calendar({ version: 'v3', auth });

  let synced = 0;
  for (const booking of bookings) {
    try {
      const start = new Date(`${booking.date}T${booking.startTime}:00`);
      const end = booking.endTime
        ? new Date(`${booking.date}T${booking.endTime}:00`)
        : new Date(start.getTime() + 2 * 60 * 60 * 1000);

      const eventBody = {
        summary: `Rezerwacja: ${booking.guestName ?? 'Gość'}${
          booking.partySize ? ` (${booking.partySize} os.)` : ''
        }`,
        description: [
          booking.restaurantName ? `Lokal: ${booking.restaurantName}` : null,
          booking.notes ? `Uwagi: ${booking.notes}` : null,
          `ID rezerwacji: ${booking.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        extendedProperties: {
          private: {
            gastrooEntityType: 'booking',
            gastrooEntityId: booking.id,
            gastrooBookingId: booking.id,
            syncedBy: 'gastroo.space',
          },
        },
      };

      const existingRef = admin
        .firestore()
        .doc(`users/${uid}/calendarEvents/${linkDocId('booking', booking.id)}`);
      const existingSnap = await existingRef.get();

      if (existingSnap.exists && existingSnap.data()?.calendarEventId) {
        await calendar.events.update({
          calendarId,
          eventId: existingSnap.data()!.calendarEventId as string,
          requestBody: eventBody,
        });
      } else {
        const created = await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        await existingRef.set({
          entityType: 'booking',
          entityId: booking.id,
          bookingId: booking.id,
          calendarEventId: created.data.id,
          syncedAt: nowIso(),
        });
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync booking ${booking.id}:`, err);
    }
  }

  return { synced };
});

export const gcalSyncShifts = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { shifts, calendarId } = GcalSyncShiftsSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const batch = admin.firestore().batch();
    for (const shift of shifts) {
      const docId = linkDocId('shift', shift.id);
      batch.set(admin.firestore().doc(`users/${uid}/calendarEvents/${docId}`), {
        entityType: 'shift',
        entityId: shift.id,
        calendarEventId: `mock-event-${docId}`,
        syncedAt: nowIso(),
      });
    }
    await batch.commit();
    return { synced: shifts.length };
  }

  const auth = await getAuthClient(uid);
  const calendar = google.calendar({ version: 'v3', auth });

  let synced = 0;
  for (const shift of shifts) {
    try {
      const start = parseDate(shift.startAt, 'shift.startAt');
      const end = parseDate(shift.endAt, 'shift.endAt');

      const summary = `Zmiana: ${shift.staffName ?? 'Załoga'}${shift.role ? ` (${shift.role})` : ''}`;
      const eventBody = {
        summary,
        description: [
          shift.restaurantName ? `Lokal: ${shift.restaurantName}` : null,
          shift.notes ? `Uwagi: ${shift.notes}` : null,
          `ID zmiany: ${shift.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        extendedProperties: {
          private: {
            gastrooEntityType: 'shift',
            gastrooEntityId: shift.id,
            syncedBy: 'gastroo.space',
          },
        },
      };

      const docId = linkDocId('shift', shift.id);
      const existingRef = admin.firestore().doc(`users/${uid}/calendarEvents/${docId}`);
      const existingSnap = await existingRef.get();

      if (existingSnap.exists && existingSnap.data()?.calendarEventId) {
        await calendar.events.update({
          calendarId,
          eventId: existingSnap.data()!.calendarEventId as string,
          requestBody: eventBody,
        });
      } else {
        const created = await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        await existingRef.set({
          entityType: 'shift',
          entityId: shift.id,
          calendarEventId: created.data.id,
          syncedAt: nowIso(),
        });
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync shift ${shift.id}:`, err);
    }
  }

  return { synced };
});

export const gcalSyncEvents = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { events, calendarId } = GcalSyncEventsSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const batch = admin.firestore().batch();
    for (const ev of events) {
      const docId = linkDocId('event', ev.id);
      batch.set(admin.firestore().doc(`users/${uid}/calendarEvents/${docId}`), {
        entityType: 'event',
        entityId: ev.id,
        calendarEventId: `mock-event-${docId}`,
        syncedAt: nowIso(),
      });
    }
    await batch.commit();
    return { synced: events.length };
  }

  const auth = await getAuthClient(uid);
  const calendar = google.calendar({ version: 'v3', auth });

  let synced = 0;
  for (const ev of events) {
    try {
      const start = parseDate(ev.startAt, 'event.startAt');
      const end = parseDate(ev.endAt, 'event.endAt');

      const eventBody = {
        summary: `Event: ${ev.name}`,
        description: [
          ev.restaurantName ? `Lokal: ${ev.restaurantName}` : null,
          ev.description ? ev.description : null,
          `ID eventu: ${ev.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        extendedProperties: {
          private: {
            gastrooEntityType: 'event',
            gastrooEntityId: ev.id,
            syncedBy: 'gastroo.space',
          },
        },
      };

      const docId = linkDocId('event', ev.id);
      const existingRef = admin.firestore().doc(`users/${uid}/calendarEvents/${docId}`);
      const existingSnap = await existingRef.get();

      if (existingSnap.exists && existingSnap.data()?.calendarEventId) {
        await calendar.events.update({
          calendarId,
          eventId: existingSnap.data()!.calendarEventId as string,
          requestBody: eventBody,
        });
      } else {
        const created = await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        await existingRef.set({
          entityType: 'event',
          entityId: ev.id,
          calendarEventId: created.data.id,
          syncedAt: nowIso(),
        });
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync event ${ev.id}:`, err);
    }
  }

  return { synced };
});

// ── gcalListEvents ────────────────────────────────────────────────────────────
export const gcalListEvents = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = request.auth.uid;
  const { calendarId, timeMin, timeMax } = GcalListEventsSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    return {
      events: [
        {
          id: 'mock-event-1',
          summary: 'Rezerwacja testowa: Jan Kowalski (4 os.)',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
        },
      ],
    };
  }

  const auth = await getAuthClient(uid);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin ?? new Date().toISOString(),
    timeMax,
    maxResults: 50,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return { events: res.data.items ?? [] };
});
