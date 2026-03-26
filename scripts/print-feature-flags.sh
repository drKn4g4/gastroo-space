#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Feature flags (effective)"
log_stage "Konfiguracja"
log_step "FEATURE_FLAG_PROFILE=${FEATURE_FLAG_PROFILE:-dev}"
log_step "FEATURE_FLAG_PROFILE_FILE=config/feature-flags/${FEATURE_FLAG_PROFILE:-dev}.env"
log_stage "Flagi"
log_step "NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE=${NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE:-true}"
log_step "NEXT_PUBLIC_FEATURE_GOOGLE_CHAT=${NEXT_PUBLIC_FEATURE_GOOGLE_CHAT:-true}"
log_step "NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR=${NEXT_PUBLIC_FEATURE_GOOGLE_CALENDAR:-true}"
log_step "NEXT_PUBLIC_FEATURE_ADVANCED_FLOORPLAN=${NEXT_PUBLIC_FEATURE_ADVANCED_FLOORPLAN:-true}"
log_step "NEXT_PUBLIC_FEATURE_AVAILABILITY_REQUESTS=${NEXT_PUBLIC_FEATURE_AVAILABILITY_REQUESTS:-true}"
log_step "FEATURE_ENABLE_DATACONNECT=${FEATURE_ENABLE_DATACONNECT:-true}"
log_ok "Wydruk flag zakończony"
