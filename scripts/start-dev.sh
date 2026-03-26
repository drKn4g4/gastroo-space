#!/usr/bin/env bash
# scripts/start-dev.sh
# Uruchamia emulatory → seeduje dane → startuje Next.js dev
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Start dev stack"

EMULATOR_PID=""
NEXTJS_PID=""
CLEANUP_DONE="false"

cleanup() {
  if [ "$CLEANUP_DONE" = "true" ]; then
    return
  fi

  CLEANUP_DONE="true"

  log_stage "Cleanup"
  if [ -n "$NEXTJS_PID" ]; then
    log_step "Zamykam Next.js (PID: $NEXTJS_PID)"
    kill "$NEXTJS_PID" 2>/dev/null || true
  fi
  if [ -n "$EMULATOR_PID" ]; then
    log_step "Zamykam emulatory (PID: $EMULATOR_PID)"
    kill "$EMULATOR_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# load_env_file() jest dostarczone przez scripts/helpers/common.sh

# ── Helper: ubij procesy po portach (best-effort) ────────────────────────────
kill_ports() {
  if ! command -v lsof &>/dev/null; then
    return 0
  fi
  local ports=("$@")
  local pids=()
  for port in "${ports[@]}"; do
    while IFS= read -r pid; do
      [ -n "$pid" ] && pids+=("$pid")
    done < <(lsof -ti "tcp:${port}" 2>/dev/null || true)
  done

  if [ "${#pids[@]}" -eq 0 ]; then
    return 0
  fi

  # de-dup
  local uniq=()
  for pid in "${pids[@]:-}"; do
    if [[ ! " ${uniq[*]:-} " =~ " ${pid} " ]]; then
      uniq+=("$pid")
    fi
  done

  log_warn "Wykryto procesy na portach emulatorów — ubijam PIDy: ${uniq[*]}"
  kill "${uniq[@]}" 2>/dev/null || true
}

kill_next_dev_processes() {
  # Best-effort cleanup for stale dev servers that keep .next/dev/lock.
  pkill -f "next dev --turbopack" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "npm run dev" 2>/dev/null || true
}

prune_legacy_exports() {
  local keep_count="$1"
  if [ ! -d "$PWD" ]; then
    return 0
  fi

  local legacy_dirs=()
  while IFS= read -r dir; do
    [ -n "$dir" ] && legacy_dirs+=("$dir")
  done < <(find "$PWD" -maxdepth 1 -type d -name 'firebase-export-*' -print | sort)

  local total="${#legacy_dirs[@]}"
  if [ "$total" -le "$keep_count" ]; then
    return 0
  fi

  # keep newest directories by mtime
  local sorted_by_time=()
  while IFS= read -r dir; do
    [ -n "$dir" ] && sorted_by_time+=("$dir")
  done < <(ls -dt "${legacy_dirs[@]}" 2>/dev/null || true)

  local to_delete=()
  for ((i=keep_count; i<${#sorted_by_time[@]}; i++)); do
    to_delete+=("${sorted_by_time[$i]}")
  done

  if [ "${#to_delete[@]}" -gt 0 ]; then
    log_stage "Porządkowanie legacy exportów"
    log_step "Usuwam stare legacy exporty emulatora (${#to_delete[@]})"
    for d in "${to_delete[@]}"; do
      log_step "- ${d#$PWD/}"
      rm -rf "$d"
    done
  fi
}

prune_test_artifacts() {
  # test artifacts are reproducible; keeping only latest outputs limits disk pressure
  [ -d "test-results" ] && rm -rf test-results/* 2>/dev/null || true
}

detect_emulator_pids() {
  local ports=("$@")
  if ! command -v lsof &>/dev/null; then
    echo ""
    return 0
  fi
  local pids=()
  for port in "${ports[@]}"; do
    while IFS= read -r pid; do
      [ -n "$pid" ] && pids+=("$pid")
    done < <(lsof -ti "tcp:${port}" 2>/dev/null || true)
  done

  # de-dup
  local uniq=()
  for pid in "${pids[@]:-}"; do
    if [[ ! " ${uniq[*]:-} " =~ " ${pid} " ]]; then
      uniq+=("$pid")
    fi
  done
  echo "${uniq[*]:-}"
}

# ── Helper: sprawdź czy port jest otwarty ─────────────────────────────────────
port_open() {
  local port=$1
  # próbuj nc, jeśli nie ma — użyj curl
  if command -v nc &>/dev/null; then
    nc -z localhost "$port" 2>/dev/null
  else
    curl -s --max-time 1 "http://localhost:$port" -o /dev/null 2>/dev/null
    local code=$?
    # curl zwraca 0 (OK) lub 22 (HTTP error) — oba oznaczają że port jest otwarty
    [ "$code" -eq 0 ] || [ "$code" -eq 22 ] || [ "$code" -eq 52 ] || [ "$code" -eq 56 ]
  fi
}

find_next_free_port() {
  local start_port="$1"
  local max_tries="${2:-20}"
  local candidate="$start_port"

  for _ in $(seq 1 "$max_tries"); do
    if ! port_open "$candidate"; then
      echo "$candidate"
      return 0
    fi
    candidate=$((candidate + 1))
  done

  return 1
}

# ── 0. Preflight ──────────────────────────────────────────────────────────────
if ! command -v firebase &>/dev/null; then
  log_error "Brak firebase CLI. Zainstaluj: npm i -g firebase-tools"
  exit 1
fi

log_stage "Preflight i konfiguracja"

# Priorytet: .env.emulators (seed/flags) -> .env.local (fallback)
# Musi być przed ustawianiem domyślnych START_DEV_*.
FEATURE_FLAG_PROFILE="${FEATURE_FLAG_PROFILE:-dev}"
FEATURE_FLAG_PROFILE_FILE="$ROOT_DIR/config/feature-flags/${FEATURE_FLAG_PROFILE}.env"
if [ -f "$FEATURE_FLAG_PROFILE_FILE" ]; then
  load_env_file "$FEATURE_FLAG_PROFILE_FILE"
fi

load_env_file ".env.emulators" true
load_env_file ".env.local" true
load_env_file ".env.flags.local" true

if [ -f "$ROOT_DIR/scripts/validate-feature-flags.sh" ]; then
  bash "$ROOT_DIR/scripts/validate-feature-flags.sh"
fi

NEXT_HOST="${NEXT_HOST:-127.0.0.1}"
SWAGGER_LANG="${SWAGGER_LANG:-pl}"
START_DEV_USE_APPHOSTING="${START_DEV_USE_APPHOSTING:-false}"
APPHOSTING_HAS_START_CMD="false"
if [ -f "firebase.json" ] \
  && grep -q '"apphosting"' firebase.json \
  && grep -q '"startCommand"[[:space:]]*:' firebase.json; then
  APPHOSTING_HAS_START_CMD="true"
fi
APPHOSTING_ENABLED="false"
if [[ "$START_DEV_USE_APPHOSTING" == "true" ]] && [ "$APPHOSTING_HAS_START_CMD" = "true" ]; then
  APPHOSTING_ENABLED="true"
fi

APPHOSTING_PORT="${APPHOSTING_PORT:-}"
if [ -z "$APPHOSTING_PORT" ] && [ -f "firebase.json" ]; then
  APPHOSTING_PORT="$(node -e "try { const c = require('./firebase.json'); const p = c?.emulators?.apphosting?.port; if (p) process.stdout.write(String(p)); } catch (_) {}" 2>/dev/null || true)"
fi
APPHOSTING_PORT="${APPHOSTING_PORT:-5202}"

# Jeśli apphosting jest enabled, domyślnie PORT = APPHOSTING_PORT (5202)
if [[ "$APPHOSTING_ENABLED" == "true" ]]; then
  PORT="${PORT:-$APPHOSTING_PORT}"
else
  PORT="${PORT:-5202}"
fi
FIREBASE_EMULATORS_ONLY="auth,functions,firestore,database,hosting,pubsub,storage,eventarc,tasks,ui"
if [[ "$START_DEV_ENABLE_DATACONNECT" == "true" ]]; then
  FIREBASE_EMULATORS_ONLY+=" ,dataconnect"
  FIREBASE_EMULATORS_ONLY="${FIREBASE_EMULATORS_ONLY/ ,/,}"
fi

START_DEV_ENABLE_PWA="${START_DEV_ENABLE_PWA:-true}"
if [[ "$START_DEV_ENABLE_PWA" == "true" ]]; then
  export NEXT_PUBLIC_PWA_DEV="true"
fi

if [ -f "$ROOT_DIR/scripts/print-feature-flags.sh" ]; then
  bash "$ROOT_DIR/scripts/print-feature-flags.sh"
fi
FIREBASE_EMULATOR_IMPORT_DIR=""
FIREBASE_EMULATOR_EXPORT_ON_EXIT="true"
if [ -f "firebase.json" ]; then
  FIREBASE_EMULATOR_IMPORT_DIR="$(node -e "try { const c = require('./firebase.json'); const p = c?.emulators?.import; if (typeof p === 'string' && p.trim()) process.stdout.write(p.trim()); } catch (_) {}" 2>/dev/null || true)"
  FIREBASE_EMULATOR_EXPORT_ON_EXIT="$(node -e "try { const c = require('./firebase.json'); const v = c?.emulators?.exportOnExit; if (typeof v === 'boolean') process.stdout.write(v ? 'true' : 'false'); } catch (_) {}" 2>/dev/null || true)"
  FIREBASE_EMULATOR_EXPORT_ON_EXIT="${FIREBASE_EMULATOR_EXPORT_ON_EXIT:-true}"
fi

# Źródło katalogu snapshotów (priorytet):
# 1) START_DEV_EMULATOR_DATA_DIR
# 2) firebase.json -> emulators.import
# 3) fallback poza repo
DEFAULT_EMULATOR_DATA_DIR="${HOME:-$PWD}/.cache/gastroo-space/emulator-data"
EMULATOR_DATA_DIR="${START_DEV_EMULATOR_DATA_DIR:-${FIREBASE_EMULATOR_IMPORT_DIR:-$DEFAULT_EMULATOR_DATA_DIR}}"
START_DEV_EXPORT_ON_EXIT="${START_DEV_EXPORT_ON_EXIT:-$FIREBASE_EMULATOR_EXPORT_ON_EXIT}"

# Upewnij się, że katalog importu istnieje
mkdir -p "$EMULATOR_DATA_DIR"

EMULATOR_METADATA_FILE="${EMULATOR_DATA_DIR}/firebase-export-metadata.json"
START_DEV_RESET_EMULATOR_DATA="${START_DEV_RESET_EMULATOR_DATA:-false}"
START_DEV_USE_EMULATOR_IMPORT="${START_DEV_USE_EMULATOR_IMPORT:-false}"
START_DEV_PRUNE_LEGACY_EXPORTS="${START_DEV_PRUNE_LEGACY_EXPORTS:-true}"
START_DEV_KEEP_LEGACY_EXPORTS="${START_DEV_KEEP_LEGACY_EXPORTS:-2}"
START_DEV_PRUNE_TEST_ARTIFACTS="${START_DEV_PRUNE_TEST_ARTIFACTS:-true}"

if [[ "$START_DEV_RESET_EMULATOR_DATA" == "true" ]]; then
  if [ "$(find "$EMULATOR_DATA_DIR" -mindepth 1 -maxdepth 1 -print -quit | wc -l | tr -d ' ')" != "0" ]; then
    log_step "START_DEV_RESET_EMULATOR_DATA=true — czyszczę ${EMULATOR_DATA_DIR}"
    find "$EMULATOR_DATA_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
    log_ok "${EMULATOR_DATA_DIR} wyczyszczone"
  fi
fi

USE_EMULATOR_IMPORT="false"
case "$START_DEV_USE_EMULATOR_IMPORT" in
  true)
    USE_EMULATOR_IMPORT="true"
    ;;
  false)
    USE_EMULATOR_IMPORT="false"
    ;;
  auto)
    if [ -f "$EMULATOR_METADATA_FILE" ]; then
      USE_EMULATOR_IMPORT="true"
    fi
    ;;
  *)
    log_warn "Nieznana wartość START_DEV_USE_EMULATOR_IMPORT=$START_DEV_USE_EMULATOR_IMPORT (dozwolone: auto|true|false). Używam auto."
    if [ -f "$EMULATOR_METADATA_FILE" ]; then
      USE_EMULATOR_IMPORT="true"
    fi
    ;;
esac

if [[ "$USE_EMULATOR_IMPORT" == "true" ]] && [ ! -f "$EMULATOR_METADATA_FILE" ]; then
  log_warn "Brak ${EMULATOR_METADATA_FILE} — pomijam import snapshotu, start na czysto."
  USE_EMULATOR_IMPORT="false"
fi

# Ogranicz śmieciowe artefakty lokalne emulatora (katalog jest ignorowany, ale potrafi mieszać w statusie repo).
if [[ "${START_DEV_CLEAN_FIREBASE_CACHE:-true}" == "true" ]] && [ -d ".firebase" ]; then
  rm -rf .firebase/gastroo-4f0a3/functions/.next .firebase/gastroo-4f0a3/functions/node_modules 2>/dev/null || true
fi

if [[ "$START_DEV_PRUNE_LEGACY_EXPORTS" == "true" ]]; then
  prune_legacy_exports "$START_DEV_KEEP_LEGACY_EXPORTS"
fi

if [[ "$START_DEV_PRUNE_TEST_ARTIFACTS" == "true" ]]; then
  prune_test_artifacts
fi

# Jeśli porty emulatorów są zajęte (np. po crashu), zapytaj czy je ubić zanim wystartujemy
EMULATOR_PORTS=(4400 4000 8080 9099 5000 5001 8085 9000 9199 9299 9499 5500)
if [[ "$APPHOSTING_ENABLED" == "true" ]]; then
  EMULATOR_PORTS+=("$APPHOSTING_PORT")
fi
OCCUPIED_EMULATOR_PORTS=()
for port in "${EMULATOR_PORTS[@]}"; do
  if port_open "$port"; then
    OCCUPIED_EMULATOR_PORTS+=("$port")
  fi
done

if [ "${#OCCUPIED_EMULATOR_PORTS[@]}" -gt 0 ]; then
  EXISTING_PIDS="$(detect_emulator_pids "${EMULATOR_PORTS[@]}")"
  log_warn "Wykryto zajęte porty emulatorów: ${OCCUPIED_EMULATOR_PORTS[*]}"
  if [ -n "$EXISTING_PIDS" ]; then
    log_step "PIDy: $EXISTING_PIDS"
  fi

  if [[ "${START_DEV_KILL_EMULATORS:-}" == "true" ]]; then
    log_warn "START_DEV_KILL_EMULATORS=true -> ubijam emulatory bez pytania"
    kill_ports "${EMULATOR_PORTS[@]}"
  elif [ -t 0 ]; then
    read -r -p "Ubić działające emulatory i wystartować na czysto? [y/N] " reply
    case "${reply:-}" in
      y|Y|yes|YES)
        kill_ports "${EMULATOR_PORTS[@]}"
        ;;
      *)
        log_warn "Nie ubijam. Przerywam start (konflikt portów). Ustaw START_DEV_KILL_EMULATORS=true, aby auto-ubić."
        exit 1
        ;;
    esac
  else
    log_warn "Brak TTY — automatycznie ubijam emulatory na zajętych portach."
    kill_ports "${EMULATOR_PORTS[@]}"
  fi

  # poczekaj aż porty odpuszczą
  for _ in $(seq 1 10); do
    STILL_OCCUPIED=false
    for port in "${EMULATOR_PORTS[@]}"; do
      if port_open "$port"; then
        STILL_OCCUPIED=true
        break
      fi
    done
    if [ "$STILL_OCCUPIED" = false ]; then break; fi
    sleep 1
  done
fi

# Jeśli port aplikacji jest zajęty, zapytaj czy ubić proces przed startem Next.js.
if port_open "$PORT"; then
  APP_PORT_PID=""
  if command -v lsof &>/dev/null; then
    APP_PORT_PID="$(lsof -ti "tcp:${PORT}" 2>/dev/null | head -n 1 || true)"
  fi

  log_warn "Port aplikacji :${PORT} jest zajęty."
  if [ -n "$APP_PORT_PID" ]; then
    log_step "PID: ${APP_PORT_PID}"
  fi

  if [[ "${START_DEV_KILL_NEXT:-}" == "true" ]]; then
    log_warn "START_DEV_KILL_NEXT=true -> ubijam proces na porcie :${PORT}"
    kill_ports "$PORT"
  elif [ -t 0 ]; then
    read -r -p "Ubić proces na porcie :${PORT} i kontynuować? [y/N] " reply
    case "${reply:-}" in
      y|Y|yes|YES)
        kill_ports "$PORT"
        ;;
      *)
        log_warn "Nie ubijam. Przerywam start, aby uniknąć EADDRINUSE. Ustaw START_DEV_KILL_NEXT=true, aby auto-ubić proces."
        exit 1
        ;;
    esac
  else
    log_warn "Brak TTY — automatycznie ubijam proces na porcie :${PORT}."
    kill_ports "$PORT"
  fi

  for _ in $(seq 1 10); do
    if ! port_open "$PORT"; then
      break
    fi
    sleep 1
  done

  if port_open "$PORT"; then
    NEXT_FREE_PORT="$(find_next_free_port "$((PORT + 1))" 30 || true)"
    if [ -n "$NEXT_FREE_PORT" ]; then
      log_warn "Port :${PORT} nadal zajęty. Przełączam Next.js na wolny port :${NEXT_FREE_PORT}."
      PORT="$NEXT_FREE_PORT"
    else
      log_error "Port :${PORT} nadal zajęty po próbie zwolnienia i nie znaleziono wolnego portu zapasowego."
      exit 1
    fi
  fi
fi

# Optional aggressive cleanup for local dev restarts.
if [[ "${START_DEV_KILL_EMULATORS:-}" == "true" ]]; then
  log_step "START_DEV_KILL_EMULATORS=true -> czyszczę stare procesy Next.js i lock dev"
  kill_next_dev_processes
  sleep 1
  if [ -f ".next/dev/lock" ] && ! pgrep -f "next dev" >/dev/null 2>&1; then
    rm -f .next/dev/lock
  fi
fi

# ── 1. Emulatory ──────────────────────────────────────────────────────────────
log_stage "Start Firebase Emulators"
FIREBASE_EMULATOR_START=(firebase emulators:start)
if [[ "$APPHOSTING_ENABLED" != "true" ]]; then
  FIREBASE_EMULATOR_START+=(--only "$FIREBASE_EMULATORS_ONLY")
fi

if [[ "$USE_EMULATOR_IMPORT" == "true" ]]; then
  if [[ "$START_DEV_EXPORT_ON_EXIT" == "true" ]]; then
    log_step "Używam snapshotu emulatora z ${EMULATOR_DATA_DIR} (import + export-on-exit)"
    "${FIREBASE_EMULATOR_START[@]}" \
      --import="$EMULATOR_DATA_DIR" \
      --export-on-exit="$EMULATOR_DATA_DIR" &
  else
    log_step "Używam snapshotu emulatora z ${EMULATOR_DATA_DIR} (import bez export-on-exit)"
    "${FIREBASE_EMULATOR_START[@]}" \
      --import="$EMULATOR_DATA_DIR" &
  fi
else
  if [[ "$START_DEV_EXPORT_ON_EXIT" == "true" ]]; then
    log_step "Start bez importu snapshotu (export-on-exit do ${EMULATOR_DATA_DIR})"
    "${FIREBASE_EMULATOR_START[@]}" \
      --export-on-exit="$EMULATOR_DATA_DIR" &
  else
    log_step "Start bez importu snapshotu (export-on-exit wyłączony)"
    "${FIREBASE_EMULATOR_START[@]}" &
  fi
fi
EMULATOR_PID=$!

# ── 2. Czekaj na Emulator Hub (port 4400) ────────────────────────────────────
log_stage "Czekanie na emulatory"
log_step "Czekam na Emulator Hub (:4400)"
TIMEOUT=90
for i in $(seq 1 $TIMEOUT); do
  if port_open 4400; then
    log_ok "Emulator Hub gotowy (${i}s)"
    break
  fi
  if [ "$i" -eq "$TIMEOUT" ]; then
    log_error "Timeout ${TIMEOUT}s — sprawdź czy firebase-tools jest zainstalowany globalnie"
    exit 1
  fi
  printf "."
  sleep 1
done

# Czekaj jeszcze na Firestore (:8080) — może chwilę dłużej zajmuje
log_step "Czekam na Firestore (:8080)"
for i in $(seq 1 30); do
  if port_open 8080; then
    log_ok "Firestore gotowy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    log_warn "Firestore nie odpowiedział — seeduję mimo to"
    break
  fi
  printf "."
  sleep 1
done

# Czekaj na Auth emulator (:9099) — seed wymaga go do tworzenia użytkowników
log_step "Czekam na Auth emulator (:9099)"
for i in $(seq 1 30); do
  if port_open 9099; then
    log_ok "Auth emulator gotowy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    log_warn "Auth emulator nie odpowiedział — seeduję mimo to"
    break
  fi
  printf "."
  sleep 1
done
# ── 3. Seed ───────────────────────────────────────────────────────────────────
log_stage "Seedowanie danych"
log_step "Seeduję dane testowe"

RAW_SEED_AUTH="${SEED_AUTH:-}"
RAW_SEED_FIRESTORE="${SEED_FIRESTORE:-}"

SEED_AUTH="${SEED_AUTH:-true}"
SEED_FIRESTORE="${SEED_FIRESTORE:-true}"
SEED_STORAGE="${SEED_STORAGE:-false}"
SEED_PROFILE="${SEED_PROFILE:-all}"
SEED_GDRIVE_SMOKETEST="${SEED_GDRIVE_SMOKETEST:-false}"

if [[ "$USE_EMULATOR_IMPORT" == "true" ]]; then
  log_warn "Snapshot import aktywny — uruchamiam seed referencyjny dla spójności danych (nadpisanie stanu bazowego)."
fi

if [[ "$SEED_FIRESTORE" == "true" ]]; then
  log_step "Profil seedowania Firestore: ${SEED_PROFILE}"
  if [[ "$SEED_AUTH" != "true" ]]; then
    log_warn "SEED_AUTH=false jest przestarzałe w unified seed; auth zostanie zasilone razem z Firestore."
  fi
  NEXT_PUBLIC_USE_EMULATORS=true SEED_PROFILE="$SEED_PROFILE" SEED_STORAGE="$SEED_STORAGE" npx tsx scripts/seed.ts || log_warn "Seed unified (Auth+Firestore/Storage) zakończony z błędem (dane mogą już istnieć)"
else
  log_warn "SEED_FIRESTORE=false -> pomijam unified seed"
fi

if [[ "$SEED_GDRIVE_SMOKETEST" == "true" ]]; then
  npx tsx scripts/drive-smoketest.ts || log_warn "Drive smoketest zakończony z błędem"
fi

# ── 4. Next.js dev ────────────────────────────────────────────────────────────
log_stage "Start aplikacji"
log_step "App URL: http://${NEXT_HOST}:${PORT} (lokalny host jednolity)"
log_step "App Hosting emulator: http://${NEXT_HOST}:${APPHOSTING_PORT}"
log_step "Emulator UI: http://${NEXT_HOST}:4000"
if [[ "$START_DEV_ENABLE_DATACONNECT" == "true" ]]; then
  log_step "Data Connect emulator: http://${NEXT_HOST}:5500"
fi
log_step "Swagger UI (Seeds): /${SWAGGER_LANG}/swagger/seed (na porcie aktywnej appki)"
log_step "Swagger spec: /api/swagger/seed (na porcie aktywnej appki)"
if [[ -n "${GDRIVE_SEED_FOLDER_ID:-}" ]]; then
  log_ok "GDrive Seeds: skonfigurowane (GDRIVE_SEED_FOLDER_ID ustawione)"
else
  log_warn "GDrive Seeds: brak (ustaw GDRIVE_SEED_FOLDER_ID, żeby używać /api/seed/* z Drive)"
fi
# Przy wymuszonym App Hosting emulatorze (START_DEV_USE_APPHOSTING=true)
# Firebase uruchamia appkę przez startCommand i pomijamy ręczny `next dev`.
if [ "$APPHOSTING_ENABLED" = "true" ]; then
  log_warn "START_DEV_USE_APPHOSTING=true — pomijam ręczny start Next.js."
  log_step "Aplikacja będzie dostępna przez App Hosting (:${APPHOSTING_PORT})"
  wait "$EMULATOR_PID"
  exit 0
fi

# Jeśli nie ma serwera na porcie appki, usuń ewentualny stary lock i startuj lokalnie.
if [ -f ".next/dev/lock" ] && ! pgrep -f "next dev" >/dev/null 2>&1; then
  log_step "Usuwam stary lock .next/dev/lock"
  rm -f .next/dev/lock
fi

NEXT_PUBLIC_USE_EMULATORS=true npx next dev -H "$NEXT_HOST" -p "$PORT" &
NEXTJS_PID=$!

# Czekaj aż Next.js odpowie na /api/health (max 120s)
log_step "Czekam na Next.js (:${PORT})"
for i in $(seq 1 60); do
  if ! kill -0 "$NEXTJS_PID" 2>/dev/null; then
    log_error "Next.js zakończył się niespodziewanie"
    exit 1
  fi
  resp_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://${NEXT_HOST}:${PORT}/api/health" 2>/dev/null || true)
  if [ "$resp_code" = "200" ]; then
    log_ok "Next.js gotowy (${i}×2s)"
    break
  fi
  if [ "$i" -eq 60 ]; then
    log_warn "Next.js nie odpowiedział na /api/health w 120s — może potrzebuje dłużej na pierwszą kompilację"
  fi
  sleep 2
done

log_ok "Dev stack gotowy: http://${NEXT_HOST}:${PORT}"

# Trzymaj skrypt żywy — czekaj na oba procesy.
# Kiedy którykolwiek umrze (Ctrl+C, crash), trap cleanup zamknie resztę.
wait "$NEXTJS_PID" "$EMULATOR_PID" 2>/dev/null || true
