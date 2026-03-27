# CLAUDE.md — gastroo.space

Instrukcje dla agentów AI. Stosuj natychmiast i bezwzględnie.

---

## 1. Projekt

**gastroo.space** — platforma SaaS dla gastronomii: panel właściciela (B2B), miniPOS dla obsługi, aplikacja konsumencka (B2C). Stack: Next.js (App Router), React, MUI, Firebase (Auth/Firestore/Storage/Functions), i18next (pl/en).

Architektura logiczna: `docs/project-documentation.md`
Diagram UML: `docs/architecture.puml`

---

## 2. Komendy

```bash
# Development
npm run dev                    # Next.js dev server
npm run dev:start              # Emulatory + Next.js (preferowany tryb pracy)
npm run dev:start:clean        # Reset emulatorów + start
npm run dev:flags              # Podgląd aktywnych feature flag

# Seed
npm run seed:unified           # Pełny seed (org + team + restaurant + menu)
npm run seed:core              # Seed bazowy (users + org)
npm run seed:demo              # Seed demo

# Test & Lint
npx vitest run                 # Testy jednostkowe/biznesowe
npm run lint                   # ESLint
npm run lint:px                # Weryfikacja zakazu px w src/
npx tsc -p tsconfig.json --noEmit  # TypeScript check

# Deploy
npm run deploy:firebase        # Deploy na Firebase/GCP
npm run deploy:env:check       # Walidacja env przed deploy
npm run deploy:smoke -- --base-url <url>  # Smoke test po deploy
```

Szczegóły emulatorów: `EMULATORS.md`

---

## 3. Struktura katalogów

```
src/app/[lang]/...             — UI i strony (routing językowy, i18n prefix)
src/app/api/**/route.ts        — API routes (App Router)
src/lib/firebase/config.ts     — Firebase client SDK (przeglądarka)
src/lib/firebase/admin.ts      — Firebase admin SDK (serwer/Node runtime)
src/lib/api/auth.ts            — Middleware auth (withAuth, requirePermission)
src/lib/firebase/collections.ts — Firestore interfaces (authoritative schema)
src/styles/theme.ts            — UI tokens (vmin/vw/vh)
src/styles/pos.tokens.ts       — POS tokens (clamp)
src/styles/units.ts            — Helpery jednostek: vh(), vw(), vmin()
functions/src/*.ts              — Cloud Functions
firestore.rules                — Reguły bezpieczeństwa Firestore
```

---

## 4. Reguły krytyczne

### 4.1 Multi-tenancy — Reguła Złotego Organizatora

**Zakaz globalnych odpytań. Zero cross-org queries.**

- Każdy odczyt/zapis MUSI zaczynać się od `organizations/{orgId}/...`
- Niejawne kolekcje globalne = potencjalny wyciek B2B
- Wszystkie API endpoints zabezpieczone `withAuth` + `requirePermission(context, 'nazwa.uprawnienia')`

### 4.2 CSS — Rygor "No-PX"

**Zakaz hardcoded `px` w kodzie UI wewnątrz `src/`.** Wyjątki: border-width, media-query tricks. Weryfikacja: `npm run lint:px`.

Dwa systemy tokenów:

| System | Plik | Zastosowanie |
|--------|------|-------------|
| **UI** | `src/styles/theme.ts` | Layout ogólny: `vmin()`, `vw()`, `vh()` z ref viewport 768x1024 |
| **T** | `src/styles/pos.tokens.ts` | POS/dotyk: `clamp(min, preferred, max)`, min touch >44px |

- Stylowanie wyłącznie przez MUI `sx={...}` (Emotion). Zakaz styled-components.
- Spacing z `UI.space`, radius z `UI.radius`, nie "z palca".

Pełna dokumentacja tokenów: `TOKENS.md`

### 4.3 Konwencje commitów

Conventional Commits, opis 5-6 słów:
- `feat:` nowa funkcjonalność
- `fix:` poprawka
- `chore:` narzędzia dev, konfiguracja, docs
- `refactor:` przepisanie logiki

### 4.4 Rejestrowanie pracy

- Po kluczowych zmianach zaktualizuj `CHANGELOG.md` (format: sprint/data/zakres)
- Backlog: `docs/ai/backlog.md`

---

## 5. Zasady zmian

- **Minimalny zakres** — zmieniaj tylko to, co potrzebne; nie refaktoryzuj "przy okazji"
- **Edge vs Node runtime** — jeśli używasz Node-only (`crypto`, `fs`, `firebase-admin`): `export const runtime = 'nodejs'` w route handler
- **Client vs Admin SDK** — UI: `src/lib/firebase/config.ts` (rules enforced). Serwer: `src/lib/firebase/admin.ts`
- **i18n** — nowe strony UI pod `src/app/[lang]/...`
- **Walidacja** — Zod dla payloadów (`src/lib/validation/`)
- **Swagger** — zmiany endpointów aktualizuj w `swagger-seed.yaml`

