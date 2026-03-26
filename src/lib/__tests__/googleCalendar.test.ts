import { describe, it, expect } from 'vitest';
import { buildGoogleCalendarEventUrl } from '@/lib/googleCalendar';

describe('buildGoogleCalendarEventUrl', () => {
  it('builds Google Calendar template URL with title and date range', () => {
    const url = buildGoogleCalendarEventUrl({
      title: 'Rezerwacja: Jan Kowalski',
      date: '2026-04-10',
      startTime: '19:00',
      endTime: '21:00',
      description: '4 osoby',
      location: 'gastroo.space',
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Rezerwacja%3A+Jan+Kowalski');
    expect(url).toContain('dates=20260410T190000Z%2F20260410T210000Z');
  });

  it('uses default 2h duration when endTime is missing', () => {
    const url = buildGoogleCalendarEventUrl({
      title: 'Zmiana',
      date: '2026-04-10',
      startTime: '08:30',
    });

    expect(url).toContain('dates=20260410T083000Z%2F20260410T103000Z');
  });
});
