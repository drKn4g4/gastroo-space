#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Walidacja zmiennych deploy (z uwzględnieniem Feature Flags)"

usage() {
  cat <<'EOF'
Validate deploy environment variables required for CI/CD and Google integrations.
Respects NEXT_PUBLIC_FEATURE_* flags to skip validation for disabled features.

Usage:
  ./scripts/validate-deploy-env.sh [--env-file <path>] [--strict]

Options:
  --env-file <path>   Optional env file to load before validation
  --strict            Fail when optional fallbacks are unresolved
EOF
}

ENV_FILE=""
STRICT="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --strict) STRICT="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Brak pliku env: $ENV_FILE"
    exit 1
  fi
  log_stage "Wczytanie pliku env"
  load_env_file "$ENV_FILE" true
  log_ok "Załadowano $ENV_FILE"
fi

log_stage "Sprawdzanie wymaganych zmiennych"

MISSING=()
WARNINGS=()

# --- Helper Functions ---

is_feature_enabled() {
  local flag_name="$1"
  [[ "${!flag_name:-}" == "true" ]]
}

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
  [[ -z "$value" ]] && return 0
  [[ "$value" != https://* ]] && WARNINGS+=("$key should use https:// in production")
  [[ "$value" != *"$required_suffix" ]] && WARNINGS+=("$key should end with $required_suffix")
}

# --- 1. CORE FIREBASE (Always Required) ---
require_var "NEXT_PUBLIC_FIREBASE_API_KEY"
require_var "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
require_var "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
require_var "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
require_var "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
require_var "NEXT_PUBLIC_FIREBASE_APP_ID"

# --- 2. GOOGLE DRIVE (Required only if enabled) ---
if is_feature_enabled "NEXT_PUBLIC_FEATURE_GOOGLE_DRIVE"; then
  require_var "GOOGLE_DRIVE_CLIENT_ID"
  require_var "GOOGLE_DRIVE_CLIENT_SECRET"
  require_var "GOOGLE_DRIVE_REDIRECT_URI"
  check_redirect "GOOGLE_DRIVE_REDIRECT_URI" "/api/drive/callback"
else
  log_warn "Feature Google Drive is OFF - skipping validation"
fi

# --- 3. GOOGLE CALENDAR (Required only if enabled) ---
if is_feature_enabled "NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR"; then
  require_var "NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID"
  
  # Server-side fallback logic
  if [[ -z "${GOOGLE_CALENDAR_CLIENT_ID:-}" && -z "${GOOGLE_DRIVE_CLIENT_ID:-}" ]]; then
    MISSING+=("GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_DRIVE_CLIENT_ID")
  fi
  # ... (and so on for Secret and Redirect if you use them)
  check_redirect "GOOGLE_CALENDAR_REDIRECT_URI" "/api/calendar/callback"
else
  log_warn "Feature Google Calendar is OFF - skipping validation"
fi

# --- 4. GOOGLE WORKSPACE (Required only if enabled) ---
if is_feature_enabled "NEXT_PUBLIC_FEATURE_GOOGLE_WORKSPACE"; then
  if [[ -z "${NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID:-}" && -z "${NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID:-}" ]]; then
    if [[ "$STRICT" == "true" ]]; then
      MISSING+=("NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID")
    else
      WARNINGS+=("Workspace frontend OAuth client not set")
    fi
  fi
  check_redirect "GOOGLE_WORKSPACE_REDIRECT_URI" "/api/workspace/callback"
fi

# --- Final Checks ---
warn_if_empty "SEED_ADMIN_KEY" "SEED_ADMIN_KEY is empty (seed endpoints fallback key disabled)"

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  log_stage "Ostrzeżenia"
  for item in "${WARNINGS[@]}"; do log_warn "$item"; done
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
  log_stage "Brakujące wymagane zmienne"
  for item in "${MISSING[@]}"; do log_error "$item"; done
  exit 1
fi

log_ok "Walidacja środowiska zakończona sukcesem."