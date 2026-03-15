
---

## Pitch aplikacji gastroo.space

**Gastroo.space** to nowoczesna platforma SaaS dla gastronomii, która łączy potrzeby właścicieli restauracji, obsługi oraz klientów końcowych w jednym, skalowalnym ekosystemie. Oferuje zarządzanie lokalem, integracje online, mobilny POS oraz aplikację konsumencką z lojalnością i zamówieniami.

---

### Architektura (wysoki poziom)

- Next.js (App Router, SSR, PWA) + Material-UI
- Firebase (Auth, Firestore, Storage, Functions)
- Integracje: Google Business Profile, Google Drive, Pyszne.pl, Uber Eats, Wolt
- Warstwa API: /api/* (Next.js), Cloud Functions (integracje, automatyzacje)
- UI: panel właściciela, miniPOS, aplikacja konsumencka

---

### Główne filary funkcjonalne (roadmapa)

#### 1. Panel właściciela (B2B)
- Analityka, raporty, alerty (opinie, rezerwacje, obłożenie)
- Zarządzanie zespołem (role, grafiki, dostęp)
- Integracje: Google Business Profile, Pyszne.pl, Uber Eats, Wolt
- Edycja menu (publikacja do Google, dostawców, QR menu)
- Zarządzanie rezerwacjami i widocznością lokalu

#### 2. MiniPOS dla obsługi (B2B2C)
- Mobilny POS (zamówienia, rachunki, statusy stolików)
- Skanowanie QR klientów (punkty, promocje)
- Tryb offline, szybka synchronizacja

#### 3. Aplikacja konsumencka (B2C)
- Logowanie Google, wybór trybu (gastroołudek/konsument)
- Przeglądanie i filtrowanie lokali (menu, dostępność, udogodnienia)
- Ulubione, indywidualny QR, program lojalnościowy
- Zamawianie na wynos, odbiór, płatność przy odbiorze
- Wymiana punktów/gwiazdek na zniżki/promocje

---

### Plan rozwoju i porządek wdrażania funkcji

1. **MVP dla właściciela**: dashboard, zarządzanie menu, rezerwacje, integracja z Google, podstawowa analityka.
2. **POS dla obsługi**: szybkie zamówienia, statusy stolików, obsługa QR.
3. **Aplikacja konsumencka**: logowanie, przeglądanie lokali, ulubione, QR, lojalność.
4. **Zaawansowane integracje**: Pyszne.pl, Uber Eats, alerty, automatyzacje.
5. **Rozbudowa analityki i automatyzacji**: predykcje, rekomendacje, powiadomienia.
6. **Rozszerzenia B2B2C**: promocje, eventy, komunikacja z klientem.

---

**Cel:**
Stworzyć platformę, która automatyzuje i upraszcza zarządzanie gastronomią, zwiększa widoczność lokali, usprawnia obsługę i buduje lojalność klientów – wszystko w jednym, nowoczesnym ekosystemie.
## Repozytorium w pigułce (skrót dokumentacji)

**DEVELOPMENT.md**
- Wymagania: Node 18+, npm 9+, Firebase CLI
- Instalacja: `npm install` (główny katalog i `functions/`)
- `.env.local` z kluczami Firebase
- Komendy: `npm run dev`, `npm run build`, `npm run lint`, `npm run deploy:firebase`

**CHANGELOG.md**
- [0.1.1] – bezpieczeństwo Firestore, PWA, walidacja Zod, obsługa błędów, lepsze UX
- [0.1.0] – pierwsze wydanie: Next.js, Firebase, multi-lang, dashboard, Google OAuth, demo GbpConnector

**SECURITY.md**
- Reguły Firestore: dostęp tylko do własnych danych (userId)
- Autoryzacja: Google OAuth, sesje w localStorage
- Walidacja: Zod, sanitizacja inputów, obsługa błędów
- Checklist przed produkcją: test reguł, App Check, CORS, CSP, monitoring, audyt zależności

**PWA_GUIDE.md**
- PWA: manifest, service worker, offline fallback, meta tagi, ikony (72–512px, maskable, iOS)
- Instalacja: komponent InstallPWA, automatyczne wykrywanie instalacji
- Caching: NetworkFirst dla API, CacheFirst dla assetów, StaleWhileRevalidate dla obrazów/fontów

**IMPROVEMENTS_SUMMARY.md**
- Zabezpieczenia: reguły Firestore, walidacja Zod, sanitizacja inputów
- UX: Snackbar, ErrorBoundary, lepsze komunikaty błędów
- Refaktoryzacja: usunięcie testowych danych z komponentów, lepsza obsługa stanów

**todo.md**
- Backlog:
  - Faza 1: landing page, demo, logowanie, dashboard, RWD
  - Faza 2: integracja Google Business Profile, panel zarządzania
  - Backlog: granularne zadania dla rezerwacji, menu QR, zespołu, optymalizacje, update zależności
# AI Agent Guide (gastroo-space)

Ten plik zawiera praktyczne wskazówki dla agentów AI pracujących w tym repo: jak się poruszać po architekturze, gdzie są krytyczne miejsca, jak bezpiecznie wprowadzać zmiany i jak weryfikować poprawność.

## Szybki kontekst

- **Frontend/Backend**: Next.js (App Router) w `src/`
- **i18n routing**: wszystkie strony mają prefiks języka `/{lang}/...` (np. `/pl/...`), wymuszany przez `src/middleware.ts`
- **Firebase**: Firestore/Auth/Storage + Cloud Functions w `functions/`
- **Seed API** (App Router): `src/app/api/seed/*/route.ts`
- **Swagger UI seeds**: `src/app/[lang]/swagger/seed/page.tsx`, spec: `swagger-seed.yaml`, endpoint spec: `src/app/api/swagger/seed/route.ts`
- **Globalny motyw + tokeny UI**: `src/styles/theme.ts`, helper jednostek: `src/styles/units.ts`

## Architektura (UML)

- Diagram PlantUML: `docs/architecture.puml`

## Uruchamianie i podstawowe komendy

- Dev: `npm run dev`
- Lint: `npm run lint`
- Testy: `npm run test`
- Emulatory + dev: `npm run dev:emulators`
- Deploy: `npm run deploy:firebase`

## Struktura katalogów (najważniejsze)

- `src/app/[lang]/...` — UI i strony, layout, dashboard, login
- `src/app/api/**/route.ts` — API routes (App Router)
- `src/lib/firebase/config.ts` — Firebase **client** SDK (przeglądarka)
- `src/lib/firebase/admin.ts` — Firebase **admin** SDK (serwer/route handlers/Node runtime)
- `functions/src/*.ts` — Cloud Functions (Callable/HTTPS)
- `firestore.rules`, `storage.rules`, `database.rules.json` — reguły bezpieczeństwa
- `swagger-seed.yaml` — OpenAPI dla seedów

## Zasady zmian (Good Habits)

- **Minimalny zakres**: zmieniaj tylko to, co jest potrzebne do zadania; unikaj refactorów “przy okazji”.
- **Edge vs Node runtime**: jeśli używasz bibliotek Node (`crypto`, `fs`, streamy, `firebase-admin`), ustaw `export const runtime = 'nodejs'` w route handlerze.
- **Client vs Admin SDK**:
  - UI korzysta z `src/lib/firebase/config.ts` (rules enforced).
  - Serwerowe operacje uprzywilejowane rób przez `src/lib/firebase/admin.ts`.
- **i18n**: nowe strony UI dodawaj pod `src/app/[lang]/...`, inaczej middleware może przekierować/zepsuć routing.
- **Spójność API**: zmiany endpointów aktualizuj też w `swagger-seed.yaml` i (jeśli dotyczy) w UI Swagger.
- **Walidacja**: preferuj Zod dla payloadów (w `src/lib/validation/` jeśli pasuje do istniejących wzorców).
- **Weryfikacja**: uruchom lint na dotkniętych plikach i `npx tsc -p tsconfig.json --noEmit`; jeśli `tsc` czerwony przez niezwiązane katalogi, ogranicz weryfikację do obszaru zmian i opisz to w PR.

## Security (must-follow)

- **Sekrety**:
  - Nie commituj `.env*` z sekretami.
  - Nie loguj tokenów, kluczy, payloadów z danymi wrażliwymi.
- **Seed API**:
  - Chronione przez Firebase ID token (`Authorization: Bearer ...`) i/lub fallback `x-seed-admin-key` (ENV `SEED_ADMIN_KEY`).
  - Opcjonalne wymuszenie claimów admina: `SEED_REQUIRE_ADMIN_CLAIM=true`, `SEED_ADMIN_CLAIM` (domyślnie `seedAdmin`).
  - Przy zmianach auth zawsze sprawdź odpowiedzi `401/403` i aktualizuj swagger.
- **Reguły Firebase**:
  - Zmiany w modelu danych wymagają przeglądu `firestore.rules` / `storage.rules`.
- **Zewnętrzne zasoby**:
  - Swagger UI jest ładowany z CDN (`unpkg.com`). Jeśli to ma iść na prod, rozważ bundlowanie `swagger-ui-dist` lokalnie.

## TODO (dla agentów / backlog techniczny)

- Dodać automatyczny check (CI) na `px` w `src/` (np. `rg "\\b\\d+(?:\\.\\d+)?px\\b" src` ma zwracać pusty wynik).
- Dodać testy kontraktowe dla seed API (auth + happy path + błędy 400/401/403).
- Ustalić docelowy model autoryzacji seedów (preferowane: custom claims + tylko Bearer; rozważyć wyłączenie `SEED_ADMIN_KEY` na prod).
- Zredukować zależności od CDN w Swagger UI (vendor/local build).
- Doprecyzować listę kolekcji eksportowanych w seed export (teraz jest hardcoded przykładowo).

## Checklist przy PR

- [ ] Lint przechodzi dla zmienionych plików
- [ ] Swagger (jeśli dotyczy) zaktualizowany i parsuje się
- [ ] Brak logów z sekretami / tokenami
- [ ] Zmiany z Node-only zależnościami mają `runtime = 'nodejs'`
- [ ] Nie zmieniono reguł bezpieczeństwa bez przeglądu wpływu

## Schemat stylowania UI (motyw gastroo.space)

- **Minimalizm**: Unikaj zbędnych ozdobników, gradientów, cieni, efektów – UI ma być czysty, czytelny, lekki.
- **Kolory**:
  - Tło: #ffffff (jasny), #171717 (ciemny)
  - Tekst: #171717 (jasny), #f5f5f5/#ffffff (ciemny)
  - Akcenty: bardzo stonowane, bez jaskrawych barw, preferowane odcienie szarości, beżu, złota (np. #a67c37, #c5a059)
  - Kolory i tryb jasny/ciemny muszą być zgodne z systemowym motywem użytkownika (preferuj media query + switcher)
- **Jednostki**: Tylko rem, vw, vh, vmin, clamp – nie używaj px w stylach komponentów ani theme.
- **Helper jednostek**: używaj `vh()/vw()/vmin()` z `src/styles/units.ts` zamiast ręcznie pisać `calc(...)`.
- **Typografia**: font-family: 'system-ui, -apple-system, sans-serif'; rozmiary przez clamp, fontWeight 500/700/900, duże nagłówki, czytelne odstępy.
- **Border radius**: Tylko wartości z UI.radius z theme.ts (vmin), nie duplikuj wartości.
- **Spacing**: Używaj UI.space z theme.ts, nie wpisuj wartości "z palca".
- **Cienie**: Bardzo subtelne lub brak, korzystaj z UI.shadow z theme.ts.
- **Responsywność**: Wszystko musi być skalowalne, dotykowe elementy min. 44px (ale przez clamp/vw/vh).
- **ThemeRegistry.tsx**: Zawsze korzystaj z UI z theme.ts, nie duplikuj wartości, nie nadpisuj globalnych zmiennych CSS bez powodu.
- **globals.css**: Kolory bazowe i fonty muszą być zgodne z minimalistycznym motywem, nie nadpisuj ich lokalnie.
- **pos.tokens.ts**: Wszystkie rozmiary dla POS, numpada, dashboardu itp. tylko przez clamp/vw/vh/vmin.
- **Przykład**: Zobacz src/styles/theme.ts, src/styles/pos.tokens.ts, ThemeRegistry.tsx, globals.css.
- **Weryfikacja**: UI musi być spójny z gastroo.space/pl – jeśli coś odbiega, popraw.

## Notatki repo (praktyczne)

- Foldery generowane (`.next/`, `playwright-report/`, `test-results/`) traktuj jako build artifacts — nie refaktoruj tam stylów.
- `px` może występować w dokumentacji (`*.md`) i opisach PWA (np. rozmiary ikon) — zasada “bez px” dotyczy kodu UI w `src/`.
- Dokumenty robocze generowane przez agentów AI trzymaj wyłącznie w `docs/ai/`; nie dodawaj tymczasowych plików `.md` do root repo.
