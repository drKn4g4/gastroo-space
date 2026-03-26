# 🔧 Plan naprawczy — Audyt gastroo.space (2026-03-25)

> Priorytetyzowana lista zadań wynikających z audytu aplikacji.
> Oznaczenia: 🔴 P0 (krytyczne), 🟡 P1 (przed produkcją), 🟢 P2 (backlog)

---

## 🔴 P0 — Krytyczne (naprawić natychmiast)

### P0-1: ✅ React Hooks wywoływane warunkowo w `space/page.tsx`
- [x] Przenieść `useRef` (L91), `useCallback` (L95, L106, L111) **przed** wczesne `if (!user) return null` (L84)
- **Plik:** `src/app/[lang]/space/page.tsx`
- **Dlaczego:** Naruszenie zasad React Hooks → crash w runtime, 4 ESLint errors
- **Złożoność:** Niska (~15 min)

### P0-2: ✅ Bookings sub-collection `create: if true` — brak autoryzacji
- [x] Zmienić `allow create: if true` na `allow create: if isAuthenticated()` (lub dodać walidację pól)
- [ ] Rozważyć dodanie rate limiting przez Cloud Function zamiast bezpośredniego zapisu
- **Plik:** `firestore.rules` L169
- **Dlaczego:** Niezalogowani użytkownicy mogą tworzyć nieograniczoną liczbę rezerwacji → spam/DDoS
- **Złożoność:** Niska (~10 min)

### P0-3: ✅ Invites `update` — zbyt szerokie uprawnienia
- [x] Zmienić L154 z `request.auth != null` na sprawdzenie emaila zaproszenia:
  ```
  allow update: if hasRole(orgId, ['owner', 'admin', 'manager'])
                || (request.auth != null && resource.data.email == request.auth.token.email);
  ```
- **Plik:** `firestore.rules` L154
- **Dlaczego:** Każdy zalogowany user może modyfikować dowolne zaproszenie
- **Złożoność:** Niska (~10 min)

---

## 🟡 P1 — Przed produkcją

### P1-1: ✅ Naprawić błędy TypeScript
- [x] **i18next `count` type** — Landing page (`src/app/[lang]/page.tsx`):
  - Zmienić `{ count: string }` → `{ count: number }` (L217, L224, L231, L266, L274, L282)
- [x] **Google Maps icon** — `LocationsMapView.tsx` L360 (Zaktualizowane definicje typów rzecznych)
- [x] **Test globals** — `seed-format.test.ts`:
  - W `vitest.config.ts` zweryfikowano `globals: true`
  - W `tsconfig.json` dodano `"types": ["vitest/globals"]`
- [x] **Fixture desync** — `tests/global-setup.ts` L255:
  - Dodano `bookings` do `seedData` w `tests/fixtures/index.ts`
- **Złożoność:** Średnia (Gotowe)

### P1-2: ✅ Ograniczyć write na Shifts i TodoTasks
- [x] `shifts` (L203): Manager+ dla aktualizacji i usuwania
- [x] `todoTasks` (L241): Manager+ dla aktualizacji i usuwania, lub autor zadania
- **Plik:** `firestore.rules` L201-204, L239-242 (Gotowe)
- **Złożoność:** Niska (Gotowe)

### P1-3: ✅ Usunąć `userScalable: false` (WCAG 2.1 AA)
- [x] W root `src/app/layout.tsx` L20 — usunąć `userScalable: false` i `maximumScale: 1`
- [x] Zostawić tylko: `width: 'device-width'`, `initialScale: 1`
- **Dlaczego:** Blokuje zoom na mobilkach — naruszenie dostępności
- **Złożoność:** Niska (~5 min)

### P1-4: ✅ Przenieść `prettier` do devDependencies
- [x] `npm install --save-dev prettier && npm uninstall prettier && npm install --save-dev prettier`
  (lub ręcznie przenieść w `package.json`)
- **Plik:** `package.json` L70
- **Złożoność:** Niska (~5 min)

### P1-5: ✅ Usunąć duplicate CSS-in-JS
- [x] Wybrano Emotion (domyślny MUI)
- [x] Usunięto `styled-components` i `@mui/styled-engine-sc` z dependencies (Gotowe)
- **Pliki:** `package.json` L50-51, L76
- **Złożoność:** Średnia (Gotowe)

### P1-6: ✅ Walidacja Zod w Cloud Functions
- [x] Dodać schematy Zod do: `driveConnect`, `driveListFiles`, `driveGetFile`, `driveProvision` (Completed)
- [x] Powtórzyć dla: `calendar.ts`, `workspace.ts`, `gbp.ts`, `loyalty.ts` (Completed)
- **Pliki:** `functions/src/*.ts`
- **Złożoność:** Średnia-wysoka (Gotowe)

### P1-7: ✅ Dodać CI pipeline (GitHub Actions)
- [x] Stworzyć/Naprawić `.github/workflows/ci.yml` (Completed - port 5202 fix, test health check)
- [x] Opracować contract testy i linty (Gotowe)
- **Złożoność:** Średnia (Gotowe)

---

## 🟢 P2 — Backlog / Usprawnienia

### P2-1: Refaktor BookingCalendarView (1142 LOC)
- [ ] Wyodrębnić: `CalendarGrid.tsx`, `BookingList.tsx`, `BookingDialog.tsx`, `BookingFilters.tsx`
- [ ] Przenieść logikę Firestore do custom hooka `useBookings()`
- **Plik:** `src/app/[lang]/components/BookingCalendarView.tsx`
- **Złożoność:** Wysoka (~4-6h)

