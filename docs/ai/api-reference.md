# API Reference — gastroo.space

## Authentication Flow

1. Client sends `Authorization: Bearer {idToken}`
2. `withAuth()` extracts & verifies token via Firebase Admin SDK
3. Middleware fetches user's org membership, role, permissions
4. `requirePermission(context, 'permission.name')` checks access
5. Handler executes with `context: { userId, orgId, role, permissions }`
6. Unified JSON response returned

## Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "FORBIDDEN", "message": "..." } }
```

## Error Codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Lacks required permission |
| `BAD_REQUEST` | 400 | Invalid data / validation error |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### POST /api/menu/create

**Permission:** `menu.manage`

```json
{
  "orgId": "org-123",
  "restaurantId": "rest-456",
  "name": "Pizza Margherita",
  "price": 12.50,
  "allergens": ["wheat", "dairy"],
  "dietary": { "vegan": false, "vegetarian": true, "glutenFree": false },
  "visible": true
}
```

### POST /api/bookings/create

**Permission:** `bookings.create` (staff) or none (public guest -> status: `pending`)

```json
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

### POST /api/members/add

**Permission:** `team.manage`

```json
{
  "orgId": "org-123",
  "email": "john@example.com",
  "role": "manager",
  "name": "John Smith",
  "restaurantIds": ["rest-456"]
}
```

Creates Firebase Auth user if not exists. Auto-assigns permissions based on role.

### GET /api/organization/update

**Permission:** `organization.view` — Query: `?orgId=org-123`

### PATCH /api/organization/update

**Permission:** `organization.manage`

```json
{
  "orgId": "org-123",
  "name": "My Restaurant Group",
  "timezone": "Europe/Warsaw",
  "features": { "loyaltyProgram": true },
  "settings": { "language": "pl", "currency": "PLN" }
}
```

---

## New Endpoint Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { createSuccessResponse } from '@/lib/api/errorHandler';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    requirePermission(context, 'required.permission');
    const body = await request.json();
    const validated = yourSchema.parse(body);

    const docPath = `organizations/${context.orgId}/your/collection/${docId}`;
    await adminDb.doc(docPath).set({ ...validated });

    return NextResponse.json(
      createSuccessResponse({ id: docId, ...validated }),
      { status: 201 }
    );
  });
}
```

---

## Permissions

**Roles:** owner > manager > staff

| Scope | View | Manage |
| --- | --- | --- |
| restaurants | all | owner, manager |
| menu | all | owner, manager, chef |
| bookings | all | owner, manager, waiter |
| orders | all | owner, manager |
| team | owner, manager | owner |
| organization | owner, manager | owner |
| reports | owner, manager | owner |

---

## Testing

```bash
# Get token from Firebase Auth emulator, then:
curl -X POST http://localhost:5202/api/menu/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org-123","restaurantId":"rest-456","name":"Pizza","price":12.50,"visible":true}'
```

---

## Data Structure

```text
organizations/{orgId}
├── members/{userId}          — role, permissions, restaurantIds
├── restaurants/{restaurantId}
│   ├── tables/{tableId}
│   ├── menuCategories/{categoryId}
│   ├── menuItems/{itemId}
│   └── bookings/{bookingId}
```

Full types: `src/lib/firebase/collections.ts`
