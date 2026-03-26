# Firebase Emulators Configuration — Development Guide

## Full Stack Emulators Available

Gastroo Space developuje się z **pełnym zestawem Firebase Emulators** dla lokalnego developmentu przed deploymentem na Firebasea.

### Emulatory Startują Automatycznie (npm run dev:full)

```bash
npm run dev:full
```

Uruchamia następujące emulatory:

| Emulator | Port | Opis | Status |
| --- | --- | --- | --- |
| **Auth** | 9099 | Firebase Authentication (Google Sign-In mock) | ✅ |
| **Firestore** | 8080 | NoSQL Database (Cloud Firestore) | ✅ |
| **Functions** | 5001 | Cloud Functions Runtime | ✅ |
| **Database** | 9000 | Realtime Database | ✅ |
| **Hosting** | 5000 | Static Content Hosting | ✅ |
| **PubSub** | 8085 | Cloud Pub/Sub (messaging) | ✅ |
| **Storage** | 9199 | Cloud Storage (blobs) | ✅ |
| **EventArc** | 9299 | Event Routing | ✅ |
| **Tasks** | 9499 | Cloud Tasks (scheduled) | ✅ |
| **DataConnect** | 5500 | 🆕 Data Connect via SQL | ✅ |
| **App Hosting** | 5202 | Firebase App Hosting emulator (proxy do Next.js) | ✅ |
| **Emulator Hub** | 4400 | Central orchestrator (internal) | ✅ |
| **Emulator UI** | 4000 | Firebase Admin Dashboard | ✅ |

### Gdzie Są Dostępne?

```text
http://127.0.0.1:5202          → App Hosting emulator / Next.js dev (preferowany adres aplikacji)
http://localhost:4000           → Firebase Emulator UI Dashboard
http://localhost:5500           → Data Connect API
http://localhost:8080           → Firestore API
http://localhost:9099           → Auth API
```

## Proces Startup (start-dev.sh)

1. **Sprawdzenie Firebase CLI** (`firebase` binary dostępny)
2. **Port cleanup** — jeśli porty zajęte, skrypt pyta czy je ubić
3. **Start emulatorów** — `firebase emulators:start --only [lista powyżej]`
4. **Wait for Emulator Hub** (:4400) — timeout 90s
5. **Wait for Firestore** (:8080) — timeout 30s
6. **Wait for Auth** (:9099) — timeout 30s
7. **Seed Data** — populacja danych testowych (SEED_AUTH + SEED_FIRESTORE)
8. **Next.js/App Hosting** — domyślnie App Hosting (port 5202), z Next.js zbindowanym do 127.0.0.1

## Konfiguracja

### firebase.json

```json
{
  "dataconnect": { "source": "dataconnect" },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "database": { "port": 9000 },
    "hosting": { "port": 5000 },
    "pubsub": { "port": 8085 },
    "storage": { "port": 9199 },
    "eventarc": { "port": 9299 },
    "tasks": { "port": 9499 },
    "dataconnect": { "port": 5500 },
    "ui": { "enabled": true, "port": 4000 },
    "import": "./.firebase/emulator-data",
    "exportOnExit": true,
    "singleProjectMode": true
  }
}
```

### scripts/start-dev.sh

Key variables:

```bash
# Full emulator defaults for release-like local workflow:
START_DEV_USE_APPHOSTING=true
START_DEV_ENABLE_DATACONNECT=true
NEXT_HOST=127.0.0.1

# Port management:
EMULATOR_PORTS=(4400 4000 8080 9099 5000 5001 8085 9000 9199 9299 9499 5500)

# Seed behavior:
SEED_AUTH=true                    # Create auth users
SEED_FIRESTORE=true               # Populate Firestore + Storage
SEED_PROFILE="demo"               # demo, core, integration, all
```

## Env Flags

Customize behavior via env vars (dla `npm run dev:full`):

```bash
# Disable/enable seed:
SEED_AUTH=false npm run dev:full          # Skip auth seeding
SEED_FIRESTORE=false npm run dev:full     # Skip Firestore seeding
SEED_PROFILE=core npm run dev:full        # Seed only core (users+org+restaurants)

# Port management:
START_DEV_KILL_EMULATORS=true npm run dev:full   # Auto-kill if occupied
PORT=5202 npm run dev:full                       # Next.js on different port
NEXT_HOST=127.0.0.1 npm run dev:full             # Single local host (no LAN)

# Runtime mode:
START_DEV_USE_APPHOSTING=true npm run dev:full   # Prefer app through App Hosting emulator
START_DEV_ENABLE_DATACONNECT=true npm run dev:full  # Include Data Connect emulator
START_DEV_ENABLE_PWA=true npm run dev:full       # Enable service worker in dev for PWA checks

# Data persistence:
START_DEV_RESET_EMULATOR_DATA=true npm run dev:full  # Fresh emulatora (delete snapshot)
START_DEV_USE_EMULATOR_IMPORT=false npm run dev:full # Never import snapshot
```

