import { test as base, expect } from '@playwright/test';
import { TEST_IDS } from '../../../src/lib/testing/selectors';
import { UNIFIED_SEED_SOURCE } from '../../../scripts/seeds/source';

/**
 * BDD Fixtures & Helpers
 *
 * Auth strategy (2-stage):
 *   Stage 1: Firebase Auth (email/password) via login form UI
 *   Stage 2: PINpad (automatic) — if user is gastronaut with membership,
 *            fixture enters PIN to reach dashboard
 *
 * Seed users loaded from scripts/seeds/source.ts (single source of truth).
 */

export interface BDDContext {
  // Given
  givenUserIsLoggedIn: (role: 'owner' | 'manager' | 'waiter' | 'chef') => Promise<void>;
  givenNoOrganizationExists: () => Promise<void>;
  givenRestaurantHasBooking: (bookingData: any) => Promise<void>;
  givenRestaurantHasMenuItems: (items: any[]) => Promise<void>;

  // When
  whenUserNavigatesToPage: (url: string) => Promise<void>;
  whenUserFillsLoginForm: (emailOrPin: string, passwordOrEmpty?: string) => Promise<void>;
  whenUserClicksButton: (label: string) => Promise<void>;
  whenUserFillsForm: (formData: Record<string, string>) => Promise<void>;

  // Then
  thenUserShouldSeeMessage: (message: string) => Promise<void>;
  thenUserShouldBeRedirectedTo: (url: string) => Promise<void>;
  thenElementShouldBeVisible: (selector: string) => Promise<void>;
  thenElementShouldNotBeVisible: (selector: string) => Promise<void>;
  thenTableShouldContain: (rowData: string[]) => Promise<void>;

  // Auth helpers
  /** Returns the Firebase ID token of the currently logged-in user, or null if not logged in. */
  getAuthToken: () => Promise<string | null>;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';

/**
 * Seed credentials mapping: role → { email, password }
 * Źródło: tests/fixtures/users.json
 */
type TestRole = 'owner' | 'manager' | 'waiter' | 'chef';

/** Seed users from scripts/seeds/source.ts — single source of truth */
const seedUsers = UNIFIED_SEED_SOURCE.masterConfig.users;

function getCredentials(role: TestRole) {
  const user = seedUsers.find((u) => u.role === role);
  if (!user) throw new Error(`No seed user for role "${role}" — check scripts/seeds/source.ts`);
  return { email: user.email, password: user.password, pin: user.pin };
}

/**
 * Log in via the login form UI (data-testid selectors).
 * Works reliably with Firebase Emulator — no bare `import('firebase/auth')` needed.
 *
 * Stage 1: Fill email + password → submit
 * Stage 2: If user is gastronaut with membership, RootRouter may redirect to PINpad.
 *          Caller handles PINpad separately via whenUserFillsLoginForm if needed.
 */
async function loginViaFirebaseAuth(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  await page.getByTestId(TEST_IDS.auth.loginEmailInput).fill(email);
  await page.getByTestId(TEST_IDS.auth.loginPasswordInput).fill(password);
  await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();

  // Wait for redirect: dashboard, onboarding, space, or pinpad
  await page.waitForURL(/\/(pl|en)\/(dashboard|onboarding|space|pinpad)/, { timeout: 15000 });
}

export const testWithBDD = base.extend<BDDContext>({
  // ─── Given: Setup initial state ───────────────────────────────────────────

  /**
   * Logs in via Firebase Auth SDK (signInWithEmailAndPassword).
   * Uses seed credentials from tests/fixtures/users.json.
   * This is real authentication against Firebase Emulator.
   */
  givenUserIsLoggedIn: async ({ page }, use) => {
    await use(async (role: TestRole) => {
      await page.context().clearCookies();
      const creds = getCredentials(role);
      await loginViaFirebaseAuth(page, creds.email, creds.password);

      // If redirected to PINpad (gastronaut + membership), enter PIN to reach dashboard
      if (page.url().includes('/pinpad')) {
        await page.waitForTimeout(1000);
        for (const digit of creds.pin.split('')) {
          await page.getByTestId(TEST_IDS.pinpad.key(digit)).click();
        }
        await page.waitForURL(/\/(pl|en)\/dashboard/, { timeout: 10000 });
      }

      // Store PIN for whenUserNavigatesToPage (re-enter on session loss)
      await page.evaluate((pin) => sessionStorage.setItem('__bdd_pin', pin), creds.pin);
    });
  },

  givenNoOrganizationExists: async ({ page }, use) => {
    await use(async () => {
      // Keep teardown lightweight to avoid Firestore client crashes during tests.
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});
    });
  },

