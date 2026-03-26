import { test, expect, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/lib/testing/selectors';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';

async function loginAsSeededUser(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId(TEST_IDS.auth.loginEmailInput).fill(email);
  await page.getByTestId(TEST_IDS.auth.loginPasswordInput).fill(password);
  await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();
  await page.waitForURL(/\/pl\/(dashboard|space)/, { timeout: 15000 });
}

async function switchToGastronautMode(page: Page) {
  // Przejdź do ustawień i przełącz tryb na gastronautę
  await page.goto(`${BASE_URL}/pl/space`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/tryb gastronaut/i).click();
  await page.getByRole('button', { name: /przejdź do PINpad|open pinpad/i }).click();
  await page.waitForURL(/\/pl\/pinpad/, { timeout: 10000 });
}

async function loginViaPinpad(page: Page, pin: string, orgLabel?: string) {
  await expect(page.getByTestId(TEST_IDS.pinpad.layout)).toBeVisible();
  // Diagnostyka: sprawdź dostępne opcje selecta organizacji
  const orgSelect = page.locator('select');
  if (await orgSelect.isVisible()) {
    const options = await orgSelect.locator('option').allTextContents();
    // Wypisz do konsoli Playwright
    // eslint-disable-next-line no-console
    console.log('PINPAD SELECT OPTIONS:', options);
    // Asercja: select zawiera oczekiwaną organizację
    expect(options).toContain(orgLabel);
    await orgSelect.selectOption({ label: orgLabel });
  }
  for (const digit of pin) {
    await page.getByTestId(TEST_IDS.pinpad.key(digit)).click();
  }
  // Po poprawnym PIN powinno przekierować do dashboardu
  await page.waitForURL(/\/pl\/dashboard/, { timeout: 10000 });
  await expect(page.getByText(/dashboard|stoliki|zamówienia/i)).toBeVisible();
}

test.describe('E2E: PINpad flow (owner + kelner)', () => {
  test('owner loguje się, przechodzi do PINpad i loguje kelnera PINem (zgodnie z seedem)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
        // Przechwytuj logi z przeglądarki (console.log)
        page.on('console', msg => {
          if (msg.type() === 'log') {
            // eslint-disable-next-line no-console
            console.log('[BROWSER]', msg.text());
          }
        });
    // Dane seedowanego ownera i kelnera z tej samej organizacji (Gastroo Space Core)
    const ownerEmail = 'owner2@gastroo.dev';
    const ownerPassword = 'Owner123!';
    const waiterPin = '3335'; // waiter3@gastroo.dev
    const orgLabel = 'Gastroo Space Core — Gastroo Warszawa Central';

    await loginAsSeededUser(page, ownerEmail, ownerPassword);
    await switchToGastronautMode(page);
    // Wymuś reload, by odświeżyć membershipy/organizacje
    await page.reload({ waitUntil: 'domcontentloaded' });
    await loginViaPinpad(page, waiterPin, orgLabel);

    await expect(page.getByLabel('Zmien motyw')).toBeVisible();
    await expect(page.getByLabel('Zablokuj')).toBeVisible();
    await expect(page.locator('text=/\\d{2}\\/\\d{2}/').first()).toBeVisible();
  });
});
