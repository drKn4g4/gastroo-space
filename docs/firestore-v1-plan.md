# Firestore Data Model V1

Ten dokument ustala docelowy model danych V1 dla gastroo-space.
Jego celem jest uporzadkowanie pracy nad emulatorami, seedami, regułami Firestore i integracjami Google.

## Cele modelu

- jeden spójny model dla Discovery i GastroOS
- role kontekstowe dla tego samego UID w wielu organizacjach
- BYOS: Firestore przechowuje metadata i indeksy, nie pliki binarne
- prosty rollout do emulatorów i produkcji
- możliwość stopniowej migracji z obecnego modelu

## Zasady architektoniczne

### 1. Source of truth dla członkostw

Docelowym źródłem prawdy jest:

- `/users/{uid}/memberships/{orgId}`

Powód:

- naturalnie wspiera model "jeden UID, wiele kontekstów"
- upraszcza przełączanie kontekstu użytkownika
- dobrze pasuje do logowania PIN i wyboru aktywnej organizacji

Kolekcja projekcyjna do szybkich list zespołu może istnieć pomocniczo:

- `/organizations/{orgId}/members/{uid}`

ale nie może być niezależnym źródłem prawdy.

### 2. BYOS i pliki binarne

Pliki binarne nie są przechowywane w Firestore.

Firestore przechowuje wyłącznie:

- `googleDriveFileId`
- `kind`
- `mimeType`
- `size`
- `checksum`
- `backupStatus`
- `ownerOrgId`
- `linkedEntityType`
- `linkedEntityId`
- `createdAt`
- `updatedAt`

### 3. Logi audytowe

Logi są trzymane per organizacja:

- `/organizations/{orgId}/logs/{logId}`

Nie używamy globalnego `/logs` jako głównej kolekcji roboczej.

## Główne encje

### Użytkownicy

`/users/{uid}`

Minimalny zakres:

- `uid`
- `email`
- `displayName`
- `photoURL`
- `currentOrgId`
- `currentVenueId`
- `mode`: `alien | gastronaut`
- `createdAt`
- `updatedAt`

### Memberships

`/users/{uid}/memberships/{orgId}`

Minimalny zakres:

- `orgId`
- `role`
- `title`
- `pin`
- `permissions`
- `venueIds`
- `status`: `active | invited | suspended`
- `joinedAt`
- `updatedAt`

Uwagi:

- `pin` dotyczy wyłącznie szybkiego logowania GastroOS/POS
- `permissions` są snapshotem wynikowym, nie tylko pochodną roli

### Organizacje

`/organizations/{orgId}`

Minimalny zakres:

- `name`
- `slug`
- `type`: `single_location | chain`
- `ownerUid`
- `plan`
- `timezone`
- `defaultLanguage`
- `features`
- `googleDriveRootFolderId`
- `backupBucketPath`
- `createdAt`
- `updatedAt`

### Lokale

`/organizations/{orgId}/venues/{venueId}`

Używamy nazwy `venues`, żeby rozdzielić organizację od fizycznego lokalu.

Minimalny zakres:

- `name`
- `slug`
- `status`: `active | hidden | archived`
- `address`
- `location`: `{ lat, lng, geohash }`
- `timezone`
- `currencyCode`
- `defaultLanguage`
- `petFriendly`
- `wifi`
- `vegeFriendly`
- `geofenceRadiusMeters`
- `googleBusinessProfile.locationId`
- `hours`
- `currentWaitTime`
- `kitchenOffsetMin`
- `createdAt`
- `updatedAt`

### Menu

Model V1:

- `/organizations/{orgId}/menuCategories/{categoryId}`
- `/organizations/{orgId}/menuItems/{menuItemId}`
- `/organizations/{orgId}/recipes/{recipeId}`

Każdy element menu ma:

- `orgId`
- `venueIds`
- `categoryId`
- `name`
- `description`
- `price`
- `currencyCode`
- `allergenIds`
- `dietaryFlags`
- `visible`
- `available`
- `reactiveHidden`
- `basePrepTimeMin`
- `imageFileId`
- `createdAt`
- `updatedAt`

Dlaczego poziom organizacji, a nie lokalu:

- wspiera multi-unit catalog
- ułatwia kopiowanie między lokalami
- lokalowa publikacja jest realizowana przez `venueIds`

### Magazyn

Model V1:

- `/organizations/{orgId}/ingredients/{ingredientId}`
- `/organizations/{orgId}/inventoryLots/{lotId}`
- `/organizations/{orgId}/inventoryMovements/{movementId}`
- opcjonalnie `/organizations/{orgId}/suppliers/{supplierId}`

`ingredients` to katalog logiczny składników.

`inventoryLots` przechowuje partie towaru:

