# Seed Data Guide — gastroo.space

## Quick Start

```bash
# Start emulators, then seed:
npm run dev:start          # auto-seeds with SEED_PROFILE=demo
# Or manually:
npm run seed:unified       # Creates: 1 org, 3 team members, 1 restaurant, 8 tables, 4 categories, 6 menu items
```

## Seed Profiles

| Command | Profil | Zakres |
| --- | --- | --- |
| `npm run seed:core` | core | Users + org + restaurants |
| `npm run seed:demo` | demo | Core + menu + bookings |
| `npm run seed:integration` | integration | Core + API test fixtures |
| `npm run seed:all` | all | Everything |
| `npm run seed:unified` | unified | Full dev environment |

Canonical source: `scripts/seeds/source.ts` + `scripts/seed.ts`

## Test Credentials

After `npm run seed:unified`:

```text
api-owner@gastroo.dev    / TestPassword123!   (owner — all permissions)
api-manager@gastroo.dev  / TestPassword123!   (manager)
api-staff@gastroo.dev    / TestPassword123!   (staff — basic access)
```

Legacy (from `scripts/seed.ts`):

```text
admin@gastroo.dev   / Role123!
manager@gastroo.dev / Role123!
kelner@gastroo.dev  / Role123!
kucharz@gastroo.dev / Role123!
```

## Seed API Contract

Canonical import/export format:

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

- `/api/seed/export` returns this shape
- `/api/seed/import` accepts this + legacy flat payloads
- `mode=strict` (default) stops on first error; `mode=best-effort` continues
- Contract tests: `npm run test:seed:contracts`

## SeedHelper (for tests)

```typescript
import { createSeedHelper } from '@/scripts/seed-helpers';

const helper = createSeedHelper(adminDb);

// Create
const orgId = await helper.createOrganization(orgData, adminAuth);
await helper.addMember(orgId, userId, email, role, restaurantIds, adminAuth);
const restId = await helper.createRestaurant(orgId, restaurantData);
const tableId = await helper.createTable(orgId, restId, tableData);
await helper.createMenuCategory(orgId, restId, name, sortOrder);
await helper.createMenuItem(orgId, restId, categoryId, itemData);
await helper.createBooking(orgId, restId, tableId, bookingData);

// Cleanup
await helper.deleteOrganization(orgId);
```

## Environment Variables

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080   # Auto-set by start-dev.sh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
SEED_PROFILE=demo                          # core | demo | integration | all
SEED_AUTH=true                             # Create auth users
SEED_FIRESTORE=true                        # Populate Firestore + Storage
```

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:9099` | Emulators not running — `npm run dev:start` |
| Permission denied on Firestore | Verify `FIRESTORE_EMULATOR_HOST` is set; seed uses admin SDK |
| Duplicate users in Auth | Clear emulator: `START_DEV_RESET_EMULATOR_DATA=true npm run dev:start` |
| Data not visible after seed | Snapshot loaded instead — set `START_DEV_USE_EMULATOR_IMPORT=false` |
