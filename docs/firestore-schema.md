# Firestore Collection Schema

Complete collection tree for gastroo-space. Derived from `firestore.rules`, `seed.ts`, and domain types.

## Collection Tree

```
firestore/
|
|-- users/{userId}                                  # UserProfile
|   |-- memberships/{orgId}                         # Membership (role, pin, permissions, restaurantIds)
|   |-- loyaltyPoints/{restaurantId}                # Per-restaurant loyalty balance (write: Cloud Function only)
|   |-- loyaltyAccounts/{orgId}                     # Per-org loyalty account summary
|   |-- favoriteRestaurants/{restaurantId}          # Consumer favorites
|   |-- favoriteMenuItems/{favoriteId}              # Consumer favorite menu items
|   +-- cv/{entryId}                                # CvEntry (work history, gastronaut only)
|
|-- organizations/{orgId}                           # Organization
|   |-- members/{memberId}                          # Member (legacy, migrating to user memberships)
|   |-- restaurants/{restaurantId}                  # Restaurant
|   |   |-- bookings/{bookingId}                    # Booking (restaurant-scoped, legacy)
|   |   |-- menuCategories/{categoryId}             # MenuCategory
|   |   |-- menuItems/{itemId}                      # MenuItem
|   |   |-- tables/{tableId}                        # Table (floor plan)
|   |   |-- sections/{sectionId}                    # Section (floor plan zones)
|   |   |-- shifts/{shiftId}                        # Shift (schedule)
|   |   |-- timeEntries/{entryId}                   # TimeEntry (clock in/out)
|   |   |-- chatMessages/{messageId}                # ChatMessage (team chat)
|   |   |-- todoTasks/{taskId}                      # TodoTask (daily checklists)
|   |   +-- incidents/{incidentId}                  # Incident report
|   |
|   |-- integrations/{integrationId}                # Google integrations (Drive, Calendar, Workspace)
|   |-- settings/{settingId}                        # Org settings (permissionsMatrix, etc.)
|   |-- promotions/{promotionId}                    # Promotion (discounts, happy hours)
|   |-- events/{eventId}                            # Events (public/staff, calendar)
|   |-- files/{fileId}                              # BinaryAssetMeta (Google Drive refs)
|   |-- logs/{logId}                                # AuditLogEntry
|   |-- invites/{inviteId}                          # Invite (team invite links)
|   |-- subscriptions/{subId}                       # Billing subscription
|   +-- invoices/{invoiceId}                        # Billing invoice
|
|-- bookings/{bookingId}                            # Global bookings (consumer-created)
|-- activeSessions/{sessionId}                      # SlotZero dine-in sessions
|-- notifications/{notificationId}                  # SOS waiter calls, alerts
|-- loyaltyCards/{cardId}                           # LoyaltyCard (physical/virtual card)
|-- allergens/{allergenId}                          # Static allergen reference data
|-- businessProfiles/{profileId}                    # GBP-linked business profiles
|
|-- _seed/{docId}                                   # Seed helper docs (test login shortcuts)
+-- _schema/collections                             # Schema map document (auto-generated)
```

## CollectionGroup Indexes

These collections are queried across all parents via `collectionGroup()`:

| Collection | Use case |
|---|---|
| `restaurants` | Consumer space: map/discover views |
| `menuItems` | Consumer space: search/browse |
| `memberships` | PINpad login: PIN lookup across all users |

## Key Relationships

- **User -> Memberships**: `users/{uid}/memberships/{orgId}` links user to organization with role + PIN
- **Organization -> Restaurants**: multi-location support, 1 org can have N restaurants
- **Restaurant -> Menu**: `menuCategories` + `menuItems` are per-restaurant
- **Global Bookings**: `bookings/` (top-level) for consumer-created, `restaurants/{id}/bookings/` for staff-created (legacy)
- **Active Sessions**: top-level so consumers don't need org knowledge to join via QR

## Document Type Mapping

| Collection | TypeScript Type | Source File |
|---|---|---|
| `users` | `UserProfile` | `src/types/domain/user.ts` |
| `memberships` | `Member` (subcoll) | `src/types/domain/membership.ts` |
| `organizations` | `Organization` | `src/types/domain/organization.ts` |
| `restaurants` | `Restaurant` | `src/types/domain/restaurant.ts` |
| `menuCategories` | `MenuCategory` | `src/types/domain/menu.ts` |
| `menuItems` | `MenuItem` | `src/types/domain/menu.ts` |
| `bookings` | `Booking` | `src/types/domain/restaurant.ts` |
| `tables` | `Table` | `src/types/domain/restaurant.ts` |
| `activeSessions` | `SlotZeroPaymentDoc` | `src/types/domain/restaurant.ts` |
| `loyaltyCards` | `LoyaltyCard` | `src/types/domain/loyalty.ts` |
| `promotions` | `Promotion` | `src/types/domain/commercial.ts` |
| `events` | `SeedEventDefinition` | `scripts/seeds/source.ts` |
| `logs` | `AuditLogEntry` | `src/types/domain/organization.ts` |
| `invites` | `Invite` | `src/types/domain/team.ts` |
