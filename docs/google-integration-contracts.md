# Google Integration Contracts

Ten dokument ustala kontrakty danych dla integracji Google w gastroo-space.

## Cel

Rozdzielamy dwa poziomy danych:

- sekrety i tokeny OAuth per user
- metadata integracji i stan sync per organization

To pozwala zachować bezpieczne przechowywanie tokenów oraz spójny model operacyjny dla organizacji.

## Source of truth

### 1. Tokeny użytkownika

Ścieżki:

- `/users/{uid}/integrations/drive`
- `/users/{uid}/integrations/gbp`

Te dokumenty są prywatne i nie powinny być używane przez UI jako główne źródło statusu organizacji.

Przechowują wyłącznie dane wymagane do OAuth refresh i wywołań API Google.

### 2. Metadata organizacji

Ścieżki docelowe:

- `/organizations/{orgId}/integrations/googleDrive`
- `/organizations/{orgId}/integrations/googleBusinessProfile`
- `/organizations/{orgId}/integrations/googleCalendar`
- `/organizations/{orgId}/files/{fileId}`

To jest warstwa operacyjna dla aplikacji, raportów, rules i synców.

## Kontrakty dokumentów

### Google Drive

Dokument:

- `/organizations/{orgId}/integrations/googleDrive`

Pola:

- `connected: boolean`
- `rootFolderId: string | null`
- `serviceMode: metadata-only | sync | backup`
- `lastSyncAt: ISO datetime | null`
- `status: not_connected | pending | connected | degraded | error`
- `updatedAt: ISO datetime | null`
- `createdAt: ISO datetime | null`

### Google Business Profile

Dokument:

- `/organizations/{orgId}/integrations/googleBusinessProfile`

Pola:

- `connected: boolean`
- `accountId: string | null`
- `locationIds: string[]`
- `hoursSnapshot: unknown`
- `lastSyncAt: ISO datetime | null`
- `status: not_connected | pending | connected | degraded | error`
- `updatedAt: ISO datetime | null`
- `createdAt: ISO datetime | null`

### Google Calendar

Dokument:

- `/organizations/{orgId}/integrations/googleCalendar`

Pola:

- `connected: boolean`
- `calendarId: string | null`
- `lastSyncAt: ISO datetime | null`
- `status: not_connected | pending | connected | degraded | error`
- `updatedAt: ISO datetime | null`
- `createdAt: ISO datetime | null`

### Files metadata

Dokument:

- `/organizations/{orgId}/files/{fileId}`

Pola:

- `googleDriveFileId: string`
- `kind: menu-image | invoice | contract | photo | export | other`
- `mimeType: string`
- `size: number`
- `checksum: string`
- `backupStatus: pending | done | failed`
- `linkedEntityType: string`
- `linkedEntityId: string`
- `venueId: string | null`
- `createdBy: string`
- `createdAt: ISO datetime | null`
- `updatedAt: ISO datetime | null`

## Kontrakty callable functions

### Drive

- `driveConnect({ code, orgId? })`
- `driveDisconnect()`
- `driveGetStatus()` -> `{ connected, connected_at? }`
- `driveListFiles({ folderId })` -> `{ files }`
- `driveGetFile({ fileId })` -> `{ content, mimeType }`
- `driveProvision({ folderName, orgId? })` -> `{ rootFolderId, menuFolderId?, staffFolderId? }`

### GBP

- `gbpConnect({ code, orgId? })`
- `gbpGetStatus()` -> `{ connected }`
- `gbpGetLocations()` -> `{ locations }`

## Zasady wdrożeniowe

1. UI czyta status głównie z dokumentów organizacji, nie z token docs usera.
2. Funkcje mogą nadal używać user token docs do wywołań Google API.
3. Po udanym connect/sync funkcje powinny aktualizować także dokument organizacji.
4. `files` jest jedyną warstwą metadata dla plików Google Drive używanych przez organizację.
5. Nie zapisujemy binarnych payloadów do Firestore.

## Stan repo po tej zmianie

- wspólne typy kontraktów: `src/types/domain/integrations.ts`
- walidacja Zod: `src/lib/validation/integrationsSchema.ts`
- testy walidacji: `src/lib/validation/__tests__/integrationsSchema.test.ts`

Kolejny krok implementacyjny to dual-write z functions do dokumentów `/organizations/{orgId}/integrations/*` po udanym OAuth i po syncach Google API.
