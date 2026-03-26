import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/lib/testing/selectors';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';

test.describe('Auth boundary and edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('login submit with empty fields shows validation error', async ({ page }) => {
    await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();
    await expect(page.getByText('Uzupełnij email i hasło')).toBeVisible();
    await expect(page).toHaveURL(/\/pl\/login/);
  });

  test('register shows required validation errors for empty form', async ({ page }) => {
    await page.getByTestId(TEST_IDS.auth.switchToRegisterButton).click();
    await page.getByTestId(TEST_IDS.auth.registerSubmitButton).click();

    await expect(page.getByText('Imię jest wymagane')).toBeVisible();
    await expect(page.getByText('Nazwisko jest wymagane')).toBeVisible();
    await expect(page.getByText('Email jest wymagany')).toBeVisible();
    await expect(page.getByText('Numer telefonu jest wymagany')).toBeVisible();
    await expect(page.getByText('Hasło musi mieć co najmniej 8 znaków')).toBeVisible();
  });

  test('register rejects invalid email format', async ({ page }) => {
    await page.getByTestId(TEST_IDS.auth.switchToRegisterButton).click();

    await page.getByTestId(TEST_IDS.auth.registerFirstNameInput).fill('Jan');
    await page.getByTestId(TEST_IDS.auth.registerLastNameInput).fill('Nowak');
    await page.getByTestId(TEST_IDS.auth.registerEmailInput).fill('jan.nowak-at-mail');
    await page.getByTestId(TEST_IDS.auth.registerPhoneInput).fill('+48123456789');
    await page.getByTestId(TEST_IDS.auth.registerPasswordInput).fill('Test1234!');
    await page.getByTestId(TEST_IDS.auth.registerConfirmPasswordInput).fill('Test1234!');

    await page.getByTestId(TEST_IDS.auth.registerSubmitButton).click();
    await expect(page.getByText('Nieprawidłowy email')).toBeVisible();
  });

  test('register rejects mismatched passwords', async ({ page }) => {
    await page.getByTestId(TEST_IDS.auth.switchToRegisterButton).click();

    await page.getByTestId(TEST_IDS.auth.registerFirstNameInput).fill('Anna');
    await page.getByTestId(TEST_IDS.auth.registerLastNameInput).fill('Testowa');
    await page.getByTestId(TEST_IDS.auth.registerEmailInput).fill(`anna.${Date.now()}@gastroo.dev`);
    await page.getByTestId(TEST_IDS.auth.registerPhoneInput).fill('+48999111222');
    await page.getByTestId(TEST_IDS.auth.registerPasswordInput).fill('Test1234!');
    await page.getByTestId(TEST_IDS.auth.registerConfirmPasswordInput).fill('Other1234!');

    await page.getByTestId(TEST_IDS.auth.registerSubmitButton).click();
    await expect(page.getByText('Hasła nie są zgodne')).toBeVisible();
  });

  test('forgot password submit button is disabled for empty email and enabled for valid email', async ({ page }) => {
    await page.getByRole('button', { name: 'Nie pamiętam hasła' }).click();

    const submit = page.getByRole('button', { name: 'Wyślij link' });
    await expect(submit).toBeDisabled();

    await page.getByTestId(TEST_IDS.auth.resetEmailInput).fill('manager@gastroo.dev');
    await expect(submit).toBeEnabled();
  });
});

test.describe('Demo PINpad boundary and edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pl/demo/pinpad`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('gastronauta', '1');
    });
    await page.goto(`${BASE_URL}/pl/demo/pinpad`, { waitUntil: 'domcontentloaded' });
  });

  test('PIN shorter than 6 digits is rejected on enter', async ({ page }) => {
    await page.getByTestId(TEST_IDS.pinpad.key('1')).click();
    await page.getByTestId(TEST_IDS.pinpad.key('2')).click();
    await page.getByTestId(TEST_IDS.pinpad.key('3')).click();
    await page.getByTestId(TEST_IDS.pinpad.key('enter')).click();

    await expect(page.getByText('Kod PIN musi mieć 6 cyfr')).toBeVisible();
    await expect(page).toHaveURL(/\/pl\/demo\/pinpad/);
  });

  test('PIN input is capped at 6 digits', async ({ page }) => {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const digit of digits) {
      await page.getByTestId(TEST_IDS.pinpad.key(digit)).click();
    }

    await expect(page.getByTestId(TEST_IDS.pinpad.input)).toHaveValue('123456');
  });

  test('backspace removes only last digit', async ({ page }) => {
    await page.getByTestId(TEST_IDS.pinpad.key('1')).click();
    await page.getByTestId(TEST_IDS.pinpad.key('2')).click();
    await page.getByTestId(TEST_IDS.pinpad.key('3')).click();

    await expect(page.getByTestId(TEST_IDS.pinpad.input)).toHaveValue('123');

    await page.getByTestId(TEST_IDS.pinpad.key('backspace')).click();
    await expect(page.getByTestId(TEST_IDS.pinpad.input)).toHaveValue('12');
  });

  test('invalid 6-digit PIN shows error and clears input', async ({ page }) => {
    for (const digit of ['9', '9', '9', '9', '9', '9']) {
      await page.getByTestId(TEST_IDS.pinpad.key(digit)).click();
    }
    await page.getByTestId(TEST_IDS.pinpad.key('enter')).click();

    await expect(page.getByText('Kod PIN jest nieprawidłowy')).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.pinpad.input)).toHaveValue('');
  });
});
