import { format } from 'date-fns';

export interface GoogleCalendarEventInput {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  location?: string;
}

function toUtcStamp(date: string, time: string): string {
  const dt = new Date(`${date}T${time}:00`);
  return format(dt, "yyyyMMdd'T'HHmmss'Z'");
}

function addDefaultDuration(time: string, minutes = 120): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function buildGoogleCalendarEventUrl(input: GoogleCalendarEventInput): string {
  const start = toUtcStamp(input.date, input.startTime);
  const end = toUtcStamp(input.date, input.endTime ?? addDefaultDuration(input.startTime));

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${start}/${end}`,
    details: input.description ?? '',
    location: input.location ?? '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
