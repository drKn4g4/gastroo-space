#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Deploy gastroo-space to Firebase.

Usage:
  ./scripts/deploy-firebase.sh [--project <id>] [--only <targets>] [--skip-apphosting]

Options:
  --project <id>        Override Firebase project (default comes from .firebaserc / firebase CLI)
  --only <targets>      Pass-through to `firebase deploy --only ...` (default deploys functions, firestore, storage, database, remoteconfig)
  --skip-apphosting     Do not attempt Firebase App Hosting deploy

Examples:
  ./scripts/deploy-firebase.sh
  ./scripts/deploy-firebase.sh --project gastroo-4f0a3
  ./scripts/deploy-firebase.sh --only functions,firestore
EOF
}

PROJECT_FLAG=()
ONLY_TARGETS=""
SKIP_APPHOSTING="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_FLAG=(--project "${2:-}")
      shift 2
      ;;
    --only)
      ONLY_TARGETS="${2:-}"
      shift 2
      ;;
    --skip-apphosting)
      SKIP_APPHOSTING="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install with: npm i -g firebase-tools" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Firebase deploy (root: $ROOT_DIR)"

if [ -f ".env.production" ]; then
  log_stage "Przygotowanie środowiska"
  log_step "Ładowanie .env.production"
  load_env_file ".env.production"
  log_ok "Załadowano .env.production"
fi

DEFAULT_ONLY="functions,firestore,storage,database,remoteconfig"

log_stage "Deploy zasobów Firebase"
if [[ -n "$ONLY_TARGETS" ]]; then
  run_stage_cmd "firebase deploy --only $ONLY_TARGETS" firebase deploy "${PROJECT_FLAG[@]}" --only "$ONLY_TARGETS"
else
  run_stage_cmd "firebase deploy --only $DEFAULT_ONLY" firebase deploy "${PROJECT_FLAG[@]}" --only "$DEFAULT_ONLY"
fi

if [[ "$SKIP_APPHOSTING" == "true" ]]; then
  log_warn "Pomijam deploy App Hosting (--skip-apphosting)."
  exit 0
fi

BACKEND_ID="$(
  node -e "const fs=require('fs'); const p='firebase.json'; if(!fs.existsSync(p)){process.exit(0)}; const j=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write(j?.apphosting?.backendId||'');"
)"

if [[ -z "$BACKEND_ID" ]]; then
  log_warn "App Hosting nie jest skonfigurowany (brak apphosting.backendId w firebase.json)."
  exit 0
fi

if firebase --help 2>/dev/null | grep -q "apphosting"; then
  if firebase --help 2>/dev/null | grep -q "apphosting:backends:deploy"; then
    log_stage "Deploy Firebase App Hosting"
    run_stage_cmd "firebase apphosting:backends:deploy $BACKEND_ID" firebase apphosting:backends:deploy "${PROJECT_FLAG[@]}" "$BACKEND_ID"
    log_ok "Deploy Firebase + App Hosting zakończony sukcesem."
    exit 0
  fi
fi

cat <<EOF
== App Hosting deploy skipped ==
Detected apphosting.backendId="$BACKEND_ID" in firebase.json, but your firebase-tools CLI does not expose
\`apphosting:backends:deploy\` (or it is disabled).

If you're using Firebase App Hosting in prod, upgrade firebase-tools and deploy manually, e.g.:
  firebase apphosting:backends:deploy ${PROJECT_FLAG[*]:-} $BACKEND_ID
EOF
