#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Walidacja zmiennych deploy"

usage() {
  cat <<'EOF'
Validate deploy environment variables required for CI/CD and Google integrations.

Usage:
  ./scripts/validate-deploy-env.sh [--env-file <path>] [--strict]

Options:
  --env-file <path>   Optional env file to load before validation (e.g. .env.production)
  --strict            Fail when optional fallbacks are unresolved
EOF
}

ENV_FILE=""
STRICT="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --strict)
      STRICT="true"
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

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Brak pliku env: $ENV_FILE"
    exit 1
  fi
  log_stage "Wczytanie pliku env"
  log_step "Ładowanie $ENV_FILE"
  load_env_file "$ENV_FILE" true
  log_ok "Załadowano $ENV_FILE"
fi

log_stage "Sprawdzanie wymaganych zmiennych"

MISSING=()
WARNINGS=()

require_var() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    MISSING+=("$key")
  fi
}

warn_if_empty() {
  local key="$1"
  local msg="$2"
  if [[ -z "${!key:-}" ]]; then
    WARNINGS+=("$msg")
  fi
}

check_redirect() {
  local key="$1"
  local required_suffix="$2"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    return 0
  fi
  if [[ "$value" != https://* ]]; then
    WARNINGS+=("$key should use https:// in production")
  fi
  if [[ "$value" != *"$required_suffix" ]]; then
    WARNINGS+=("$key should end with $required_suffix")
  fi
}

# Core Next.js client Firebase config.
require_var "NEXT_PUBLIC_FIREBASE_API_KEY"
require_var "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
require_var "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
require_var "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
require_var "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
require_var "NEXT_PUBLIC_FIREBASE_APP_ID"

# Base OAuth (Drive) remains required, calendar/workspace can fallback to it.
require_var "GOOGLE_DRIVE_CLIENT_ID"
require_var "GOOGLE_DRIVE_CLIENT_SECRET"
require_var "GOOGLE_DRIVE_REDIRECT_URI"

# Frontend Calendar remains explicit in existing hook.
require_var "NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID"

# Workspace frontend can fallback to Drive client id, but strict mode requires one of them.
if [[ -z "${NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID:-}" && -z "${NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID:-}" ]]; then
  if [[ "$STRICT" == "true" ]]; then
    MISSING+=("NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID")
  else
    WARNINGS+=("Workspace frontend OAuth client not set (NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID)")
  fi
fi

# Calendar server credentials can fallback to Drive.
if [[ -z "${GOOGLE_CALENDAR_CLIENT_ID:-}" && -z "${GOOGLE_DRIVE_CLIENT_ID:-}" ]]; then
  MISSING+=("GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_DRIVE_CLIENT_ID")
fi
if [[ -z "${GOOGLE_CALENDAR_CLIENT_SECRET:-}" && -z "${GOOGLE_DRIVE_CLIENT_SECRET:-}" ]]; then
  MISSING+=("GOOGLE_CALENDAR_CLIENT_SECRET or GOOGLE_DRIVE_CLIENT_SECRET")
fi
if [[ -z "${GOOGLE_CALENDAR_REDIRECT_URI:-}" && -z "${GOOGLE_DRIVE_REDIRECT_URI:-}" ]]; then
  MISSING+=("GOOGLE_CALENDAR_REDIRECT_URI or GOOGLE_DRIVE_REDIRECT_URI")
fi

# Workspace server credentials can fallback to Drive.
if [[ -z "${GOOGLE_WORKSPACE_CLIENT_ID:-}" && -z "${GOOGLE_DRIVE_CLIENT_ID:-}" ]]; then
  MISSING+=("GOOGLE_WORKSPACE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_ID")
fi
if [[ -z "${GOOGLE_WORKSPACE_CLIENT_SECRET:-}" && -z "${GOOGLE_DRIVE_CLIENT_SECRET:-}" ]]; then
  MISSING+=("GOOGLE_WORKSPACE_CLIENT_SECRET or GOOGLE_DRIVE_CLIENT_SECRET")
fi
if [[ -z "${GOOGLE_WORKSPACE_REDIRECT_URI:-}" && -z "${GOOGLE_DRIVE_REDIRECT_URI:-}" ]]; then
  MISSING+=("GOOGLE_WORKSPACE_REDIRECT_URI or GOOGLE_DRIVE_REDIRECT_URI")
fi

# URL sanity checks.
check_redirect "GOOGLE_DRIVE_REDIRECT_URI" "/api/drive/callback"
check_redirect "GOOGLE_CALENDAR_REDIRECT_URI" "/api/calendar/callback"
check_redirect "GOOGLE_WORKSPACE_REDIRECT_URI" "/api/workspace/callback"

warn_if_empty "SEED_ADMIN_KEY" "SEED_ADMIN_KEY is empty (seed endpoints fallback key disabled)"

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  log_stage "Ostrzeżenia"
  for item in "${WARNINGS[@]}"; do
    log_warn "$item"
  done
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
  log_stage "Brakujące wymagane zmienne"
  for item in "${MISSING[@]}"; do
    log_error "$item"
  done
  exit 1
fi

log_ok "Walidacja środowiska zakończona sukcesem."
