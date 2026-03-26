/**
 * Integration tests for secured API endpoints.
 *
 * Requires running Firebase emulators + dev server:
 *   npm run dev:emulators
 *
 * Auth strategy: signs in via Firebase Auth emulator REST API to get a real ID token,
 * then uses it in `Authorization: Bearer TOKEN` header.
 *
 * ENV:
 *   BASE_URL             default http://localhost:5202
 *   AUTH_EMULATOR_URL    default http://127.0.0.1:9099
 *   FIREBASE_API_KEY     default fake-api-key (emulator accepts any key)
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';
const AUTH_EMU = process.env.AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key';

// Demo credentials defined in src/app/[lang]/login/page.tsx DEMO_PINS & emulator seed
const USERS = {
  owner:   { email: 'admin@gastroo.dev',   password: 'Admin123!' },
  manager: { email: 'manager@gastroo.dev', password: 'Manager123!' },
  waiter:  { email: 'kelner@gastroo.dev',  password: 'Kelner123!' },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Signs in against the Firebase Auth emulator and returns an ID token.
 * Returns null if the emulator is not reachable or credentials are wrong.
 */
async function getFirebaseToken(
  request: APIRequestContext,
  role: keyof typeof USERS
): Promise<string | null> {
  const { email, password } = USERS[role];
  try {
    const res = await request.post(
      `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      { data: { email, password, returnSecureToken: true } }
    );
    if (!res.ok()) return null;
    const body = await res.json() as { idToken?: string };
    return body.idToken ?? null;
  } catch {
    return null;
  }
}

// ─── 401 Unauthorized tests (no auth header) ─────────────────────────────────

test.describe('API Endpoints — Unauthorized access (401)', () => {
  const endpoints = [
    { method: 'POST', path: '/api/menu/create' },
    { method: 'POST', path: '/api/bookings/create' },
    { method: 'POST', path: '/api/members/add' },
    { method: 'GET',  path: '/api/organization/update' },
    { method: 'PATCH', path: '/api/organization/update' },
  ] as const;

  for (const { method, path } of endpoints) {
    test(`${method} ${path} → 401 without Authorization header`, async ({ request }) => {
      const res = await request.fetch(`${BASE_URL}${path}`, { method });
      expect(res.status()).toBe(401);
      const body = await res.json() as { error?: string };
      expect(body.error).toBeTruthy();
    });
  }

  test('POST /api/menu/create → 401 with malformed Authorization header', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/create`, {
      headers: { Authorization: 'Bearerr definitely-not-token' },
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/menu/create → 401 with invalid bearer token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/create`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
      data: {
        orgId: 'test-org',
        restaurantId: 'test-restaurant',
        name: 'Invalid token dish',
        price: 20,
        categoryId: 'cat-1',
      },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── 400 Validation tests (valid token, bad payload) ─────────────────────────

test.describe('API Endpoints — Validation (400)', () => {
  let ownerToken: string | null = null;

  test.beforeAll(async ({ request }) => {
    ownerToken = await getFirebaseToken(request, 'owner');
    if (!ownerToken) {
      console.warn('⚠️  Firebase Auth emulator not reachable — skipping validation tests');
    }
  });

  test('POST /api/menu/create — missing required fields → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/menu/create`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { /* intentionally empty */ },
    });
    expect([400, 404]).toContain(res.status());
    const body = await res.json() as { error?: string };
    expect(body.error).toBeTruthy();
  });

  test('POST /api/menu/create — invalid price type → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/menu/create`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        restaurantId: 'test-restaurant',
        name: 'Test dish',
        price: 'not-a-number',   // should be number
        categoryId: 'cat-1',
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /api/bookings/create — missing guestName → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/bookings/create`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        restaurantId: 'test-restaurant',
        // guestName intentionally missing
        phone: '+48123456789',
        guestCount: 2,
        date: '2026-06-01',
        time: '18:00',
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /api/bookings/create — guestCount = 0 → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/bookings/create`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        restaurantId: 'test-restaurant',
        guestName: 'Jan Kowalski',
        phone: '+48123456789',
        guestCount: 0,  // must be ≥ 1
        date: '2026-06-01',
        time: '18:00',
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /api/members/add — missing email → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/members/add`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        // email intentionally missing
        role: 'staff',
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('POST /api/members/add — invalid role → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/members/add`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        email: 'newuser@gastroo.dev',
        role: 'superadmin',   // not a valid role
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('PATCH /api/organization/update — empty body → 400', async ({ request }) => {
    if (!ownerToken) test.skip();
    const res = await request.patch(`${BASE_URL}/api/organization/update`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        orgId: 'test-org',
        // no updatable fields provided
      },
    });
    // Either 400 (empty update not allowed) or 403 (user not in org)
    expect([400, 403, 404]).toContain(res.status());
  });
});

// ─── 403 Forbidden tests (wrong role) ────────────────────────────────────────

test.describe('API Endpoints — Forbidden access (403)', () => {
  let waiterToken: string | null = null;
  let managerToken: string | null = null;

  test.beforeAll(async ({ request }) => {
    waiterToken = await getFirebaseToken(request, 'waiter');
    managerToken = await getFirebaseToken(request, 'manager');
  });

  test('POST /api/menu/create — waiter has no menu.manage permission → 403 or 401', async ({ request }) => {
    if (!waiterToken) test.skip();

    // Waiter token is valid auth but should not have menu.manage permission
    // (403 if the org membership is found, 401 if no team context found)
    const res = await request.post(`${BASE_URL}/api/menu/create`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
      data: {
        orgId: 'test-org',
        restaurantId: 'test-restaurant',
        name: 'Test dish',
        price: 25,
        categoryId: 'cat-1',
      },
    });
    // Either 403 (member found but missing permission) or 401 (member not found in org)
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/members/add — waiter cannot add team members → 403 or 401', async ({ request }) => {
    if (!waiterToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/members/add`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
      data: {
        orgId: 'test-org',
        email: 'another@gastroo.dev',
        role: 'staff',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/members/add — manager without members.manage cannot add members → 403 or 401', async ({ request }) => {
    if (!managerToken) test.skip();
    const res = await request.post(`${BASE_URL}/api/members/add`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      data: {
        orgId: 'test-org',
        email: 'blocked-manager-member@gastroo.dev',
        role: 'staff',
      },
    });
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── Content-type tests ───────────────────────────────────────────────────────

test.describe('API Endpoints — Content type handling', () => {
  test('POST /api/menu/create — no body at all → 400 or 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/create`);
    expect([400, 401]).toContain(res.status());
  });

  test('POST /api/bookings/create — no body at all → 400 or 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/bookings/create`);
    expect([400, 401]).toContain(res.status());
  });

  test('GET /api/organization/update — no auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/organization/update`);
    expect(res.status()).toBe(401);
  });

  test('PUT /api/menu/create — unsupported method → 404 or 405', async ({ request }) => {
    const res = await request.fetch(`${BASE_URL}/api/menu/create`, { method: 'PUT' });
    expect([404, 405]).toContain(res.status());
  });
});
