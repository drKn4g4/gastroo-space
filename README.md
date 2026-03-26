# gastroo-space

Nowoczesna platforma SaaS dla gastronomii: panel wlasciciela, miniPOS oraz flow konsumencki, zbudowane na Next.js i Firebase.

## Szybki start

1. Zainstaluj zaleznosci:

```bash
npm install
npm --prefix functions install
```

1. Uruchom development:

```bash
npm run dev
```

1. Opcjonalnie uruchom z emulatorami Firebase:

```bash
npm run dev:start
```

Tryb czysty (ubija procesy i resetuje snapshot emulatora):

```bash
npm run dev:start:clean
```

Podglad aktywnych feature flag:

```bash
npm run dev:flags
```

## Unified seed (jedno zrodlo danych)

```bash
npm run seed:core
npm run seed:demo
npm run seed:integration
npm run seed:all
npm run seed:unified
```

Przy starcie przez `scripts/start-dev.sh` mozna ustawic profil zmienna `SEED_PROFILE` (domyslnie `demo`).
Skrypt korzysta z jednego zrodla danych: `scripts/seeds/source.ts` + `scripts/seed.ts`.

## Konteneryzacja

Repo zawiera gotowy zestaw do uruchomienia aplikacji w kontenerze:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`

Uruchomienie lokalne:

```bash
docker build -t gastroo-space:local .
docker run --rm -p 5202:5202 gastroo-space:local
```

lub przez Compose:

```bash
docker compose up --build
```

Lokalny pipeline deploy (build + kontener + health/readiness):

```bash
npm run deploy:local
```

## DevOps i skalowanie

- Health endpoint: `/api/health`
- Readiness endpoint: `/api/ready`
- CI workflow: `.github/workflows/ci.yml`
- CD workflow (Firebase/GCP): `.github/workflows/firebase-hosting-merge.yml`
- Smoke load test (k6):

```bash
npm run perf:smoke
```

Mozesz ustawic niestandardowy adres:

```bash
BASE_URL=http://127.0.0.1:5202 npm run perf:smoke
```

Wzmocniono tez tryb offline PWA przez kolejke Background Sync dla mutujacych requestow `POST /api/*`.

## CI/CD i release automation

- Auto bump wersji i changelog na deploy:
  - `scripts/bump-version-and-changelog.mjs`
- Walidacja env przed deploy:
  - `npm run deploy:env:check`
- Smoke test po deploy:
  - `npm run deploy:smoke -- --base-url <url> --project-id gastroo-4f0a3`
- Deploy GCP:
  - `npm run deploy:firebase`

Workflow CD jest skoncentrowany na Firebase/GCP (staging/production).

Skan sekretow jest wykonywany automatycznie w CI przez gitleaks.

Feature flagi znajdziesz w pliku `.env.flags.example`.

## Kluczowe pliki dokumentacji

- docs/project-documentation.md - glowna dokumentacja projektowa (punkt startowy)
- AGENTS.md - zasady pracy i kontekst architektury dla agentow
- CHANGELOG.md - historia zmian
- docs/production-readiness-checklist.md - checklista gotowosci produkcyjnej
- docs/google-integration-contracts.md - kontrakty danych dla integracji Google
- docs/scalability-and-containerization.md - strategia skalowania i konteneryzacji
- docs/env-driven-runtime.md - runtime oparty o env, profile flag i guard
- docs/technical-standards.md - standardy techniczne (NFR, style, h/v scaling, responsive PWA)
- docs/ai/README.md - archiwum roboczych dokumentow AI

## Konwencja dokumentacji

- Dokumentacja glowna: root i stabilne katalogi docs/
- Materialy robocze AI: tylko docs/ai/
- Nie tworzymy tymczasowych .md w root repo
