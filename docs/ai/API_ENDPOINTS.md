# API Endpoints Guide

## Overview

This document describes the secured API endpoints available in gastroo-space. All endpoints use the auth middleware pattern (`withAuth`) to ensure proper authentication and authorization.

## Architecture

### Authentication Flow

1. **Request** → Client sends request with `Authorization: Bearer {idToken}` header
2. **Extraction** → Middleware extracts token from header
3. **Verification** → Firebase Admin SDK verifies the token
4. **Context** → Middleware fetches user's organization and role from Firestore
5. **Authorization** → Endpoint checks if user has required permissions
6. **Handler** → Business logic executes with user context
7. **Response** → Unified response format returned

### Request/Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    "id": "item-123",
    "name": "Pizza Margherita",
    ...
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "User does not have menu.manage permission"
  }
}
```

## API Endpoints

### Menu Management

#### Create Menu Item
```
POST /api/menu/create
```

**Required Permission:** `menu.manage`

**Request Body:**
```json
{
  "orgId": "org-123",
  "restaurantId": "rest-456",
  "name": "Pizza Margherita",
  "price": 12.50,
  "allergens": ["wheat", "dairy"],
  "dietary": {
    "vegan": false,
    "vegetarian": true,
    "glutenFree": false
  },
  "portions": [
    {
      "name": "Small",
      "price": 10.00,
      "items": 1
    }
  ],
  "visible": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "item-1735689123456",
    "name": "Pizza Margherita",
    "price": 12.50,
    "restaurantId": "rest-456",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Error Cases:**
- `401 Unauthorized` - Missing/invalid token
- `400 Bad Request` - Invalid data or missing restaurantId
- `403 Forbidden` - User lacks `menu.manage` permission

---

### Booking Management

#### Create Booking
```
POST /api/bookings/create
```

**Required Permission:** `bookings.create` (staff) or none (public guest booking)

**Request Body:**
```json
{
  "orgId": "org-123",
  "restaurantId": "rest-456",
  "guestName": "John Doe",
  "guestPhone": "+48123456789",
  "guestCount": 4,
  "date": "2025-01-15",
  "time": "19:00",
  "tableId": "table-1",
  "notes": "Allergy to shellfish"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "booking-1735689123456",
    "guestName": "John Doe",
    "guestCount": 4,
    "date": "2025-01-15",
    "time": "19:00",
    "status": "confirmed",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Notes:**
- Staff members create bookings with `confirmed` status
- Public guests create bookings with `pending` status
- Booking date/time validation is built into Zod schema

---

### Team Management

#### Add Team Member
```
POST /api/members/add
```

**Required Permission:** `team.manage`

**Request Body:**
```json
{
  "orgId": "org-123",
  "email": "john@example.com",
  "role": "manager",
  "name": "John Smith",
  "restaurantIds": ["rest-456", "rest-789"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user-uid-123",
    "email": "john@example.com",
    "name": "John Smith",
    "role": "manager",
    "restaurantIds": ["rest-456", "rest-789"],
    "status": "active",
    "permissions": [
      "restaurants.view",
      "menu.view",
      "bookings.view",
      "menu.manage",
      "bookings.create",
      "reports.view"
    ],
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Behavior:**
- If user doesn't exist in Firebase Auth, creates new user
- Automatically adds user to organization
- Assigns permissions based on role
- Sends invitation email (future feature)

**Role Permissions:**
- **staff**: View-only access (restaurants, menu, bookings, orders)
- **manager**: Staff permissions + manage menu, bookings, orders
- **owner**: Manager permissions + team management, organization settings

---

### Organization Management

#### Get Organization
```
GET /api/organization/update
```

**Required Permission:** `organization.view`

**Query Parameters:**
```
orgId=org-123
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "org-123",
    "name": "My Restaurant Group",
    "slug": "my-restaurant-group",
    "type": "group",
    "ownerId": "user-123",
    "plan": "pro",
    "timezone": "Europe/Warsaw",
    "features": {
      "loyaltyProgram": true,
      "onlineOrdering": true,
      "tableManagement": true,
      "analytics": true
    },
    "settings": {
      "language": "pl",
      "currency": "PLN"
    }
  }
}
```

---

#### Update Organization
```
PATCH /api/organization/update
```

**Required Permission:** `organization.manage`

**Request Body (all fields optional):**
```json
{
  "orgId": "org-123",
  "name": "My Restaurant Group",
  "timezone": "Europe/Warsaw",
  "features": {
    "loyaltyProgram": true,
    "onlineOrdering": true
  },
  "settings": {
    "language": "pl",
    "currency": "PLN"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "org-123",
    "name": "My Restaurant Group",
    "timezone": "Europe/Warsaw",
    "features": {
      "loyaltyProgram": true,
      "onlineOrdering": true,
      "tableManagement": true,
      "analytics": true
    },
    "settings": {
      "language": "pl",
      "currency": "PLN"
    },
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

---

## Common Patterns

### Making Authenticated Requests

#### Using Fetch API (Client)
```typescript
const response = await fetch('/api/menu/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  },
  body: JSON.stringify({
    orgId: 'org-123',
    restaurantId: 'rest-456',
    name: 'Pasta Carbonara',
    price: 14.99,
    visible: true,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Menu item created:', result.data);
} else {
  console.error('Error:', result.error.message);
}
```

#### Passing orgId
Most endpoints require `orgId` for database scoping. You can pass it as:
1. **Request body**: Include `orgId` in JSON
2. **Query parameter**: `?orgId=org-123`

### Authorization Patterns

Inside endpoint handlers, check permissions:

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    // Single permission check
    requirePermission(context, 'menu.manage');

    // Or conditional permission check
    if (!hasPermission(context, 'team.invite')) {
      throw new ApiError('FORBIDDEN', 'Cannot invite team members', 403);
    }

    // context contains:
    // - userId: Firebase UID
    // - orgId: Organization ID
    // - role: 'owner' | 'manager' | 'staff'
    // - permissions: string[] array
  });
}
```

### Validation Patterns

All endpoints use Zod schemas. The auth middleware automatically catches and converts validation errors:

```typescript
const payload = bookingSchema.parse(body); // Throws ZodError if invalid
```

The error handler converts Zod errors to proper HTTP responses with details.

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `BAD_REQUEST` | 400 | Invalid request data or validation error |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Integration Checklist

- [x] Auth middleware created (`/src/lib/api/auth.ts`)
- [x] Menu CRUD endpoints secured
- [x] Booking creation endpoint secured
- [x] Team member management endpoint secured
- [x] Organization get/update endpoints secured
- [ ] Frontend form submission integration
- [ ] Real-time listeners for bookings/orders
- [ ] Permission-based UI gating
- [ ] WebSocket for live order updates
- [ ] Batch operations (CSV import, etc.)

---

## Frontend Usage Example

```typescript
import { useAuth } from '@/lib/hooks/useAuth'; // Your auth hook

export function CreateMenuItemForm() {
  const { idToken, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: MenuItemFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/menu/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: user.currentOrgId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      // Success - menu item created
      toast.success(`${result.data.name} added to menu`);
      await refreshMenuItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create menu item');
      toast.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Testing Endpoints

### Using cURL

```bash
# Create menu item
curl -X POST http://localhost:3000/api/menu/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{
    "orgId": "org-123",
    "restaurantId": "rest-456",
    "name": "Pizza",
    "price": 12.50,
    "visible": true
  }'

# Get organization
curl -X GET "http://localhost:3000/api/organization/update?orgId=org-123" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"

# Add team member
curl -X POST http://localhost:3000/api/members/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{
    "orgId": "org-123",
    "email": "john@example.com",
    "role": "manager",
    "name": "John Smith"
  }'
```

### Using Postman

1. **Set up Authorization:**
   - Create environment variable: `{idToken}`
   - Get Firebase ID token from your login/auth process
   - In Postman, set Header: `Authorization: Bearer {{idToken}}`

2. **Create Request:**
   - Method: POST
   - URL: `{{baseUrl}}/api/menu/create`
   - Headers: Content-Type: application/json
   - Body: JSON with request payload

3. **Send and verify response**

---

## Next Steps

1. **Connect Frontend Forms** → Integrate these endpoints with your dashboard components
2. **Add More Endpoints** → restaurants, tables, orders following same pattern
3. **Real-time Updates** → Firebase Firestore listeners for live data
4. **Advanced Features** → Batch operations, webhooks, integrations
5. **Test Coverage** → Add integration tests for all endpoints
