#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Post-deploy smoke tests for App Hosting + Firebase Functions.

Usage:
  ./scripts/smoke-postdeploy.sh --base-url <https://app-url> [--project-id <id>] [--region <region>] [--skip-functions]

Options:
  --base-url <url>     Deployed app base URL (required)
  --project-id <id>    Firebase project id for callable smoke checks (optional)
  --region <region>    Functions region (default: europe-west1)
  --skip-functions     Skip callable function checks
EOF
}

BASE_URL=""
PROJECT_ID=""
REGION="europe-west1"
SKIP_FUNCTIONS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --project-id)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --skip-functions)
      SKIP_FUNCTIONS="true"
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

if [[ -z "$BASE_URL" ]]; then
  echo "Missing required --base-url" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Smoke testy po deploy"

log_stage "App Hosting health i callbacki OAuth"

run_stage_cmd "GET $BASE_URL/api/health" curl -fsS "$BASE_URL/api/health" >/dev/null
run_stage_cmd "GET $BASE_URL/api/ready" curl -fsS "$BASE_URL/api/ready" >/dev/null

GCAL_HTML="$(curl -fsS "$BASE_URL/api/calendar/callback?error=access_denied")"
if [[ "$GCAL_HTML" != *"GCAL_AUTH_ERROR"* ]]; then
  log_error "Calendar callback smoke failed: GCAL_AUTH_ERROR marker not found"
  exit 1
fi
log_ok "Calendar callback marker wykryty"

WORKSPACE_HTML="$(curl -fsS "$BASE_URL/api/workspace/callback?error=access_denied")"
if [[ "$WORKSPACE_HTML" != *"WORKSPACE_AUTH_ERROR"* ]]; then
  log_error "Workspace callback smoke failed: WORKSPACE_AUTH_ERROR marker not found"
  exit 1
fi
log_ok "Workspace callback marker wykryty"

log_ok "App Hosting smoke zakończony sukcesem."

if [[ "$SKIP_FUNCTIONS" == "true" ]]; then
  log_warn "Pomijam callable smoke checks (--skip-functions)."
  exit 0
fi

if [[ -z "$PROJECT_ID" ]]; then
  log_warn "Brak --project-id, pomijam callable smoke checks."
  exit 0
fi

callable_expect_unauth() {
  local fn_name="$1"
  local url="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${fn_name}"

  local response
  response="$(curl -sS -o /tmp/gastroo-smoke-body.txt -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    --data '{"data":{}}' \
    "$url" || true)"

  local body
  body="$(cat /tmp/gastroo-smoke-body.txt 2>/dev/null || true)"

  if [[ "$response" != "200" && "$response" != "401" && "$response" != "403" ]]; then
    log_error "Callable $fn_name returned unexpected HTTP status: $response"
    echo "$body" >&2
    exit 1
  fi

  if [[ "$body" != *"UNAUTHENTICATED"* && "$body" != *"unauthenticated"* ]]; then
    log_error "Callable $fn_name did not return expected unauthenticated error"
    echo "$body" >&2
    exit 1
  fi

  log_ok "Callable $fn_name zwrócił oczekiwany błąd unauthenticated"
}

log_stage "Callable functions"
callable_expect_unauth "driveGetStatus"
callable_expect_unauth "gbpGetStatus"
callable_expect_unauth "gcalGetStatus"
callable_expect_unauth "workspaceGetStatus"

log_ok "Callable smoke zakończony sukcesem."
