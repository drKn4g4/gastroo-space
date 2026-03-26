# Quick Reference: API Development Guide

## 🎯 Get Started in 60 Seconds

```bash
# 1. Start development environment
npm run dev:emulators

# 2. In another terminal, seed data
npm run seed:unified

# 3. Login in app with:
#    Email: api-owner@gastroo.dev
#    Password: TestPassword123!

# 4. Open http://localhost:5202/pl/login
```

---

## 📚 File Guide

### Core Infrastructure (Created in Phase 2.0)
| File | Purpose | Use When |
|------|---------|----------|
| `src/lib/api/auth.ts` | Authentication middleware | Adding new endpoints |
| `src/lib/api/errorHandler.ts` | Error handling | Handling exceptions |
| `src/lib/firebase/collections.ts` | Data type definitions | Building components |
| `API_ENDPOINTS.md` | API documentation | Documenting endpoints |

### Seed Utilities (Created in Phase 2.1)
| File | Purpose | Use When |
|------|---------|----------|
| `scripts/seed-helpers.ts` | Reusable seed utilities | Writing tests/setup |
| `scripts/seed.ts` | Quick dev setup | Local development |
| `scripts/seed.ts` | Bulk org seeder | Load testing |
| `scripts/seed.ts` | Bulk team seeder | Multi-user testing |
| `SEED_DATA.md` | Seed documentation | Setting up test data |

### API Endpoints (Secured in Phase 2.0)
| File | Method | Permission | Status |
|------|--------|-----------|--------|
| `src/app/api/menu/create/route.ts` | POST | `menu.manage` | ✅ Secured |
| `src/app/api/bookings/create/route.ts` | POST | `bookings.create` | ✅ Secured |
| `src/app/api/members/add/route.ts` | POST | `team.manage` | ✅ Secured |
| `src/app/api/organization/update/route.ts` | PATCH/GET | `organization.manage` | ✅ Secured |

---

## 🔧 Add a New Endpoint

**Template:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    // 1. Check permission
    requirePermission(context, 'required.permission');
    
    // 2. Validate input
    const body = await request.json();
    const validated = yourSchema.parse(body);
    
    // 3. Business logic with org scoping
    const docPath = `organizations/${context.orgId}/your/document${docId}`;
    await adminDb.doc(docPath).set({ ...validated });
    
    // 4. Return success
    return NextResponse.json(
      createSuccessResponse({ id: docId, ...validated }),
      { status: 201 }
    );
  });
  // Error handling is automatic (withAuth catches ApiError)
}
```

---

## 🧪 Test Your Endpoint

**With cURL:**
```bash
export ORG_ID="org-123456"
export TOKEN="your-firebase-id-token"

curl -X POST http://localhost:5202/api/your/endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"'$ORG_ID'", ...}'
```

**With Frontend:**
```typescript
const response = await fetch('/api/your/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orgId: user.currentOrgId,
    ...data,
  }),
});

const { success, data, error } = await response.json();
```

---

## 🌱 Setup Test Data

**For manual testing:**
```bash
npm run seed:unified
# Output example:
# Organization: org-1735689123456
# test@example.com / TestPassword123!
```

**For BDD tests:**
```typescript
import { createSeedHelper } from '@/scripts/seed-helpers';

describe('My API', () => {
  let helper: SeedHelper;
  let orgId: string;
  
  before(async () => {
    helper = createSeedHelper(adminDb);
    orgId = await helper.createOrganization({
      name: 'Test Org',
      slug: 'test-org',
      ownerId: 'test-owner',
      ownerEmail: 'test@example.com',
      plan: 'pro',
    });
  });
  
  after(async () => {
    await helper.deleteOrganization(orgId);
  });
});
```

---

## 🔐 Authentication

### Get ID Token (Frontend)
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const idToken = await user.getIdToken();
```

### Verify Token (Backend - already done by withAuth)
```typescript
// Inside withAuth middleware
const decoded = await adminAuth.verifyIdToken(token);
// Returns: { uid, email, customClaims, ... }
```

### User Context (available in handler)
```typescript
return withAuth(request, async (context) => {
  // {
  //   userId: string,
  //   email?: string,
  //   orgId: string,
  //   restaurantId?: string,
  //   role: 'owner' | 'manager' | 'staff',
  //   permissions: string[]
  // }
  console.log(context.userId, context.role);
});
```

---

## 📋 Permissions

### Available Permissions
```
View permissions:
  - restaurants.view
  - menu.view
  - bookings.view
  - orders.view
  - tables.view
  - team.view
  - organization.view
  - reports.view

Manage permissions:
  - restaurants.manage
  - menu.manage
  - bookings.manage
  - bookings.create
  - orders.manage
  - tables.manage
  - team.manage
  - team.invite
  - organization.manage
  - settings.manage
  - integrations.manage
  - reports.manage
```