## Data Snapshot

`./.firebase/emulator-data/` zawiera snapshot Firestore/Auth/Storage z ostatniego uruchomienia.

- **Automatyczne zapisywanie** (exportOnExit=true) — dane z sesji dev zapisane do snapshotu
- **Automatyczne ładowanie** (import=[path]) — snapshot załadowany na start
- **Spójność danych** — po imporcie uruchamiany jest seed referencyjny (Auth + Firestore), aby stan bazowy (w tym bookingi) zawsze był obecny
- **Skip snapshotu** — `START_DEV_USE_EMULATOR_IMPORT=false`
- **Reset snapshotu** — `START_DEV_RESET_EMULATOR_DATA=true` lub `rm -rf .firebase/emulator-data/*`

## Troubleshooting

### ❌ "Port [PORT] already in use"

```bash
# Auto-kill:
START_DEV_KILL_EMULATORS=true npm run dev:full

# Lub ręcznie:
lsof -ti tcp:4400 | xargs kill -TERM
```

### ❌ "Auth seed failed — ECONNREFUSED 127.0.0.1:9099"

Skrypt czeka na Emulator Hub lub Auth emulator się nie startuje:

```bash
# Sprawdź Firebase CLI:
firebase --version    # >=14.0.0 potrzebny

# Sprawdź czy emulatory startują:
firebase emulators:start --only auth,firestore
```

### ❌ "Firebase Emulator UI — Not starting"

UI wymaga prawidłowej konfiguracji Firebase. Sprawdź:

```bash
# Czy .firebaserc istnieje:
cat .firebaserc

# Startuj UI ręcznie:
firebase emulators:start --only ui
```

### ❌ "Seed completed but data not visible"

- Załadował snapshot zamiast seedowania — ustaw `START_DEV_USE_EMULATOR_IMPORT=false`
- Sprawdź czy seed uruchomił się bez błędów (szukaj `✅ Seed complete` lub `❌ Seed failed`)
- Reset snapshotu: `START_DEV_RESET_EMULATOR_DATA=true npm run dev:full`

## Next.js + Emulators Integration

## Unified seed source

Canonical seed source:

- `scripts/seeds/source.ts`
- `scripts/seed.ts`

Legacy helper `scripts/seed-auth.ts` istnieje tylko dla kompatybilnosci i pobiera dane z unified source.

## Data Connect (Read-Only)

Konfiguracja Data Connect jest utrzymywana w katalogu `dataconnect/` i nie używa connectorów GraphQL. Zostawiamy tylko minimalny schemat usługi, bo zapis danych realizujemy przez seedy i istniejące API/Firebase SDK.

### Environment Variables Automatic

`NEXT_PUBLIC_USE_EMULATORS=true` automatycznie ustawiany przez `start-dev.sh`.

### src/lib/firebase/config.ts

App automatycznie łączy się do emulatorów jeśli `NEXT_PUBLIC_USE_EMULATORS=true`:

```typescript
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
```

## Testing Integration

### Playwright Tests

Playwright uses **App Hosting Emulator** (port 5202):

```bash
npm run test    # Uruchamia: firebase emulators:start + App Hosting + playwright test
```

Config: `playwright.config.ts` ustawia `START_DEV_USE_APPHOSTING=true`.

### Unit/Integration Tests

```bash
npm run test:unit    # Jest + local emulatora
```

## Deployment Checklist

Zanim deployujesz na produkcję:

- [ ] Emulatory działają lokalnie (`npm run dev:full`)
- [ ] Seed poprawnie populuje dane (`✅ Seed complete`)
- [ ] App łączy się do emulatorów (`🔥 Connecting to Firebase Emulators`)
- [ ] Playwright testy przechodzą (`npm run test`)
- [ ] Build succeeded (`npm run build`)
- [ ] Nie ma hardkodowanego localhost w kodzie (sprawdź `src/lib/firebase/config.ts`)

## References

- **Firebase CLI docs**: [https://firebase.google.com/docs/emulator-suite](https://firebase.google.com/docs/emulator-suite)
- **Config**: `firebase.json`
- **Startup script**: `scripts/start-dev.sh`
- **Seed script**: `scripts/seed.ts`
- **Firebase SDK client**: `src/lib/firebase/config.ts`
