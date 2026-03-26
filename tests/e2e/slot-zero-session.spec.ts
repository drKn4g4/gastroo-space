import { test, expect, type Page } from '@playwright/test';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { TEST_IDS } from '../../src/lib/testing/selectors';

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';
const PROJECT_ID = 'gastroo-4f0a3';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const app = getApps().length ? getApp() : initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);
const adminAuth = getAuth(app);

// ── Test user ───────────────────────────────────────────────────────────────

const TEST_USER = {
  email: 'admin@gastroo.dev',
  password: 'Admin123!',
  displayName: 'Tomasz Wierzbicki',
};

const ORG_ID = 'demo-org';
const REST_ID = 'demo-bistro';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getTestUserUid(): Promise<string> {
  const user = await adminAuth.getUserByEmail(TEST_USER.email);
  return user.uid;
}

interface SessionSeedOptions {
  sessionId?: string;
  items?: Array<{
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    status: 'ordered' | 'preparing' | 'served';
  }>;
  splitMode?: 'full_pay' | 'equal_split' | 'itemized_split';
  extraGuestIds?: string[];
}

async function seedActiveSession(uid: string, opts: SessionSeedOptions = {}) {
  const sessionId = opts.sessionId ?? `test-session-${Date.now()}`;
  const now = Timestamp.now();

  const items = (opts.items ?? [
    { id: 'item-1', menuItemId: 'mi-1', name: 'Bruschetta', price: 24, quantity: 1, status: 'ordered' as const },
    { id: 'item-2', menuItemId: 'mi-2', name: 'Pasta Carbonara', price: 38, quantity: 1, status: 'preparing' as const },
    { id: 'item-3', menuItemId: 'mi-3', name: 'Tiramisu', price: 22, quantity: 1, status: 'served' as const },
  ]).map((i) => ({
    ...i,
    orderedBy: uid,
    claimedBy: null,
    notes: '',
    createdAt: now,
  }));

  const billTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const guestIds = [uid, ...(opts.extraGuestIds ?? [])];

  await db.doc(`activeSessions/${sessionId}`).set({
    sessionId,
    organizationId: ORG_ID,
    organizationName: 'Gastroo Demo',
    restaurantId: REST_ID,
    restaurantName: 'Bistro Gastroo',
    tableId: 'table-5',
    tableNumber: 5,
    tableName: null,
    hostId: uid,
    hostName: TEST_USER.displayName,
    guestIds,
    guestNames: { [uid]: TEST_USER.displayName },
    status: 'active',
    currency: 'PLN',
    items,
    totals: {
      billTotal,
      paidTotal: 0,
      remainingTotal: billTotal,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
    },
    splitMode: opts.splitMode ?? 'full_pay',
    payments: [],
    tip: null,
    openedBy: uid,
    assignedStaffId: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    lastOrderAt: now,
  });

  return sessionId;
}