### P2-2: ✅ Refaktor drive.ts (1052 LOC)
- [x] Podzielić na: `functions/src/drive/auth.ts`, `drive/files.ts`, `drive/folders.ts`, `drive/mock.ts`, `drive/utils.ts`
- [x] Zintegrowano walidację Zod i ujednolicono moduły.
- **Złożoność:** Średnia (Gotowe)

### P2-3: Wyodrębnić warstwę repository
- [ ] Stworzyć `src/lib/repositories/bookingRepository.ts` — enkapsulacja Firestore queries
- [ ] `restaurantRepository.ts`, `memberRepository.ts`, etc.
- [ ] Hooki/komponenty korzystają z repository zamiast bezpośrednich wywołań Firestore
- **Złożoność:** Wysoka (~6-8h, inkrementalnie)

### P2-4: Paginacja collectionGroup restaurants
- [ ] Dodać `limit()` + infinite scroll w `space/page.tsx`
- [ ] Alternatywnie: geohash-based filtering (bliskość)
- **Złożoność:** Średnia (~2h)

### P2-5: ✅ Użyć `next/image` zamiast `<img>`
- [x] Przejrzano `component="img"` w `MenuItemPhotoUpload.tsx` i `menu/page.tsx`
- [x] Zamieniono na `<Image>` z `next/image` (auto-optymalizacja, lazy loading)
- [x] Dodano `remotePatterns` do `next.config.ts` (Google Drive)
- **Złożoność:** Niska-średnia (Gotowe dla kluczowych widoków)

### P2-6: Naprawić 161 ESLint warnings (W trakcie)
- [x] **Batch 0** (Firebase Config): Usunięto `any` i poprawiono typowanie `globalThis`
- [x] **Batch 1** (Critical + Types): Naprawiono conditionally called hooks, `any` w gcal hooku, missing `t` dependencies, unused vars w mapach.
- [x] **Regresja:** Przywrócono brakujące pole `location` w interfejsie `Restaurant` po podziale domen.
- [ ] **Batch 2** (~30 × `no-explicit-any`): Stopniowo typować, zaczynając od hooków i providerów
- [ ] **Batch 3** (~10 × `no-unused-vars`): Usunąć nieużywane importy/zmienne
- [ ] **Batch 4** (~8 × `no-console`): Zamienić `console.log` na logger lub usunąć
- **Złożoność:** Średnia (Inkrementalnie)

### P2-7: Dodać monitoring (Sentry / Firebase Crashlytics)
- [ ] Zainstalować `@sentry/nextjs` lub skonfigurować Firebase Performance + Crashlytics
- [ ] Wrap `ErrorBoundary` z raportowaniem do Sentry
- [ ] Dodać source maps upload do CI
- **Złożoność:** Średnia (~2h)

### P2-8: Rozbudować testy
- [ ] Unit testy: hooki (`usePermissions`, `useDriveIntegration`, `useAsyncQuery`)
- [ ] Unit testy: providery (`AuthProvider`, `OrganizationProvider`)
- [ ] Contract testy: seed API (auth + happy path + 400/401/403)
- [ ] Cel: >40% line coverage
- **Złożoność:** Wysoka (~8-12h, inkrementalnie)

### P2-9: ✅ Podzielić `collections.ts` na domeny
- [x] `src/types/domain/user.ts` — `UserProfile`, `GastronautProfile`, `CvEntry`, etc.
- [x] `src/types/domain/restaurant.ts` — `Restaurant`, `Table`, `Booking`, etc.
- [x] `src/types/domain/menu.ts` — `MenuItem`, `MenuCategory`, `Recipe`, etc.
- [x] `src/types/domain/loyalty.ts` — `LoyaltyCard`, `LoyaltyAccount`, etc.
- [x] Re-export z `collections.ts` — pełna kompatybilność wsteczna.
- **Złożoność:** Średnia (Gotowe)

### P2-10: ✅ Usunąć duplikat reguły memberships read
- [x] `firestore.rules` — usunięto redundancję w regułach ewidencji PINpad
- **Złożoność:** Niska (Gotowe)

### P2-11: ✅ Niespójne metadata w layoutach
- [x] Root `src/app/layout.tsx` — manifest: `/manifest.webmanifest.json` (Poprawiono na `.webmanifest`)
- [x] `[lang]/layout.tsx` — manifest: `/manifest.webmanifest`
- [x] Ujednolicono ikony apple (ustawiono na `icon-192x192.png`) i upewniono się, że plik manifestu jest spójny.
- **Złożoność:** Niska (Gotowe)

---

## Szacunkowy harmonogram

| Faza | Zakres | Szacunek czasu |
|---|---|---|
| **Sprint 1** | P0-1, P0-2, P0-3, P1-3, P1-4 | ~1h |
| **Sprint 2** | P1-1, P1-2, P1-5 | ~3h |
| **Sprint 3** | P1-6, P1-7 | ~4-5h |
| **Backlog** | P2-1 … P2-11 | ~30-40h (inkrementalnie) |

---

> [!TIP]
> **Rekomendacja:** Zacznij od Sprint 1 (P0 + quick wins z P1) — to 1h pracy, a załatwia najbardziej krytyczne problemy bezpieczeństwa i poprawności kodu.
