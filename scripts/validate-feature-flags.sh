#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Walidacja feature flags"

ALLOWED_FLAGS=(
  NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE
  NEXT_PUBLIC_FEATURE_GOOGLE_CHAT
  NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR
  NEXT_PUBLIC_FEATURE_ADVANCED_FLOORPLAN
  NEXT_PUBLIC_FEATURE_AVAILABILITY_REQUESTS
  FEATURE_ENABLE_DATACONNECT
)

is_allowed() {
  local candidate="$1"
  for allowed in "${ALLOWED_FLAGS[@]}"; do
    if [[ "$allowed" == "$candidate" ]]; then
      return 0
    fi
  done
  return 1
}

is_valid_bool() {
  local value="${1:-}"
  local normalized
  normalized="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  case "$normalized" in
    1|0|true|false|yes|no|on|off) return 0 ;;
    *) return 1 ;;
  esac
}

unknown=()
invalid=()

while IFS='=' read -r key value; do
  [[ -z "${key:-}" ]] && continue
  if [[ "$key" =~ ^(NEXT_PUBLIC_FEATURE_|FEATURE_ENABLE_) ]]; then
    if ! is_allowed "$key"; then
      unknown+=("$key")
      continue
    fi

    if ! is_valid_bool "$value"; then
      invalid+=("$key=$value")
    fi
  fi
done < <(env)

if (( ${#unknown[@]} > 0 )); then
  log_stage "Unknown flags"
  for f in "${unknown[@]}"; do
    log_error "$f"
  done
fi

if (( ${#invalid[@]} > 0 )); then
  log_stage "Invalid boolean values"
  for f in "${invalid[@]}"; do
    log_error "$f"
  done
fi

if (( ${#unknown[@]} > 0 || ${#invalid[@]} > 0 )); then
  if [[ "${FEATURE_FLAGS_STRICT:-false}" == "true" ]]; then
    log_error "Strict mode enabled -> fail"
    exit 1
  fi
  log_warn "Non-strict mode -> warning only"
else
  log_ok "Feature flags OK"
fi