async function deleteActiveSession(sessionId: string) {
  await db.doc(`activeSessions/${sessionId}`).delete();
}

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/pl/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email|e-mail/i).fill(email);
  await page.getByLabel(/hasło|password/i).fill(password);
  await page.getByTestId(TEST_IDS.auth.loginSubmitButton).click();
  await page.waitForURL(/\/pl\/(dashboard|onboarding|space|pinpad)/, { timeout: 15000 });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Slot Zero: Live Session', () => {
  let uid: string;
  let sessionId: string;

  test.beforeAll(async () => {
    uid = await getTestUserUid();
  });

  test.beforeEach(async () => {
    sessionId = await seedActiveSession(uid);
  });

  test.afterEach(async ({ page }) => {
    await deleteActiveSession(sessionId);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {});
  });

  // ─── Banner ─────────────────────────────────────────────────────────────

  test('banner appears when user has an active session', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);

    const banner = page.getByTestId(TEST_IDS.session.banner);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Verify restaurant name and table
    await expect(page.getByTestId(TEST_IDS.session.bannerRestaurant)).toContainText('Bistro Gastroo');
    await expect(page.getByTestId(TEST_IDS.session.bannerRestaurant)).toContainText('Stolik #5');

    // Verify bill total chip
    await expect(page.getByTestId(TEST_IDS.session.bannerTotal)).toContainText('84.00');
  });

  test('banner disappears when session is deleted', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);

    const banner = page.getByTestId(TEST_IDS.session.banner);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Delete the session — Firestore listener should react
    await deleteActiveSession(sessionId);

    await expect(banner).not.toBeVisible({ timeout: 10000 });

    // Re-seed so afterEach delete doesn't fail
    sessionId = await seedActiveSession(uid);
  });

  // ─── Drawer Open / Close ────────────────────────────────────────────────

  test('clicking banner opens session dashboard drawer', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);

    await page.getByTestId(TEST_IDS.session.banner).click();

    // Drawer should be visible — check for header content
    await expect(page.getByTestId(TEST_IDS.session.closeDrawer)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Bistro Gastroo')).toBeVisible();
    await expect(page.getByText(/Stolik #5/)).toBeVisible();
  });

  test('close button closes the drawer', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);

    await page.getByTestId(TEST_IDS.session.banner).click();
    await expect(page.getByTestId(TEST_IDS.session.closeDrawer)).toBeVisible();

    await page.getByTestId(TEST_IDS.session.closeDrawer).click();

    // Drawer should close — close button no longer visible
    await expect(page.getByTestId(TEST_IDS.session.closeDrawer)).not.toBeVisible({ timeout: 5000 });
  });

  // ─── Orders Tab ─────────────────────────────────────────────────────────

  test('orders tab shows all items with statuses', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    // Orders tab is default
    await expect(page.getByText('Bruschetta')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pasta Carbonara')).toBeVisible();
    await expect(page.getByText('Tiramisu')).toBeVisible();

    // Status badges
    await expect(page.getByText('Zamowione')).toBeVisible();
    await expect(page.getByText('W kuchni')).toBeVisible();
    await expect(page.getByText('Podane')).toBeVisible();

    // Prices
    await expect(page.getByText('24.00 PLN')).toBeVisible();
    await expect(page.getByText('38.00 PLN')).toBeVisible();
    await expect(page.getByText('22.00 PLN')).toBeVisible();
  });

  test('orders tab shows empty state when no items', async ({ page }) => {
    // Delete and re-seed with empty items
    await deleteActiveSession(sessionId);
    sessionId = await seedActiveSession(uid, { items: [] });

    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    await expect(page.getByTestId(TEST_IDS.session.ordersEmpty)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Brak zamowien')).toBeVisible();
  });

  // ─── Tab Switching ──────────────────────────────────────────────────────

  test('can switch between all three tabs', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    // Default: orders
    await expect(page.getByText('Bruschetta')).toBeVisible({ timeout: 5000 });

    // Switch to split
    await page.getByTestId(TEST_IDS.session.tabSplit).click();
    await expect(page.getByTestId(TEST_IDS.session.billTotal)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId(TEST_IDS.session.billTotal)).toContainText('84.00');

    // Switch to invite
    await page.getByTestId(TEST_IDS.session.tabInvite).click();
    await expect(page.getByText('Zapros do stolika')).toBeVisible({ timeout: 5000 });

    // Switch back to orders
    await page.getByTestId(TEST_IDS.session.tabOrders).click();
    await expect(page.getByText('Bruschetta')).toBeVisible({ timeout: 5000 });
  });

  // ─── Split / Bill Tab ──────────────────────────────────────────────────

  test('split tab shows bill summary with correct totals', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabSplit).click();

    await expect(page.getByTestId(TEST_IDS.session.billTotal)).toContainText('84.00');
    await expect(page.getByTestId(TEST_IDS.session.billPaid)).toContainText('0.00');
    await expect(page.getByTestId(TEST_IDS.session.billRemaining)).toContainText('84.00');

    // My total in full_pay mode should equal bill total
    await expect(page.getByTestId(TEST_IDS.session.splitMyTotal)).toContainText('84.00');
  });

  test('split mode toggle: equal_split divides by guests', async ({ page }) => {
    // Re-seed with 2 guests
    await deleteActiveSession(sessionId);
    const secondGuestId = 'fake-guest-uid-123';
    sessionId = await seedActiveSession(uid, { extraGuestIds: [secondGuestId] });

    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabSplit).click();

    await page.getByTestId(TEST_IDS.session.splitModeEqual).click();

    // Bill 84.00 / 2 guests = 42.00
    await expect(page.getByTestId(TEST_IDS.session.splitMyTotal)).toContainText('42.00', { timeout: 5000 });
  });

  test('split mode toggle: itemized_split shows claim list', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabSplit).click();

    await page.getByTestId(TEST_IDS.session.splitModeItemized).click();

    // Should show claim items
    await expect(page.getByText('Zaznacz swoje pozycje')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Bruschetta')).toBeVisible();
    await expect(page.getByText('Pasta Carbonara')).toBeVisible();

    // My total should be 0 initially (nothing claimed)
    await expect(page.getByTestId(TEST_IDS.session.splitMyTotal)).toContainText('0.00');
  });

  // ─── Tip Engine ─────────────────────────────────────────────────────────

  test('tip presets are visible and clickable on split tab', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabSplit).click();

    // Check all three tip presets are visible
    await expect(page.getByTestId(TEST_IDS.session.tipPreset(10))).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.session.tipPreset(15))).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.session.tipPreset(20))).toBeVisible();

    // Custom tip input & submit
    await expect(page.getByTestId(TEST_IDS.session.tipCustomInput)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.session.tipCustomSubmit)).toBeVisible();
  });

  // ─── Invite Tab ─────────────────────────────────────────────────────────

  test('invite tab shows QR code and participant list', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabInvite).click();

    // QR code should render (canvas element)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Participant list
    await expect(page.getByText('Przy stoliku (1)')).toBeVisible();
    await expect(page.getByText(TEST_USER.displayName)).toBeVisible();
    await expect(page.getByText('Host')).toBeVisible();
  });

  test('invite tab shows multiple participants', async ({ page }) => {
    await deleteActiveSession(sessionId);
    const guestUid = 'fake-guest-uid-456';
    sessionId = await seedActiveSession(uid, { extraGuestIds: [guestUid] });

    // Manually set guest name
    await db.doc(`activeSessions/${sessionId}`).update({
      [`guestNames.${guestUid}`]: 'Jan Kowalski',
    });

    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabInvite).click();

    await expect(page.getByText('Przy stoliku (2)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_USER.displayName)).toBeVisible();
    await expect(page.getByText('Jan Kowalski')).toBeVisible();
  });

  // ─── SOS Button ─────────────────────────────────────────────────────────

  test('SOS button creates waiter notification', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    const sosButton = page.getByTestId(TEST_IDS.session.sosButton);
    await expect(sosButton).toBeVisible();
    await expect(sosButton).toContainText('SOS');

    await sosButton.click();

    // Button text should change to "Wyslano" and become disabled
    await expect(sosButton).toContainText('Wyslano');
    await expect(sosButton).toBeDisabled();

    // Verify notification was created in Firestore
    const notificationsSnap = await db
      .collection('notifications')
      .where('sessionId', '==', sessionId)
      .where('type', '==', 'sos_waiter')
      .get();

    expect(notificationsSnap.empty).toBe(false);

    // Cleanup notifications
    for (const doc of notificationsSnap.docs) {
      await doc.ref.delete();
    }
  });

  // ─── Pay Button ─────────────────────────────────────────────────────────

  test('pay button is visible with correct amount on split tab', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();
    await page.getByTestId(TEST_IDS.session.tabSplit).click();

    const payButton = page.getByTestId(TEST_IDS.session.payButton);
    await expect(payButton).toBeVisible({ timeout: 5000 });
    await expect(payButton).toContainText('Zaplac');
    await expect(payButton).toContainText('84.00');
  });

  // ─── Real-time Updates ──────────────────────────────────────────────────

  test('real-time: new item appears in orders tab', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    // Verify current items
    await expect(page.getByText('Bruschetta')).toBeVisible({ timeout: 5000 });

    // Add a new item via Firestore admin
    const sessionRef = db.doc(`activeSessions/${sessionId}`);
    const snap = await sessionRef.get();
    const data = snap.data()!;
    const newItem = {
      id: 'item-4',
      menuItemId: 'mi-4',
      name: 'Margherita Pizza',
      price: 32,
      quantity: 1,
      orderedBy: uid,
      claimedBy: null,
      status: 'ordered',
      notes: '',
      createdAt: Timestamp.now(),
    };

    await sessionRef.update({
      items: [...data.items, newItem],
      'totals.billTotal': data.totals.billTotal + 32,
      'totals.remainingTotal': data.totals.remainingTotal + 32,
      'totals.itemCount': data.totals.itemCount + 1,
      updatedAt: Timestamp.now(),
    });

    // New item should appear in real-time
    await expect(page.getByText('Margherita Pizza')).toBeVisible({ timeout: 10000 });
  });

  test('real-time: item status update reflects in UI', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);
    await page.getByTestId(TEST_IDS.session.banner).click();

    // Initially Bruschetta is "ordered" → "Zamowione"
    await expect(page.getByText('Bruschetta')).toBeVisible({ timeout: 5000 });

    // Count "W kuchni" badges before
    const preparingBadgesBefore = await page.getByText('W kuchni').count();

    // Update item status to "preparing"
    const sessionRef = db.doc(`activeSessions/${sessionId}`);
    const snap = await sessionRef.get();
    const data = snap.data()!;
    const updatedItems = data.items.map((i: { id: string }) =>
      i.id === 'item-1' ? { ...i, status: 'preparing' } : i,
    );
    await sessionRef.update({ items: updatedItems, updatedAt: Timestamp.now() });

    // Should see one more "W kuchni" badge
    await expect(async () => {
      const preparingBadgesAfter = await page.getByText('W kuchni').count();
      expect(preparingBadgesAfter).toBe(preparingBadgesBefore + 1);
    }).toPass({ timeout: 10000 });
  });

  // ─── Banner persists across navigation ──────────────────────────────────

  test('banner persists across page navigation', async ({ page }) => {
    await loginWithEmail(page, TEST_USER.email, TEST_USER.password);

    const banner = page.getByTestId(TEST_IDS.session.banner);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Navigate to a different page
    await page.goto(`${BASE_URL}/pl/dashboard/menu`, { waitUntil: 'domcontentloaded' });

    // Banner should still be visible
    await expect(banner).toBeVisible({ timeout: 15000 });
  });
});
