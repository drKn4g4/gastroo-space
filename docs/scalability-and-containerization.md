# Skalowalnosc i konteneryzacja

Ten dokument opisuje praktyczny kierunek skalowania gastroo-space oraz sposob konteneryzacji aplikacji.

## 1. Stan aktualny

Aplikacja dziala na Next.js + Firebase App Hosting.
Pod spodem App Hosting korzysta z Cloud Run, co daje automatyczne skalowanie horyzontalne.

To oznacza, ze dla glownego frontend/backend (Next.js) najbardziej naturalna sciezka produkcyjna to:

- App Hosting jako warstwa managed
- strojenie parametrow Cloud Run w apphosting.yaml

## 2. Szybkie skalowanie (etap 1)

Dla App Hosting warto zaczac od kontrolowanych limitow:

- minInstances: 0 w srodowisku dev/stage, 1-2 w production dla nizszego cold start
- maxInstances: ograniczenie kosztow i burstow (np. 20-100, zalezne od ruchu)
- concurrency: 40-100 dla I/O heavy requestow
- cpu i memory: zwiekszac po metrykach p95/p99

Przykladowe metryki, ktore trzeba monitorowac:

- latency p50/p95/p99
- liczba instancji i czas skali
- error rate 5xx
- czas odpowiedzi endpointow /api/*

## 3. Konteneryzacja (etap 1)

W repo dodano:

- Dockerfile (obraz produkcyjny Next.js)
- .dockerignore
- docker-compose.yml (lokalne uruchomienie kontenera aplikacji)
- /api/health i /api/ready (liveness/readiness)
- CI workflow: `.github/workflows/ci.yml` (lint, testy, build, docker smoke)
- k6 smoke test: `tests/perf/smoke.js`

### Build i run lokalnie

```bash
docker build -t gastroo-space:local .
docker run --rm -p 5202:5202 gastroo-space:local
```

### Uruchomienie przez compose

```bash
docker compose up --build
```

### Prosty test obciazeniowy

```bash
npm run perf:smoke
```

lub na wskazanym URL:

```bash
BASE_URL=http://127.0.0.1:5202 npm run perf:smoke
```

## 3a. Offline mode dla requestow mutujacych

W konfiguracji PWA dodano Background Sync dla `POST /api/*`.

Efekt:

- gdy klient jest offline, request POST trafia do kolejki Workbox,
- po odzyskaniu polaczenia przegladarka automatycznie retransmituje request.

To ogranicza utrate danych przy niestabilnym internecie mobilnym.

## 4. Skalowanie docelowe (etap 2)

Jezeli ruch i zlozonosc wzrosna (np. multi-tenant enterprise), rozsadny podzial to:

- BFF/SSR dalej na Cloud Run (App Hosting lub bezposrednio)
- ciezkie async zadania do osobnych workerow (Cloud Run Jobs / Functions)
- kolejki i retry przez Pub/Sub + idempotency keys

Dopiero po przekroczeniu granic Cloud Run (niestandardowy networking, skomplikowane sidecary, bardzo zlozone harmonogramy) warto rozwazac GKE.

## 5. Sugerowane kroki na teraz

1. Ustalic profile runConfig dla: dev, stage, prod.
2. Dodac dashboard SLO (latency + error budget).
3. Wydzielic najciezsze endpointy API i limity concurrency per route.
4. Dla integracji Google dodac kolejki i backoff na poziomie workerow.
5. Przetestowac kontener pod obciazeniem (k6/Artillery) przed podniesieniem maxInstances.

## 6. Ryzyka i uwagi

- Zbyt wysokie concurrency moze pogorszyc p99.
- Za niskie maxInstances blokuje burst ruchu.
- Brak limitow kosztowych przy minInstances > 0 w wielu regionach.
- Integracje z API zewnetrznymi (Google) wymagaja circuit breaker i retry policy.
