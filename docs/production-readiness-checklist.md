# Production Readiness Checklist

Ta checklista porządkuje wymagania przed pierwszym wdrożeniem produkcyjnym gastroo-space.

## 1. Środowisko i sekrety

- [ ] Wszystkie sekrety są poza repo i poza `.env*` commitowanym do gita.
- [ ] Ustawione są produkcyjne wartości dla Firebase, Google OAuth i integracji zewnętrznych.
- [ ] `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` wskazują na domenę produkcyjną.
- [ ] Produkcyjny projekt Firebase ma oddzielne zasoby od dev/emulatorów.
- [ ] Włączony jest App Check dla kluczowych usług klienckich.

## 2. Firestore i model danych

- [ ] Produkcja używa modelu memberships z `users/{uid}/memberships/{orgId}` jako source of truth.
- [ ] Legacy fallback do `organizations/{orgId}/members/{uid}` jest utrzymany tylko tam, gdzie potrzebny do migracji.
- [ ] Seedy demo nie są uruchamiane przeciwko produkcji.
- [ ] Kolekcje `organizations/{orgId}/integrations/*`, `organizations/{orgId}/files/*` i `organizations/{orgId}/logs/*` mają ustalone kontrakty i są używane spójnie.
- [ ] Indeksy Firestore są zsynchronizowane z realnymi query aplikacji.

## 3. Security Rules

- [ ] `firestore.rules` przeszły review wpływu na source-of-truth memberships.
- [ ] `storage.rules` są dopasowane do docelowego modelu plików i ról.
- [ ] Brak publicznego write tam, gdzie nie jest jawnie wymagany produktowo.
- [ ] Reguły zostały przetestowane na krytycznych ścieżkach owner/admin/manager/staff.
- [ ] Brak zależności od dev-only obejść lub tymczasowych wyjątków bezpieczeństwa.

## 4. API i Functions

- [ ] Endpointy App Router mają poprawny runtime `nodejs`, jeśli używają `firebase-admin` lub Node APIs.
- [ ] Callable Functions mają jawnie opisane request/response contracts.
- [ ] Safe-to-Eat działa na `venueId` z kontrolowanym fallbackiem legacy.
- [ ] Reactive Inventory obsługuje `inventoryLots` i loguje zmiany do `organizations/{orgId}/logs`.
- [ ] Brak logowania tokenów OAuth, refresh tokenów, sekretów i wrażliwych payloadów.

## 5. Google Integrations

- [ ] Tokeny OAuth użytkownika są trzymane tylko w prywatnych dokumentach użytkownika.
- [ ] Metadata integracji organizacji jest dual-write do `organizations/{orgId}/integrations/*`.
- [ ] Google Drive używa ustalonego kontraktu `files` metadata zamiast trzymania binariów w Firestore.
- [ ] Google Business Profile ma ustalony mapping `locationIds`, `hoursSnapshot` i status sync.
- [ ] Google Calendar ma zdefiniowany model `calendarId`, kierunek sync i ownera operacyjnego.
- [ ] Redirect URIs Google są zgodne z domeną produkcyjną i whitelisted.

## 6. Frontend i UX

- [ ] Build Next.js przechodzi bez ostrzeżeń blokujących deploy.
- [ ] Krytyczne flow działają na mobile i desktop.
- [ ] Logowanie i przełączanie organizacji/lokalu działają bez zależności od danych demo.
- [ ] Brak ukrytych odwołań do `demo-org`, testowych PINów i hardcoded środowiska emulatorów.
- [ ] PWA ma poprawny manifest, service worker i fallback offline zgodnie z planem produktu.

## 7. Dokumentacja i kontrakty

- [ ] Swagger dla Seed API jest aktualny i parsuje się bez błędów.
- [ ] UI Swagger pokazuje aktualny zestaw endpointów seed i members.
- [ ] Kontrakty Google są zapisane i zgodne z implementacją.
- [ ] README opisuje aktualne komendy dev, seed i testy.
- [ ] Dokumenty robocze AI pozostają wyłącznie w `docs/ai/`.

## 8. Testy i walidacja

- [ ] Przechodzą testy jednostkowe walidacji i permissions.
- [ ] Przechodzą testy API dla krytycznych endpointów auth/400/403.
- [ ] Przechodzą testy Functions dla Safe-to-Eat i Reactive Inventory helperów.
- [ ] Jest smoke test produkcyjnych integracji Google na osobnym sandboxie.
- [ ] Jest ręczny checklist test dla dashboard, bookings, menu, team i integrations.

## 9. Observability i operacje

- [ ] Włączone są logi aplikacyjne i alerty dla Functions.
- [ ] Jest minimum monitoringu błędów klienta i serwera.
- [ ] Błędy integracji Google mają statusy możliwe do pokazania w UI.
- [ ] Backup i disaster recovery są opisane dla krytycznych danych operacyjnych.
- [ ] Zespół zna procedurę rollbacku dla deployu Firebase/Next.js.

## 10. Release gate

Wdrożenie jest gotowe dopiero wtedy, gdy wszystkie poniższe warunki są spełnione:

- [ ] brak czerwonych testów dla obszaru release
- [ ] brak otwartych blockerów bezpieczeństwa
- [ ] brak dev-only danych i flag w buildzie produkcyjnym
- [ ] potwierdzony smoke test po deployu
- [ ] właściciel produktu akceptuje zakres MVP produkcyjnego

## Minimum przed pierwszym deployem MVP

Jeśli trzeba ciąć zakres, nie schodzimy poniżej tego minimum:

- [ ] memberships + rules + auth context są spójne
- [ ] bookings, menu i team działają end-to-end
- [ ] Safe-to-Eat i Reactive Inventory nie psują publikacji menu
- [ ] Google Drive i GBP mają przynajmniej poprawny status i podstawowy connect flow
- [ ] monitoring błędów i rollback są przygotowane