- `ingredientId`
- `venueId`
- `quantity`
- `unit`
- `unitCost`
- `invoiceFileId`
- `supplierId`
- `receivedAt`
- `expiresAt`

`inventoryMovements` przechowuje ruchy:

- `ingredientId`
- `venueId`
- `type`: `delivery | usage | waste | correction | transfer`
- `quantityDelta`
- `sourceLotId`
- `actorUid`
- `createdAt`

### Rezerwacje i operacje lokalu

Model V1:

- `/organizations/{orgId}/bookings/{bookingId}`
- `/organizations/{orgId}/tables/{tableId}`
- `/organizations/{orgId}/orders/{orderId}`
- `/organizations/{orgId}/timeEntries/{entryId}`

Wszystkie te dokumenty zawierają `venueId`, nawet jeśli są trzymane na poziomie organizacji.

To upraszcza raportowanie cross-venue i ogranicza liczbę głębokich subkolekcji.

### Discovery / Alien

Model V1:

- `/users/{uid}/favorites/venues/{venueId}`
- `/users/{uid}/favorites/menuItems/{menuItemId}`
- `/users/{uid}/diet/preferences`

To zasila:

- filtrowanie
- popularność dań
- sygnały do raportów profitability

### Integracje Google

Model V1:

- `/organizations/{orgId}/integrations/googleDrive`
- `/organizations/{orgId}/integrations/googleBusinessProfile`
- `/organizations/{orgId}/integrations/googleCalendar`

Minimalny zakres dla Drive:

- `connected`
- `rootFolderId`
- `serviceMode`
- `lastSyncAt`
- `status`

Minimalny zakres dla GBP:

- `connected`
- `accountId`
- `locationIds`
- `hoursSnapshot`
- `lastSyncAt`
- `status`

Minimalny zakres dla Calendar:

- `connected`
- `calendarId`
- `lastSyncAt`
- `status`

### Pliki metadata

`/organizations/{orgId}/files/{fileId}`

Minimalny zakres:

- `googleDriveFileId`
- `kind`: `menu-image | invoice | contract | photo | export | other`
- `mimeType`
- `size`
- `checksum`
- `backupStatus`
- `linkedEntityType`
- `linkedEntityId`
- `venueId`
- `createdBy`
- `createdAt`
- `updatedAt`

## Safe-to-Eat V1

Wejście logiczne:

- `venue.currentWaitTime`
- `venue.kitchenOffsetMin`
- `venue.hours`
- `menuItem.basePrepTimeMin`

Formuła V1:

`safe = now + basePrepTimeMin + currentWaitTime < closingTime - kitchenOffsetMin`

Implementation detail:

- funkcja powinna operować na `venueId`, nie `restaurantId`
- wynik powinien zwracać `reasonCode` i składniki formuły

## Reactive Inventory V1

Źródła:

- `recipes`
- `ingredients`
- `inventoryLots`

Reguła V1:

- jeśli suma dostępnych partii składników potrzebnych do dania spada do zera, `menuItem.available = false`
- jeśli system ukrył danie automatycznie, `menuItem.reactiveHidden = true`

Nie mieszamy ręcznego ukrycia z automatycznym.

## Security Rules V1

Pierwsza wersja rules powinna wymuszać:

- odczyt danych organizacji tylko przy aktywnym membership
- write na danych operacyjnych tylko jeśli `permissions` zawierają wymaganą akcję
- logi tylko do odczytu dla ról managerskich i wyższych
- pliki metadata tylko gdy `resource.data.googleDriveFileId` istnieje i `orgId` zgadza się z membership

## Emulatory i seedowanie

Docelowo seedowanie dzielimy na trzy profile:

- `core`
- `demo`
- `integration`

### core

- users
- organizations
- venues
- memberships
- permissions

### demo

- menu
- bookings
- tables
- orders
- favorites
- przykładowe inventory

### integration

- mock metadata dla Drive
- mock metadata dla GBP
- mock metadata dla Calendar

## Kolejność wdrożenia

1. Ustalić i zamrozić model V1.
2. Rozbić typy domenowe i schemy Zod.
3. Ujednolicić membership source of truth.
4. Zmienić seedy emulatorów pod `core/demo/integration`.
5. Dopasować Firestore Rules.
6. Przenieść Safe-to-Eat na `venueId` i model V1.
7. Przenieść Reactive Inventory na `inventoryLots` i `recipes`.
8. Dopiero potem dopinać realne Google API.

## Co świadomie odkładamy poza V1

- OCR z Vision AI
- IoT sterowanie lokalem
- zaawansowany ranking Gastronauty i LMS
- backup orchestration do GCS
- pełną analitykę profitability

Te obszary zależą od poprawnego modelu bazowego i nie powinny blokować V1.