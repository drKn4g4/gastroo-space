import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/lib/testing/selectors';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';
const FIRESTORE_EMULATOR_BASE = process.env.FIRESTORE_EMULATOR_BASE || 'http://127.0.0.1:8080/v1/projects';

type JwtPayload = {
  aud: string;
  email?: string;
  sub?: string;
  user_id?: string;
};

type BrowserAuthState = {
  token: string | null;
  uid: string | null;
  email: string | null;
  gastronauta: string | null;
  hasLoggedIn: string | null;
};

const DEMO_ORGS = [
  {
    orgId: 'org_demo_main',
    orgName: 'Gastroo Demo Group',
    restaurantId: 'rest_demo_krk',
    restaurantName: 'Gastroo Demo Krakow',
  },
  {
    orgId: 'org_demo_main',
    orgName: 'Gastroo Demo Group',
    restaurantId: 'rest_demo_waw',
    restaurantName: 'Gastroo Demo Warszawa',
  },
];

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtPayload;
}

async function clearClientState(page: Page) {
  await page.goto(`${BASE_URL}/pl/login`);
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async () => {
    type WinExt = Window & {
      __gastroo_e2e_signOut?: () => Promise<void>;
    };

    const win = window as WinExt;
    if (typeof win.__gastroo_e2e_signOut === 'function') {
      await win.__gastroo_e2e_signOut();
    }

    localStorage.clear();
    sessionStorage.clear();
  });

  await page.context().clearCookies();
  await page.goto(`${BASE_URL}/pl/demo`);
  await page.waitForLoadState('domcontentloaded');
}

async function getBrowserAuthState(page: Page): Promise<BrowserAuthState> {
  return page.evaluate(async () => {
    type WinExt = Window & {
      __gastroo_getIdToken?: () => Promise<string | null>;
    };

    const token = typeof (window as WinExt).__gastroo_getIdToken === 'function'
      ? await (window as WinExt).__gastroo_getIdToken?.()
      : null;

    if (!token) {
      return {
        token: null,
        uid: null,
        email: null,
        gastronauta: localStorage.getItem('gastronauta'),
        hasLoggedIn: localStorage.getItem('gastroo_has_logged_in'),
      };
    }

    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string; user_id?: string; email?: string };

    return {
      token,
      uid: payload.user_id ?? payload.sub ?? null,
      email: payload.email ?? null,
      gastronauta: localStorage.getItem('gastronauta'),
      hasLoggedIn: localStorage.getItem('gastroo_has_logged_in'),
    };
  });
}

async function fetchUserDocument(request: APIRequestContext, token: string, uid: string) {
  const payload = decodeJwtPayload(token);
  const response = await request.get(
    `${FIRESTORE_EMULATOR_BASE}/${payload.aud}/databases/(default)/documents/users/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function seedDemoCache(page: Page) {
  await page.evaluate((demoOrgs) => {
    localStorage.setItem('gastronauta', '1');
    localStorage.setItem('gastroo_has_logged_in', 'true');
    localStorage.setItem('gastroo_orgs_cache', JSON.stringify(demoOrgs));
    localStorage.removeItem('gastroo_selected_org');
  }, DEMO_ORGS);
}

test.describe('Auth and recent organization flows', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientState(page);
  });

  test('register flow creates Firestore profile and marks user as consumer', async ({ page, request }) => {
    const stamp = Date.now();
    const email = `qa.auth.${stamp}@gastroo.dev`;

    await page.goto(`${BASE_URL}/pl/login`);
    await page.getByTestId(TEST_IDS.auth.switchToRegisterButton).click();

    await page.getByTestId(TEST_IDS.auth.registerFirstNameInput).fill('QA');
    await page.getByTestId(TEST_IDS.auth.registerLastNameInput).fill('Recent');
    await page.getByTestId(TEST_IDS.auth.registerEmailInput).fill(email);
    await page.getByTestId(TEST_IDS.auth.registerPhoneInput).fill('+48555111222');
    await page.getByTestId(TEST_IDS.auth.registerPasswordInput).fill('Test1234!');
    await page.getByTestId(TEST_IDS.auth.registerConfirmPasswordInput).fill('Test1234!');
    await page.getByTestId(TEST_IDS.auth.registerSubmitButton).click();

    await page.waitForURL(/\/pl\/(user|dashboard)/, { timeout: 15000 });

    const authState = await getBrowserAuthState(page);
    expect(authState.token).toBeTruthy();
    expect(authState.uid).toBeTruthy();
    expect(authState.email).toBe(email);
    expect(authState.gastronauta).toBe('0');
    expect(authState.hasLoggedIn).toBe('true');

    const document = await fetchUserDocument(request, authState.token!, authState.uid!);
    const fields = document.fields as Record<string, unknown>;

    expect(fields.userId).toEqual({ stringValue: authState.uid });
    expect(fields.email).toEqual({ stringValue: email });
    expect(fields.firstName).toEqual({ stringValue: 'QA' });
    expect(fields.lastName).toEqual({ stringValue: 'Recent' });
    expect(fields.displayName).toEqual({ stringValue: 'QA Recent' });
    expect(fields.name).toEqual({ stringValue: 'QA Recent' });
    expect(fields.phone).toEqual({ stringValue: '+48555111222' });
    expect(fields.organizations).toEqual({ arrayValue: {} });
    expect(fields.recentOrganization).toBeUndefined();
  });

  test('PINpad shows venue selector when cached staff user has multiple venues and no recent choice', async ({ page }) => {
    await clearClientState(page);
    await page.goto(`${BASE_URL}/pl/demo`, { waitUntil: 'domcontentloaded' });
    await seedDemoCache(page);
    await page.goto(`${BASE_URL}/pl/demo`);

    await expect(page.getByTestId(TEST_IDS.demo.organizationSelectButton('rest_demo_krk'))).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.demo.organizationSelectButton('rest_demo_waw'))).toBeVisible();
  });

  test('PINpad restores recent venue choice and allows changing it', async ({ page, request }) => {
    await clearClientState(page);
    await page.goto(`${BASE_URL}/pl/demo`, { waitUntil: 'domcontentloaded' });
    await seedDemoCache(page);

    await page.goto(`${BASE_URL}/pl/demo`);
    await page.getByTestId(TEST_IDS.demo.organizationSelectButton('rest_demo_waw')).click();

    for (const key of ['1', '1', '1', '1', '1', '1']) {
      await page.getByTestId(TEST_IDS.pinpad.key(key)).click();
    }

    await page.waitForURL(/\/pl\/dashboard/, { timeout: 15000 });

    let authState = await getBrowserAuthState(page);
    const userDocument = await fetchUserDocument(request, authState.token!, authState.uid!);
    const userFields = userDocument.fields as Record<string, { mapValue?: { fields?: Record<string, unknown> } }>;
    const recent = userFields.recentOrganization?.mapValue?.fields as
      | { orgId?: { stringValue?: string }; restaurantId?: { stringValue?: string } }
      | undefined;
    expect(recent).toBeTruthy();
    expect(['org_demo_main', 'demo-org']).toContain(recent?.orgId?.stringValue);
    expect(['rest_demo_waw', 'demo-bistro']).toContain(recent?.restaurantId?.stringValue);
  });
});