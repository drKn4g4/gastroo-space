import { describe, it, expect } from 'vitest';
import { validateBooking } from '../bookingSchema';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const validBooking = () => ({
  name: 'Jan Kowalski',
  phone: '+48 123 456 789',
  guestCount: 4,
  bookingDate: tomorrow(),
  bookingTime: '19:00',
  notes: 'Stolik przy oknie',
});

describe('bookingSchema', () => {
  it('accepts a valid booking', () => {
    const result = validateBooking(validBooking());
    expect(result.success).toBe(true);
  });

  it('rejects a name that is too short', () => {
    const result = validateBooking({ ...validBooking(), name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects 0 guests', () => {
    const result = validateBooking({ ...validBooking(), guestCount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 guests', () => {
    const result = validateBooking({ ...validBooking(), guestCount: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects a past date', () => {
    const result = validateBooking({ ...validBooking(), bookingDate: '2020-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format', () => {
    const result = validateBooking({ ...validBooking(), bookingTime: '25:00' });
    expect(result.success).toBe(false);
  });

  it('accepts a booking without phone (optional)', () => {
    const { phone: _phone, ...withoutPhone } = validBooking();
    const result = validateBooking(withoutPhone);
    expect(result.success).toBe(true);
  });

  it('accepts a booking without notes (optional)', () => {
    const { notes: _notes, ...withoutNotes } = validBooking();
    const result = validateBooking(withoutNotes);
    expect(result.success).toBe(true);
  });

  it('trims whitespace from name', () => {
    const result = validateBooking({ ...validBooking(), name: '  Jan Kowalski  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jan Kowalski');
    }
  });
});
