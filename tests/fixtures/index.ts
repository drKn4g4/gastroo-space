/**
 * tests/fixtures/index.ts
 *
 * Barrel — eksportuje skonsolidowane dane testowe z plików domenowych.
 * Importuj stąd zamiast bezpośrednio z poszczególnych JSON-ów.
 */

import users from './users.json';
import orgData from './organization.json';
import menuData from './menu.json';
import bookingsData from './bookings.json';

export const { organization, restaurant, sections, tables } = orgData;
export const menuCategories = menuData.categories;
export { users };
export const bookings = bookingsData.bookings;


/** Pełny obiekt danych seed – gotowy do przekazania do setupu */
export const seedData = {
  organization,
  restaurant,
  users,
  sections,
  tables,
  menuCategories,
  bookings,
} as const;

export type SeedData = typeof seedData;