### Check Permissions
```typescript
// Strict check (throws error if missing)
requirePermission(context, 'menu.manage');

// Soft check (returns boolean)
if (hasPermission(context, 'team.invite')) {
  // ...
}
```

### Role Default Permissions
```typescript
// staff: All *.view + bookings.create
// manager: All *.view/manage except team/org/settings
// owner: All permissions
```

---

## 🚨 Error Handling

### Throw Errors
```typescript
throw new ApiError('BAD_REQUEST', 'Invalid input', 400);
throw new ApiError('UNAUTHORIZED', 'Token invalid', 401);
throw new ApiError('FORBIDDEN', 'Permission denied', 403);
throw new ApiError('NOT_FOUND', 'Resource missing', 404);
throw new ApiError('CONFLICT', 'Already exists', 409);
throw new ApiError('INTERNAL_ERROR', 'Server error', 500);
```

### Automatic Error Response
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "User lacks permission"
  }
}
```

### Zod Validation Errors (automatic)
```typescript
const validated = schema.parse(body); // ZodError → automatic 400 response
```

---

## 📊 Database Scoping

**All operations must be scoped to organization:**

```typescript
// ❌ WRONG - exposes data across orgs
await adminDb.doc(`users/${userId}`).get();

// ✅ CORRECT - scoped to current org
await adminDb.doc(
  `organizations/${context.orgId}/members/${userId}`
).get();

// ✅ CORRECT - nested collections
await adminDb.doc(
  `organizations/${context.orgId}/restaurants/${restaurantId}/tables/${tableId}`
).set(data);
```

---

## 🧬 Data Structure Reference

```
organizations/{orgId}
  name: string
  slug: string
  type: 'single_location' | 'restaurant_group'
  ownerId: string
  plan: 'starter' | 'pro' | 'enterprise'
  features: { loyaltyProgram: boolean, ... }
  settings: { language: string, currency: string, ... }

organizations/{orgId}/members/{userId}
  userId: string
  email: string
  name: string
  role: 'owner' | 'manager' | 'staff'
  restaurantIds: string[]
  permissions: string[]
  status: 'active' | 'inactive'

organizations/{orgId}/restaurants/{restaurantId}
  name: string
  address: string
  phone: string
  tableCount: number
  hours: { monday: {open, close}, ... }
  settings: { requiresReservation: boolean, ... }

organizations/{orgId}/restaurants/{restaurantId}/tables/{tableId}
  number: number
  name: string
  capacity: number
  location: string
  status: 'available' | 'occupied' | 'reserved'
```

See `src/lib/firebase/collections.ts` for full types.

---

## 🎯 Common Tasks

### Add Menu Item
```typescript
// Use: POST /api/menu/create
{
  "orgId": "org-123",
  "restaurantId": "rest-456",
  "name": "Pizza Margherita",
  "price": 12.50,
  "allergens": ["wheat", "dairy"],
  "dietary": {...},
  "visible": true
}
```

### Create Booking
```typescript
// Use: POST /api/bookings/create
{
  "orgId": "org-123",
  "restaurantId": "rest-456",
  "guestName": "John Doe",
  "guestPhone": "+48123456789",
  "guestCount": 4,
  "date": "2025-01-15",
  "time": "19:00",
  "tableId": "table-1"
}
```

### Add Team Member
```typescript
// Use: POST /api/members/add
{
  "orgId": "org-123",
  "email": "manager@restaurant.com",
  "role": "manager",
  "name": "Manager Name",
  "restaurantIds": ["rest-456", "rest-789"]
}
```

---

## 📞 Test Credentials

**After running `npm run seed:unified`:**

```
Organization: org-{timestamp}
Owner: api-owner@gastroo.dev
Manager: api-manager@gastroo.dev
Staff: api-staff@gastroo.dev

Password: TestPassword123!
```

Get IDs from seed output or Firestore emulator UI (localhost:4000).

---

## 🔗 Quick Links

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Full API reference
- [SEED_DATA.md](./SEED_DATA.md) - Data setup guide
- [src/lib/firebase/collections.ts](./src/lib/firebase/collections.ts) - Data types
- [src/lib/api/auth.ts](./src/lib/api/auth.ts) - Auth middleware
- [src/lib/validation/](./src/lib/validation/) - Zod schemas

---

## 🚀 Next Steps

1. **Run seed**: `npm run seed:unified`
2. **Choose endpoint**: See API_ENDPOINTS.md
3. **Test locally**: Use cURL or Postman
4. **Connect form**: Link frontend component to endpoint
5. **Add more endpoints**: Use template above
6. **Write tests**: Use SeedHelper in test setup

---

**Ready to build? Pick an endpoint from API_ENDPOINTS.md and start coding!** 🎉
