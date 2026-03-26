# Project Documentation

Dokument glowny projektu gastroo-space. To punkt wejscia do architektury, modulow, danych i operacji.

## 1. Cel projektu

Gastroo-space to platforma dla gastronomii laczaca:

- panel wlasciciela (zarzadzanie lokalem, zespolem, menu, rezerwacjami),
- obsluge lokalu (operacje sali, floorplan, harmonogram),
- klienta koncowego (odkrywanie lokali, lojalnosc, QR, zamowienia i rezerwacje).

## 2. Stos technologiczny

- Frontend/SSR: Next.js (App Router), React, MUI
- i18n: i18next
- Backend aplikacyjny: Next API routes + Firebase App Hosting
- Backend eventowy/integracje: Firebase Functions
- Baza danych: Firestore
- Auth/Storage: Firebase Auth + Firebase Storage
- Integracje zewnetrzne: Google Drive, Google Business Profile, Google Calendar, Google Chat
- Testy: Vitest, Playwright

## 3. Architektura logiczna

### 3.1 Warstwa UI

- Routing jezykowy: `src/app/[lang]/*`
- Kluczowe obszary: dashboard, floorplan, schedule, chat, integrations, bookings
- PWA/offline: service worker przez next-pwa + strategia cache + offline queue dla mutacji POST `/api/*`

### 3.2 Warstwa API (Next)

- Endpointy aplikacyjne: `src/app/api/**/route.ts`
- Operacje z uprawnieniami domenowymi: role/permissions
- Obsluga flow seed/sync/import/export i endpointow pomocniczych (Swagger seed)
- Seed API ma kanoniczny kontrakt payloadu `{ firestore, meta }` z `schemaVersion`.
- Import seedow wspiera tryby `strict` i `best-effort` oraz profile kolekcji `core|demo|integration`.

### 3.3 Warstwa serverless (Firebase)

- Firebase Functions dla integracji i asynchronicznej logiki biznesowej
- Dedykowane funkcje dla Google API i automatyzacji

### 3.4 Dane i reguly

- Firestore jako source of truth
- Security rules: `firestore.rules`, `storage.rules`, `database.rules.json`
- Kontrakty integracji i model V1 opisane w dedykowanych dokumentach

## 4. Moduly funkcjonalne

### 4.1 Dashboard i operacje

- podglad stanu lokalu,
- floorplan (sekcje, przypisania stolikow, merge/unmerge, presety eventowe),
- harmonogram i dyspozycje zespolu,
- szybkie akcje operacyjne.

### 4.2 Rezerwacje

- kalendarz rezerwacji,
- CRUD rezerwacji,
- eksport/quick-link do Google Calendar.

### 4.3 Integracje

- Google Drive (metadane/pliki),
- GBP (lokalizacje i statusy),
- Google Calendar,
- Google Chat (konfiguracja webhook + wysylka).

### 4.4 Menu i inventory

- kategorie i pozycje menu,
- widocznosc i dostepnosc pozycji,
- podstawa pod reactive inventory i logike safe-to-eat.

## 5. Routing i i18n

- Glowna konwencja: wszystkie strony pod prefiksem jezyka
- Przykklad: `/pl/dashboard/...`
- Slowniki: `public/locales/*`

## 6. Feature flags i profile srodowisk

- Profile: `config/feature-flags/dev.env`, `stage.env`, `prod.env`
- Walidacja flag: `scripts/validate-feature-flags.sh`
- Start z profilem: `FEATURE_FLAG_PROFILE=dev|stage|prod`
- Podglad aktywnych flag: `npm run dev:flags`

## 7. DevOps i deployment

### 7.1 Strategia release

- Strategia B: App Hosting jako glowny kanal release
- Unikanie podwojnych torow deployu (Hosting + App Hosting) dla tych samych artefaktow runtime

### 7.2 Pipeline

- CI: lint, test, build, docker build, container smoke
- Dodatkowy job kontraktowy Seed API uruchamia sie warunkowo przy zmianach seedowych.
- Deploy produkcyjny: skrypt `scripts/deploy-firebase.sh` + App Hosting backend deploy

### 7.3 Skalowanie

- runConfig w `apphosting.yaml` (min/max instances, concurrency, cpu, memory)
- monitorowanie p95/p99, 5xx, cold starts, kosztu instancji
- szczegolowe standardy NFR/scaling/responsive PWA: `docs/technical-standards.md`

## 8. Tryb offline i odpornosc

- PWA cache strategy dla statycznych zasobow i API GET
- Background Sync queue dla POST `/api/*` (gdy wlaczona flaga)
- Priorytet: brak utraty mutacji przy chwilowym braku lacznosci

## 9. Testowanie i jakosc

- Unit/integration: Vitest
- E2E/UI: Playwright
- Smoke load/perf: k6 (profil podstawowy)
- Guardy operacyjne: health/readiness endpointy
- Kontrakt Seed API: `npm run test:seed:contracts` (round-trip format + testy integracyjne endpointow)

## 10. Mapa dokumentacji szczegolowej

- Standardy techniczne (NFR, style, skalowanie, PWA): [docs/technical-standards.md](docs/technical-standards.md)
- Architektura: [docs/architecture.puml](docs/architecture.puml)
- Runtime env + routing: [docs/env-driven-runtime.md](docs/env-driven-runtime.md)
- Skalowanie i konteneryzacja: [docs/scalability-and-containerization.md](docs/scalability-and-containerization.md)
- Model danych V1: [docs/firestore-v1-plan.md](docs/firestore-v1-plan.md)
- Kontrakty Google integracji: [docs/google-integration-contracts.md](docs/google-integration-contracts.md)
- Gotowosc produkcyjna: [docs/production-readiness-checklist.md](docs/production-readiness-checklist.md)

## 11. Praktyczny onboarding (10 minut)

1. `npm ci` oraz `npm --prefix functions install`
2. `npm run dev:start`
3. `npm run dev:flags`
4. otworz dashboard pod aktywnym prefiksem jezyka
5. sprawdz health/readiness i flow kluczowych modulow