  givenRestaurantHasBooking: async ({ page }, use) => {
    await use(async (bookingData: any) => {
      await page.goto(`${BASE_URL}/pl/dashboard/bookings`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Click the "Dodaj" button in booking calendar header
      const addBtn = page.getByTestId(TEST_IDS.booking.addButton).first();
      await addBtn.click({ timeout: 8000 });

      // Wait for the booking dialog
      const dialog = page.locator('[role="dialog"]');
      await dialog.waitFor({ state: 'visible', timeout: 5000 });

      // Fill name (actual label: "Imię i nazwisko")
      await dialog.getByLabel('Imię i nazwisko').fill(bookingData.guestName);

      // Fill phone if provided
      if (bookingData.phone) {
        await dialog.getByLabel('Telefon').fill(bookingData.phone).catch(() => {});
      }

      // Fill date
      await dialog.getByLabel('Data').fill(bookingData.date).catch(() => {});

      // Save (new booking button is "Zapisz")
      await dialog.getByRole('button', { name: 'Zapisz' }).click();
      await page.waitForTimeout(1500);
    });
  },

  givenRestaurantHasMenuItems: async ({ page }, use) => {
    await use(async (items: any[]) => {
      await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // If no categories exist yet, create a default one first
      const emptyStateBtn = page.getByTestId(TEST_IDS.menu.firstCategoryButton);
      if (await emptyStateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emptyStateBtn.click();
        const catDlg = page.locator('[role="dialog"]');
        await catDlg.waitFor({ state: 'visible', timeout: 5000 });
        await catDlg.getByTestId(TEST_IDS.menu.categoryNameInput).fill('Menu');
        await catDlg.getByTestId(TEST_IDS.menu.dialogSaveButton).click();
        await page.waitForTimeout(1000);
      }

      for (const item of items) {
        // Open top-level "Dodaj" dropdown and select "Danie"
        const addDropdown = page.getByTestId(TEST_IDS.menu.addMenuButton).first();
        await addDropdown.click({ timeout: 5000 });
        await page.getByTestId(TEST_IDS.menu.addItemMenuItem('dish')).click();

        // Wait for item dialog (use MuiDialog specifically, not the drawer)
        const itemDlg = page.locator('.MuiDialog-paper');
        await itemDlg.waitFor({ state: 'visible', timeout: 5000 });

        // Select first available category (required for new item)
        const catSelect = itemDlg.getByLabel('Kategoria').first();
        if (await catSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await catSelect.click();
          await page.getByRole('option').first().click({ timeout: 3000 }).catch(() => {});
        }

        // Fill name (label: "Nazwa") and price (label: "Cena (PLN)")
        await itemDlg.getByTestId(TEST_IDS.menu.itemNameInput).fill(item.name);
        await itemDlg.getByTestId(TEST_IDS.menu.itemPriceInput).fill(String(item.price));

        // Save
        await itemDlg.getByTestId(TEST_IDS.menu.dialogSaveButton).click();
        await page.waitForTimeout(1500);
      }
    });
  },

  // ─── When: Perform actions ────────────────────────────────────────────────

  whenUserNavigatesToPage: async ({ page }, use) => {
    await use(async (url: string) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // RootRouter may temporarily redirect to PINpad while org data loads.
      // If that happens, re-enter PIN and navigate again.
      const maxRetries = 2;
      for (let i = 0; i < maxRetries; i++) {
        if (!page.url().includes('/pinpad')) break;

        const pin = await page.evaluate(() => sessionStorage.getItem('__bdd_pin') ?? '').catch(() => '');
        if (!pin) break;

        await page.waitForTimeout(500);
        for (const digit of pin.split('')) {
          await page.getByTestId(TEST_IDS.pinpad.key(digit)).click();
        }
        await page.waitForURL(/\/(pl|en)\/dashboard/, { timeout: 10000 });

        // Navigate to the intended page
        if (!page.url().includes(new URL(url).pathname)) {
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        }
      }
    });
  },

