# CI/CD Pipeline (Google Firebase + GCP)

Pipeline jest zorganizowany tak, aby wspierać główny cel produktu:

- deploy lokalny,
- konteneryzację,
- deploy do GCP (Firebase App Hosting),
- integracje Google (Drive, Calendar, Workspace, GBP),
- automatyczne podbijanie wersji i aktualizację changeloga na deploy.

## 1. Workflow i automatyzacja

Główne workflow:

- `.github/workflows/ci.yml`
  - lint/test/build,
  - build kontenera,
  - smoke kontenera,
  - skan sekretów (gitleaks).
- `.github/workflows/firebase-hosting-merge.yml`
  - CD Firebase/GCP,
  - auto bump wersji + changelog,
  - target środowiska wybierany przez `workflow_dispatch`.

## 2. Lokalne komendy deploy

Pipeline lokalny:

```bash
npm run deploy:local
```

Walidacja env + deploy GCP + smoke:

```bash
npm run deploy:env:check
bash scripts/deploy-firebase.sh --project staging
bash scripts/smoke-postdeploy.sh --base-url "$APP_BASE_URL_STAGING" --project-id gastroo-4f0a3
```

## 3. Co automatyzuje CD

Na każdym deploy workflow automatycznie:

1. uruchamia `scripts/bump-version-and-changelog.mjs`,
2. podbija patch wersji w `package.json` i `functions/package.json`,
3. dopisuje wpis do `CHANGELOG.md`,
4. commituje metadane release do `main`.

## 4. Deployment targety

`workflow_dispatch` obsługuje:

- `target_env`: `staging` lub `production`,
- `run_smoke`: uruchomienie smoke testu po deploy,
- `skip_apphosting`: pominięcie App Hosting dla GCP.

## 5. Co sprawdza smoke test

Skrypt `scripts/smoke-postdeploy.sh` waliduje:

- `/api/health`,
- `/api/ready`,
- callback OAuth Calendar,
- callback OAuth Workspace,
- podstawowe callable Functions (oczekiwany błąd `unauthenticated` bez tokenu).

## 6. Zabezpieczenie sekretów i env

Praktyki wdrożone w pipeline:

- sekrety tylko z GitHub Secrets/Environment Secrets,
- `.env*` ignorowane przez git (`.env.production.example` pozostaje wzorcem),
- walidacja krytycznych env przed deploy (`scripts/validate-deploy-env.sh`),
- automatyczny skan sekretów w CI (gitleaks),
- brak wypisywania wartości sekretów w logach pipeline.

## 7. Wymagane sekrety

### GCP / Firebase

- `FIREBASE_SERVICE_ACCOUNT_GASTROO_4F0A3`
- `APP_BASE_URL_STAGING`
- `APP_BASE_URL_PRODUCTION`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- `GOOGLE_WORKSPACE_CLIENT_ID`
- `GOOGLE_WORKSPACE_CLIENT_SECRET`
- `GOOGLE_WORKSPACE_REDIRECT_URI`
- `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID`
- `SEED_ADMIN_KEY`
