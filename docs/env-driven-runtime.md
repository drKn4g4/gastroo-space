# Env-Driven Runtime Reference

Ten dokument opisuje runtime i routing w sposob oparty o zmienne srodowiskowe, bez hardkodowania wartosci.

## 1. Core runtime

| Zmienna | Opis | Domyslnie |
| --- | --- | --- |
| `PORT` | Port aplikacji Next.js uruchamianej lokalnie | `5202` |
| `NEXT_HOST` | Host aplikacji Next.js | `127.0.0.1` |
| `APPHOSTING_PORT` | Port emulatora Firebase App Hosting | `5202` |
| `SWAGGER_LANG` | Prefiks jezyka dla UI Swagger | `pl` |

## 2. Emulatory Firebase

| Zmienna | Opis | Domyslnie |
| --- | --- | --- |
| `START_DEV_USE_APPHOSTING` | Czy uruchamiac appke przez emulator App Hosting | `true` |
| `START_DEV_ENABLE_DATACONNECT` | Czy wlaczac emulator Data Connect | `true` |
| `START_DEV_USE_EMULATOR_IMPORT` | Tryb importu snapshotu emulatora: `auto\|true\|false` | `auto` |
| `START_DEV_EXPORT_ON_EXIT` | Czy eksportowac dane emulatora przy zamknieciu | wartosc z `firebase.json` |
| `START_DEV_EMULATOR_DATA_DIR` | Katalog snapshotu emulatora | `${HOME}/.cache/gastroo-space/emulator-data` |
| `START_DEV_RESET_EMULATOR_DATA` | Czy wyczyscic snapshot przed startem | `false` |
| `START_DEV_KILL_EMULATORS` | Czy automatycznie ubijac procesy emulatorow na konfliktach | `false` |
| `START_DEV_KILL_NEXT` | Czy automatycznie ubijac proces na porcie appki | `false` |

## 3. Feature flags (public + runtime)

| Zmienna | Zakres | Opis | Domyslnie |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE` | klient | Kolejkowanie POST `/api/*` offline (Background Sync) | `true` |
| `NEXT_PUBLIC_FEATURE_GOOGLE_CHAT` | klient | Integracja Google Chat w UI | `true` |
| `NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR` | klient | Integracja Google Calendar w UI | `true` |
| `NEXT_PUBLIC_FEATURE_ADVANCED_FLOORPLAN` | klient | Rozszerzone funkcje floorplanu | `true` |
| `NEXT_PUBLIC_FEATURE_AVAILABILITY_REQUESTS` | klient | Zgloszenia dyspozycji zespolu | `true` |
| `FEATURE_ENABLE_DATACONNECT` | runtime | Funkcje zwiazane z Data Connect | `true` |

Wzor pliku znajdziesz w [.env.flags.example](.env.flags.example).

Profile per srodowisko znajduja sie w:

- [config/feature-flags/dev.env](config/feature-flags/dev.env)
- [config/feature-flags/stage.env](config/feature-flags/stage.env)
- [config/feature-flags/prod.env](config/feature-flags/prod.env)

Wybor profilu:

```text
FEATURE_FLAG_PROFILE=dev|stage|prod
```

Domyslnie: `dev`.

## 4. Routing i URL-e jako wzory

### App URL

```text
http://${NEXT_HOST:-127.0.0.1}:${PORT:-5202}
```

### App Hosting emulator URL

```text
http://${NEXT_HOST:-127.0.0.1}:${APPHOSTING_PORT:-5202}
```

### Swagger UI URL

```text
http://${NEXT_HOST:-127.0.0.1}:${PORT:-5202}/${SWAGGER_LANG:-pl}/swagger/seed
```

### Swagger spec URL

```text
http://${NEXT_HOST:-127.0.0.1}:${PORT:-5202}/api/swagger/seed
```

## 5. Praktyczne profile .env

### Profil lokalny (szybki start)

```env
PORT=5202
NEXT_HOST=127.0.0.1
APPHOSTING_PORT=5202
SWAGGER_LANG=pl
START_DEV_USE_APPHOSTING=true
START_DEV_ENABLE_DATACONNECT=true
START_DEV_USE_EMULATOR_IMPORT=auto
START_DEV_EXPORT_ON_EXIT=true
```

### Profil CI (deterministyczny)

```env
START_DEV_KILL_EMULATORS=true
START_DEV_KILL_NEXT=true
START_DEV_USE_EMULATOR_IMPORT=true
SEED_AUTH=false
SEED_FIRESTORE=false
```

## 6. Komendy pomocnicze

Podglad aktywnych flag:

```bash
npm run dev:flags
```

Start standardowy:

```bash
npm run dev:start
```

Start z profilem stage:

```bash
npm run dev:start:stage
```

Start z profilem prod:

```bash
npm run dev:start:prod
```

Start czysty (agresywny reset procesu i danych emulatora):

```bash
npm run dev:start:clean
```

Guard flag (walidacja):

```bash
npm run flags:validate
npm run flags:validate:strict
```
