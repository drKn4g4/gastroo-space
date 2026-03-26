# Technical Standards

Dokument norm technicznych dla gastroo-space.
Celem jest zapewnienie spojnosc implementacji, skalowalnosci i przewidywalnego UX na urzadzeniach mobilnych/desktop oraz w PWA.

## 1. NFR (non-functional requirements)

## 1.1 Wydajnosc

- p95 dla glownej nawigacji UI: <= 1200 ms (4G, mid-range mobile)
- p95 dla endpointow krytycznych `/api/*`: <= 800 ms
- p99 dla endpointow krytycznych `/api/*`: <= 1500 ms
- CLS: <= 0.1
- LCP: <= 2.5 s (docelowo), <= 3.0 s (akceptowalne)

## 1.2 Dostepnosc i niezawodnosc

- SLO miesieczne dostepnosci runtime: 99.9%
- Error budget: 0.1%
- Dla krytycznych mutacji API wymagane idempotency/retry-safe semantics

## 1.3 Bezpieczenstwo

- Brak sekretow w repo i logach
- Brak logowania tokenow OAuth i danych wrazliwych
- Reguly Firestore/Storage musza odzwierciedlac source-of-truth memberships

## 2. Wzorce skalowania

## 2.1 Skalowanie horyzontalne (primary)

Model preferowany: Firebase App Hosting (Cloud Run).

Wymagania:

- skalowanie przez `minInstances`, `maxInstances`, `concurrency`
- health/readiness endpointy (`/api/health`, `/api/ready`)
- brak lokalnego stanu sesyjnego in-memory krytycznego dla transakcji

Kiedy podnosic horyzontalnie:

- gdy p95/p99 rosna wraz z ruchem, a CPU nie jest stale nasycone per instancja
- gdy wystepuja bursty i timeouty przy stalej konfiguracji instancji

## 2.2 Skalowanie wertykalne (secondary)

Wymagania:

- podnoszenie `cpu`/`memoryMiB` po analizie metryk
- kazda zmiana wertykalna musi byc poprzedzona porownaniem p95/p99 i kosztu
- brak zwiekszania CPU/RAM "na zapas" bez twardych danych

Kiedy podnosic wertykalnie:

- przy CPU bound workload (render SSR, ciezkie transformacje)
- przy memory pressure (GC thrash, OOM, duze payloady)

## 2.3 Decyzje architektoniczne

- Runtime web: App Hosting/Cloud Run
- Async heavy tasks: Functions / workers + kolejki (Pub/Sub)
- Zasada: najpierw horyzontalnie, potem punktowo wertykalnie

## 3. Wzorce stylow UI (design + kod)

## 3.1 Zasady systemowe

- Uzywamy tokenow z [src/styles/theme.ts](src/styles/theme.ts)
- Uzywamy helperow jednostek z [src/styles/units.ts](src/styles/units.ts)
- Zakaz hardcoded `px` w kodzie UI w `src/`
- Spacing i radius tylko z `UI.space` i `UI.radius`

## 3.2 Responsywnosc i orientacja

- Layout musi dzialac w orientacji pionowej i poziomej
- Dotykowe hit area >= 44 CSS px (osiagane przez `clamp` i tokeny)
- Brak poziomego scrolla dla viewportow mobilnych

## 3.3 Typografia i kontrast

- Typografia przez `clamp(...)`
- Kontrast min. WCAG AA dla tekstu i elementow interaktywnych
- Tryb jasny/ciemny zgodny z motywem i tokenami

## 4. Standard PWA i offline

## 4.1 Cache strategy

- GET `/api/*`: `NetworkFirst`
- statyczne assets: `CacheFirst` lub `StaleWhileRevalidate`
- mutacje `POST /api/*`: Workbox Background Sync queue (gdy flaga wlaczona)

## 4.2 Minimalna macierz urzadzen

Wymagane testy reczne lub e2e snapshot na co najmniej:

- Mobile small portrait: 360x640
- Mobile small landscape: 640x360
- Mobile large portrait: 430x932
- Tablet portrait: 768x1024
- Tablet landscape: 1024x768
- Desktop: >= 1280x800

Kryteria akceptacji na kazdym profilu:

- brak overlap komponentow
- brak obcinania CTA i formularzy
- menu/nawigacja pozostaje klikalna
- flow offline nie gubi mutacji POST po reconnect

## 5. Feature flags i profile srodowisk

- Profile: `config/feature-flags/dev.env`, `stage.env`, `prod.env`
- Selector: `FEATURE_FLAG_PROFILE=dev|stage|prod`
- Guard:
  - soft mode: `npm run flags:validate`
  - strict mode: `npm run flags:validate:strict`

Wymaganie:

- nowa flaga musi byc dodana w trzech miejscach:
  1. profile env,
  2. walidator guard,
  3. dokumentacja runtime.

## 6. Definition of Done dla zmian technicznych

Zmiana jest gotowa do merge tylko gdy:

- przechodzi lint/test/build,
- przechodzi `flags:validate:strict`,
- nie narusza zasad stylow UI (tokeny + bez `px`),
- nie obniza SLO/SLI bez uzgodnionego wyjątku,
- zawiera aktualizacje dokumentacji, jesli zmienia runtime, routing, flagi lub skalowanie.
