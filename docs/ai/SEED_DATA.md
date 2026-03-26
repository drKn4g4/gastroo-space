# Seed Data Guide

This guide explains how to set up test data for development and testing with the hybrid API.

## Overview

There are three ways to seed data:

1. **Existing schema** (`scripts/seed.ts`) - Full emulator setup with demo restaurants
2. **New API schema** (`scripts/seed.ts`) - Organizations and new permission model
3. **Manual scripts** - Fine-grained control with helpers

Canonical import/export format for seed files (used outside automated tests too):

```json
{
  "firestore": {
    "organizations": [{ "id": "demo-org", "name": "..." }],
    "users": [{ "id": "uid-1", "email": "..." }]
  },
  "meta": {
    "exportedAt": "2026-03-17T10:00:00.000Z",
    "collections": ["organizations", "users"],
    "schemaVersion": "1.1.0",
    "profile": "core"
  }
}
```

Notes:
- `/api/seed/export` now returns this canonical shape.
- `/api/seed/import` accepts both this shape and legacy flat payloads for backward compatibility.
- If `collections` is omitted in import request, all collections from the file are imported.
- `mode=strict` (default) stops on first import problem and returns HTTP 400 with failure report.
- `mode=best-effort` continues import and returns a summary with failures.
- Export supports profile-based defaults: `profile=core|demo|integration`.

## Seed API contract checks (CI)

- Dedicated script: `npm run test:seed:contracts`
- Covered tests:
  - `src/app/api/seed/_lib/__tests__/seed-format.test.ts`
  - `src/app/api/seed/__tests__/seed-routes.integration.test.ts`
- CI runs this contract job only when seed-related files change (`src/app/api/seed/**`, `swagger-seed.yaml`, seed docs).

---

## Quick Start

### Run all emulator setup (existing + new schema)
```bash
npm run dev:emulators
```

This runs:
- Firebase emulator suite
- `scripts/seed.ts` (existing schema)
- `scripts/seed.ts` (new API schema)

### Run just the new API schema
```bash
npm run seed:unified
```

Creates a fresh test environment with:
- 1 organization (`api-test-restaurant`)
- 3 team members (owner, manager, staff)
- 1 restaurant with 8 tables
- 4 menu categories with 6 sample items

---

## Environment Variables

Set these in `.env.local` or before running scripts:

```bash
# Firebase Project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gastroo-4f0a3

# Emulator (set automatically if on localhost)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

# Seed Configuration
SEED_OWNER_EMAIL=owner@gastroo.local
SEED_OWNER_PASSWORD=TestPassword123!
SEED_ORG_NAME="Test Restaurant Group"
SEED_RESTAURANT_COUNT=2
SEED_TABLES_PER_RESTAURANT=8
```

---

## Seed Data Files

### `scripts/seed-helpers.ts`
Reusable utility class `SeedHelper` with methods:

```typescript
const helper = createSeedHelper(adminDb);

// Organizations
await helper.createOrganization(orgData, adminAuth);
await helper.addMember(orgId, userId, email, role, restaurantIds, adminAuth);

// Restaurants & Tables
await helper.createRestaurant(orgId, restaurantData);
await helper.createTable(orgId, restaurantId, tableData);

// Menu
await helper.createMenuCategory(orgId, restaurantId, name, sortOrder);
await helper.createMenuItem(orgId, restaurantId, categoryId, itemData);

// Bookings
await helper.createBooking(orgId, restaurantId, tableId, bookingData);

// Cleanup
await helper.deleteOrganization(orgId);
```

### `scripts/seed.ts`
All-in-one development seed:
- Creates organization with owner
- Creates manager and staff members
- Creates 1 restaurant with 8 tables
- Creates 4 menu categories with 6 sample items
- Uses emulator by default
- Outputs IDs for testing

**Run:**
```bash
npm run seed:unified
```

### `scripts/seed.ts`
Legacy bulk organization seeder:
- Creates multiple restaurants
- Creates multiple tables per restaurant
- Creates menu categories in each
- Good for stress testing

**Run:**
```bash
ORG_ID=org-123 RESTAURANT_COUNT=5 npx ts-node scripts/seed.ts
```

### `scripts/seed.ts`
Add team members to existing organization:
- Creates/links multiple users
- Assigns roles and permissions
- Handles existing users gracefully

**Run:**
```bash
ORG_ID=org-123 npx ts-node scripts/seed.ts
```

---

## Using Seed Data in Tests

### BDD Test Setup Example