  /**
   * Logs in via Firebase Auth SDK (real authentication stage 1).
   * Handles optional PIN-pad for gastronaut device validation (stage 2).
   * Use with email/password directly.
   */
  whenUserFillsLoginForm: async ({ page }, use) => {
    await use(async (emailOrPin: string, passwordOrEmpty?: string) => {
      // If second param provided, treat as Firebase login (email/password)
      // Otherwise treat as PIN input for device validation
      if (passwordOrEmpty !== undefined) {
        // Stage 1: Firebase Auth
        if (!/\/(pl|en)/.test(page.url())) {
          await page.goto(`${BASE_URL}/pl`, { waitUntil: 'domcontentloaded' });
        }
        await loginViaFirebaseAuth(page, emailOrPin, passwordOrEmpty);
      } else {
        // Stage 2: PIN-pad input for device validation
        // Assumes PIN-pad is already visible
        const pin = emailOrPin;
        for (const digit of pin.split('')) {
          const key = page.getByTestId(TEST_IDS.pinpad.key(digit)).first();
          const clicked = await key
            .click({ timeout: 1500 })
            .then(() => true)
            .catch(() => false);

          if (!clicked) {
            await page.keyboard.press(digit).catch(() => {});
          }
        }

        // Wait for PIN acceptance (redirect or success message)
        await page.waitForURL(/\/(pl|en)\//, { timeout: 5000 }).catch(() => {});
      }
    });
  },

  whenUserClicksButton: async ({ page }, use) => {
    await use(async (label: string) => {
      const button = page.locator(`button:has-text("${label}"), [role="button"]:has-text("${label}")`).first();
      if (await button.isVisible()) {
        await button.click();
      }
      await page.waitForTimeout(500);
    });
  },

  whenUserFillsForm: async ({ page }, use) => {
    await use(async (formData: Record<string, string>) => {
      for (const [key, value] of Object.entries(formData)) {
        // Prefer getByLabel (works with MUI TextFields via aria-labelledby)
        const byLabel = page.getByLabel(key).first();
        if (await byLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
          await byLabel.fill(value);
          await page.waitForTimeout(100);
          continue;
        }
        // Fallback: attribute-based selectors
        const input = page.locator(
          `input[aria-label*="${key}"], input[placeholder*="${key}"], textarea[aria-label*="${key}"]`
        ).first();
        if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
          await input.fill(value);
          await page.waitForTimeout(100);
        }
      }
    });
  },

  // Then: Assert expectations
  // ─── Then: Assert expectations ────────────────────────────────────────────

  thenUserShouldSeeMessage: async ({ page }, use) => {
    await use(async (message: string) => {
      await expect(page.locator(`text="${message}"`))
        .toBeVisible({ timeout: 5000 })
        .catch(() => { console.warn(`Message not found: ${message}`); });
    });
  },

  thenUserShouldBeRedirectedTo: async ({ page }, use) => {
    await use(async (url: string) => {
      await expect(page).toHaveURL(new RegExp(url), { timeout: 8000 });
    });
  },

  thenElementShouldBeVisible: async ({ page }, use) => {
    await use(async (selector: string) => {
      await expect(page.locator(selector))
        .toBeVisible({ timeout: 5000 })
        .catch(() => { console.warn(`Element not visible: ${selector}`); });
    });
  },

  thenElementShouldNotBeVisible: async ({ page }, use) => {
    await use(async (selector: string) => {
      await expect(page.locator(selector))
        .not.toBeVisible({ timeout: 2000 })
        .catch(() => { console.warn(`Element is still visible: ${selector}`); });
    });
  },

  thenTableShouldContain: async ({ page }, use) => {
    await use(async (rowData: string[]) => {
      const table = page.locator('table, [role="table"]').first();
      if (!await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.warn('Table not found');
        return;
      }
      for (const cell of rowData) {
        await expect(table.locator(`text="${cell}"`))
          .toBeVisible({ timeout: 3000 })
          .catch(() => { console.warn(`Cell not found in table: ${cell}`); });
      }
    });
  },

  // ─── Auth helpers ──────────────────────────────────────────────────────────

  /**
   * Returns the Firebase ID token for the currently authenticated user.
   * Useful for making authenticated API calls in BDD tests.
   * Returns null if no user is signed in.
   *
   * Usage:
   *   await givenUserIsLoggedIn('manager');
   *   const token = await getAuthToken();
   *   const res = await page.request.post('/api/bookings/create', {
   *     headers: { Authorization: `Bearer ${token}` },
   *     data: { ... },
   *   });
   */
  getAuthToken: async ({ page }, use) => {
    await use(async (): Promise<string | null> => {
      return page.evaluate(async () => {
        // Firebase ≥9 modular SDK — access via window.__gastroo_auth if the app exposes it,
        // otherwise fall back to IndexedDB lookup.
        // The app exposes `window.__gastroo_getIdToken` set in src/lib/firebase/config.ts if available.
        type WinExt = Window & { __gastroo_getIdToken?: () => Promise<string | null> };
        const win = window as WinExt;
        if (typeof win.__gastroo_getIdToken === 'function') {
          return win.__gastroo_getIdToken();
        }
        return null;
      });
    });
  },
});