---

## 6. Security

- Nie commituj `.env*` z sekretami, nie loguj tokenów
- Seed API chronione przez Bearer token + fallback `x-seed-admin-key`
- Zmiany modelu danych wymagają przeglądu `firestore.rules` / `storage.rules`
- Swagger UI z CDN (`unpkg.com`) — na prod rozważ local bundle

---

## 7. Stylowanie UI

- **Minimalizm**: czysty, czytelny, bez zbędnych gradientów/cieni
- **Kolory**: jasny #ffffff/#171717, ciemny #171717/#f5f5f5, akcenty: stonowane szarości/beże/złoto (#a67c37)
- **Dark/light mode**: zgodny z systemowym motywem użytkownika
- **Typografia**: system-ui, sans-serif; rozmiary przez clamp
- **Responsywność**: skalowalne, touch targets min. 44px (przez clamp/vw/vh)
- **ThemeRegistry**: `src/app/[lang]/components/ThemeRegistry.tsx` — korzystaj z `UI` i `T`, nie duplikuj wartości

---

## 8. CI/CD Pipeline

### CI (`ci.yml`) — push na main + PRki
```
1. Secrets scan     — Gitleaks (parallel)
2a. Lint app        — eslint . (parallel)
2b. Lint functions  — eslint functions/ (parallel)
3. Unit tests       — vitest (parallel)
4a. Build app       — next build (after 1+2a+3)
4b. Build functions — tsc (after 1+2b)
```

### CD (`firebase-hosting-merge.yml`) — push na main (bez CHANGELOG/package.json)
```
1. Resolve environment — staging (auto) / production (manual dispatch)
2. Bump version        — auto changelog + version bump
3. Validate env vars   — scripts/validate-deploy-env.sh --strict
4. Build               — functions + next.js app
5. Deploy to Firebase  — functions, firestore rules, storage rules, remote config, app hosting
6. Post-deploy smoke   — smoke tests (optional)
```

### GitHub Environments & Secrets
- Secrets stored per-environment: `staging` and `production` in GitHub Environments
- Required: `NEXT_PUBLIC_FIREBASE_*` (6 vars), `FIREBASE_SERVICE_ACCOUNT_GASTROO_4F0A3`
- Service account needs IAM roles: Firebase Admin, Cloud Functions Developer, Service Account User, Service Usage Consumer
- `.gitleaks.toml` allowlists `apphosting.yaml` (Firebase API key is public)

### Lint setup (Next.js 16)
- `next lint` removed in Next.js 16 — using `eslint .` directly
- `functions/` has separate eslint config, linted via `npm --prefix functions run lint`
- Test files (`*.test.ts`, `*.spec.ts`) excluded from tsconfig, have relaxed eslint rules

---

## 9. Testy & NFR

- Testy: `npx vitest run` + contract testy: `npm run test:seed:contracts`
- **Offline**: GET = NetworkFirst, POST = Background Sync Queue (Service Worker)
- **Wydajność**: API p95 <= 800ms, CLS <= 0.1
- **PWA**: aplikacja musi działać offline bez utraty pracy kelnera

---

## 10. PR Checklist

- [ ] Lint przechodzi
- [ ] TypeScript kompiluje (`tsc --noEmit`)
- [ ] Swagger zaktualizowany (jeśli dotyczy)
- [ ] Brak logów z sekretami/tokenami
- [ ] Node-only zależności mają `runtime = 'nodejs'`
- [ ] Brak zmian reguł bezpieczeństwa bez review
- [ ] Brak hardcoded `px` w `src/`
- [ ] CHANGELOG.md zaktualizowany

---

## 11. Referencje

| Dokument | Opis |
|----------|------|
| `TOKENS.md` | Design tokens: UI system + T system + unit helpers |
| `EMULATORS.md` | Firebase emulators: porty, konfiguracja, troubleshooting |
| `docs/project-documentation.md` | Architektura i moduły |
| `docs/technical-standards.md` | NFR, skalowanie, PWA, responsive |
| `docs/env-driven-runtime.md` | Zmienne środowiskowe, feature flags, profile |
| `docs/ai/api-reference.md` | API endpoints, auth patterns, error codes |
| `docs/ai/seed-data.md` | Seed infrastructure, test credentials |
| `docs/ai/backlog.md` | Priorytetyzowany backlog (P0/P1/P2) |