```typescript
import { createSeedHelper } from '@/scripts/seed-helpers';
import * as admin from 'firebase-admin';

describe('Booking API', () => {
  let orgId: string;
  let restaurantId: string;
  let tableId: string;
  let helper: SeedHelper;
  
  before(async () => {
    const db = admin.firestore();
    helper = createSeedHelper(db);
    const auth = admin.auth();
    
    // Create test organization
    orgId = await helper.createOrganization({
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      ownerId: 'test-owner',
      ownerEmail: 'test@example.com',
      plan: 'pro',
    }, auth);
    
    // Create restaurant
    restaurantId = await helper.createRestaurant(orgId, {
      name: 'Test Restaurant',
      address: 'Test St',
      phone: '123456789',
      tableCount: 4,
    });
    
    // Create table
    tableId = await helper.createTable(orgId, restaurantId, {
      number: 1,
      name: 'Table 1',
      capacity: 4,
      location: 'Main',
    });
  });
  
  after(async () => {
    // Cleanup
    await helper.deleteOrganization(orgId);
  });
  
  it('should create a booking', async () => {
    const bookingId = await helper.createBooking(
      orgId,
      restaurantId,
      tableId,
      {
        guestName: 'John Doe',
        guestPhone: '+48123456789',
        guestCount: 2,
        date: '2025-01-15',
        time: '19:00',
      }
    );
    
    expect(bookingId).toBeDefined();
  });
});
```

---

## Test Data Reference

### Default Test Credentials

**API Test Environment:**
```
Email: api-owner@gastroo.dev
Password: TestPassword123!

Email: api-manager@gastroo.dev
Password: TestPassword123!

Email: api-staff@gastroo.dev
Password: TestPassword123!
```

**Legacy Test Environment:**
```
Email: admin@gastroo.dev
Password: Admin123!

Email: manager@gastroo.dev
Password: Manager123!

Email: kelner@gastroo.dev
Password: Kelner123!
```

### Default Test IDs

After running `npm run seed:unified`:

```bash
ORG_ID=org-{timestamp}
RESTAURANT_ID=rest-{timestamp}
TABLE_IDS=table-{timestamp}-1 through table-{timestamp}-8
OWNER_UID={firebase-uid}
```

---

## Integration with npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "seed": "npx tsx scripts/seed.ts",
    "seed:unified": "npx tsx scripts/seed.ts",
    "seed:unified": "npx tsx scripts/seed.ts",
    "seed:unified": "npx tsx scripts/seed.ts",
    "dev:emulators": "firebase emulators:start --import emulator-data && npm run seed && npm run seed:unified"
  }
}
```

---

## Troubleshooting

### Script can't find Firebase config

**Error:** `Module not found: firebase-service-account.json`

**Solution:**
1. Create `firebase-service-account.json` in project root
2. Or set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to use emulator
3. Or set `NEXT_PUBLIC_FIREBASE_PROJECT_ID` explicitly

### Permission denied on Firestore operations

**Causes:**
- Seed running against production (dangerous!)
- Emulator not running
- Rules rejecting seed operations

**Solution:**
- Verify `FIRESTORE_EMULATOR_HOST` is set
- Check `firebase emulators:start` is running
- Seed runs with admin SDK (bypasses rules)

### Team members not getting permissions

**Cause:** `getPermissionsForRole()` not returning expected permissions

**Solution:**
- Check role is exactly: 'owner', 'manager', or 'staff'
- Verify permission list matches firestore.rules
- Check member document was created in Firestore

### Duplicate users in Firebase Auth

**Cause:** Running seed multiple times without cleanup

**Solution:**
- Clear auth emulator: `firebase emulators:start --clear-on-exit`
- Or manually delete users in emulator UI (localhost:4000)

---

## Cleanup

### Delete test organization and all data

```typescript
const helper = createSeedHelper(adminDb);
await helper.deleteOrganization('org-123');
```

### Clear entire emulator

```bash
firebase emulators:start --clear-on-exit
```

Or manually in Firebase emulator UI:
1. Go to http://localhost:4000
2. Click "Clear all data"

---

## Advanced Usage

### Seed with custom data

```typescript
import { createSeedHelper } from '@/scripts/seed-helpers';

const helper = createSeedHelper(adminDb);

// Create organization
const orgId = await helper.createOrganization({
  name: 'My Custom Restaurant',
  slug: 'custom-restaurant',
  ownerId: 'my-owner-id',
  ownerEmail: 'owner@custom.com',
  plan: 'enterprise',
});

// Create multiple restaurants
const restaurantIds = [];
for (let i = 0; i < 5; i++) {
  const restId = await helper.createRestaurant(orgId, {
    name: `Location ${i + 1}`,
    address: `Street ${i + 1}`,
    phone: `+48123456${String(i).padStart(3, '0')}`,
    tableCount: 10,
  });
  restaurantIds.push(restId);
}
```

### Seed for specific test scenario

```typescript
// Scenario: Testing team permissions
const orgId = await helper.createOrganization(...);

// Create users with specific roles
await helper.addMember(orgId, 'owner-uid', 'owner@test.com', 'owner', []);
await helper.addMember(orgId, 'manager-uid', 'manager@test.com', 'manager', ['rest-123']);
await helper.addMember(orgId, 'staff-uid', 'staff@test.com', 'staff', ['rest-123']);

// Now test API endpoints with different permissions
```

---

## See Also

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - API documentation
- [API_GUIDE.md](../API_GUIDE.md) - Integration guide
- [firestore.rules](../firestore.rules) - Security rules (enforced in production)
- [src/lib/firebase/collections.ts](../src/lib/firebase/collections.ts) - Data type definitions
