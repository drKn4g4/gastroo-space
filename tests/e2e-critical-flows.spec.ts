import { test, expect, type Page } from '@playwright/test';
import { TEST_IDS } from '../src/lib/testing/selectors';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email|e-mail/i).fill(email);
  await page.getByLabel(/hasło|password/i).fill(password);
  await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();
  await page.waitForURL(/\/pl\/(dashboard|onboarding)/, { timeout: 15000 });
}

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {});
});

test.describe('E2E: Critical User Flows', () => {
  test.describe('Auth: Login Flow', () => {
    test('user can open login page and see required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });

      await expect(page.getByLabel(/email|e-mail/i)).toBeVisible();
      await expect(page.getByLabel(/hasło|password/i)).toBeVisible();
      await expect(page.getByTestId(TEST_IDS.auth.loginSubmitButton)).toBeVisible();
      await expect(page.getByTestId(TEST_IDS.auth.loginGoogleButton)).toBeVisible();
    });

    test('login form exposes email input testid', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId(TEST_IDS.auth.loginEmailInput)).toBeVisible();
    });

    test('login form uses email input type', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
      const emailField = page.getByLabel(/email|e-mail/i);
      await expect(emailField).toHaveAttribute('type', 'email');
    });

    test('invalid credentials keep user on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel(/email|e-mail/i).fill('manager@gastroo.dev');
      await page.getByLabel(/hasło|password/i).fill('WrongPassword!');
      await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();

      await expect(page).toHaveURL(/\/pl\/login/, { timeout: 10000 });
      await expect(page.getByText(/nieprawidłowe|błędne|invalid/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Auth: Logout Flow', () => {
    test('logout button is visible after demo login', async ({ page }) => {
      await loginWithEmail(page, 'manager@gastroo.dev', 'Manager123!');
      await expect(page.getByRole('button', { name: /Wyloguj/i })).toBeVisible({ timeout: 10000 });
    });

    test('logout redirects to auth entry', async ({ page }) => {
      await loginWithEmail(page, 'manager@gastroo.dev', 'Manager123!');
      await page.getByRole('button', { name: /Wyloguj/i }).click();
      await expect(page).toHaveURL(/\/pl\/(login|demo)/, { timeout: 10000 });
    });
  });

  test.describe('Menu: Navigation and Display', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithEmail(page, 'manager@gastroo.dev', 'Manager123!');
    });

    test('menu page loads with heading', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Menu online|Menu/i })).toBeVisible();
    });

    test('menu page has add button', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });
      const addButton = page.getByTestId(TEST_IDS.menu.addMenuButton);
      const firstCategoryButton = page.getByTestId(TEST_IDS.menu.firstCategoryButton);
      await expect(addButton.or(firstCategoryButton)).toBeVisible();
    });

    test('can open new menu item dialog', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });

      const addButton = page.getByTestId(TEST_IDS.menu.addMenuButton);
      const firstCategoryButton = page.getByTestId(TEST_IDS.menu.firstCategoryButton);

      if (await addButton.count()) {
        await addButton.first().click();
      } else {
        await firstCategoryButton.click();
        await expect(page.getByTestId(TEST_IDS.menu.categoryDialog)).toBeVisible();
        await page.getByTestId(TEST_IDS.menu.categoryNameInput).fill('Testowa');
        await page.getByTestId(TEST_IDS.menu.dialogSaveButton).click();
        await page.getByTestId(TEST_IDS.menu.addMenuButton).first().click();
      }

      await page.getByTestId(TEST_IDS.menu.addItemMenuItem('dish')).click();
      await expect(page.getByTestId(TEST_IDS.menu.itemDialog)).toBeVisible();
      await expect(page.getByTestId(TEST_IDS.menu.itemNameInput)).toBeVisible();
      await expect(page.getByTestId(TEST_IDS.menu.itemPriceInput)).toBeVisible();
    });

    test('new menu item dialog blocks save for missing name', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });

      await page.getByTestId(TEST_IDS.menu.addMenuButton).first().click();
      await page.getByTestId(TEST_IDS.menu.addItemMenuItem('dish')).click();

      const dialog = page.getByTestId(TEST_IDS.menu.itemDialog);
      await dialog.getByTestId(TEST_IDS.menu.itemPriceInput).fill('22');
      await expect(dialog.getByTestId(TEST_IDS.menu.dialogSaveButton)).toBeDisabled();
    });
  });

  test.describe('Reservations: Navigation and Display', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithEmail(page, 'manager@gastroo.dev', 'Manager123!');
    });

    test('reservations page loads with heading', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/bookings`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Kalendarz Rezerwacji/i })).toBeVisible();
    });

    test('can open reservation creation dialog', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/bookings`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId(TEST_IDS.booking.addButton).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByLabel('Imię i nazwisko')).toBeVisible();
      await expect(page.getByLabel('Data')).toBeVisible();
    });

    test('reservation validation shows error for missing guest name', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard/bookings`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId(TEST_IDS.booking.addButton).first().click();

      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Telefon').fill('+48123456789');
      await dialog.getByRole('button', { name: /Zapisz|Save/i }).click();

      await expect(page.getByText(/Podaj imię i nazwisko gościa/i)).toBeVisible();
    });
  });

  test.describe('Dashboard: General Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithEmail(page, 'admin@gastroo.dev', 'Admin123!');
    });

    test('dashboard main content is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/pl/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
    });

    test('dashboard works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/pl/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
    });

    test('dashboard works on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/pl/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
    });
  });
});
