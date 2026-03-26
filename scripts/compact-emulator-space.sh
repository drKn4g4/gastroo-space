#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Compact emulator space"

DEFAULT_EMULATOR_DATA_DIR="${HOME:-$PWD}/.cache/gastroo-space/emulator-data"
EMULATOR_IMPORT_FROM_CONFIG="$(firebase_json_read "(typeof c?.emulators?.import === 'string' && c.emulators.import.trim()) ? c.emulators.import.trim() : ''")"

EMULATOR_DATA_DIR="${START_DEV_EMULATOR_DATA_DIR:-${EMULATOR_IMPORT_FROM_CONFIG:-$DEFAULT_EMULATOR_DATA_DIR}}"
KEEP_LEGACY_EXPORTS="${START_DEV_KEEP_LEGACY_EXPORTS:-2}"
CLEAN_TEST_ARTIFACTS="${START_DEV_PRUNE_TEST_ARTIFACTS:-true}"

dir_kb() {
  local path="$1"
  if [ -e "$path" ]; then
    du -sk "$path" 2>/dev/null | awk '{print $1}'
  else
    echo "0"
  fi
}

before_kb=0
for target in "$EMULATOR_DATA_DIR" "$ROOT_DIR/playwright-report" "$ROOT_DIR/test-results"; do
  before_kb=$((before_kb + $(dir_kb "$target")))
done

log_stage "Parametry"
log_step "Emulator snapshot dir: ${EMULATOR_DATA_DIR}"
log_step "Keep legacy exports: ${KEEP_LEGACY_EXPORTS}"

if [ -d "$ROOT_DIR" ]; then
  legacy_dirs=()
  while IFS= read -r line; do
    [ -n "$line" ] && legacy_dirs+=("$line")
  done < <(find "$ROOT_DIR" -maxdepth 1 -type d -name 'firebase-export-*' -print | sort)

  if [ "${#legacy_dirs[@]}" -gt "$KEEP_LEGACY_EXPORTS" ]; then
    sorted_by_time=()
    while IFS= read -r line; do
      [ -n "$line" ] && sorted_by_time+=("$line")
    done < <(ls -dt "${legacy_dirs[@]}" 2>/dev/null || true)

    for ((i=KEEP_LEGACY_EXPORTS; i<${#sorted_by_time[@]}; i++)); do
      dir="${sorted_by_time[$i]}"
      log_step "remove ${dir#$ROOT_DIR/}"
      rm -rf "$dir"
    done
  fi
fi

if [ "$CLEAN_TEST_ARTIFACTS" = "true" ]; then
  [ -d "$ROOT_DIR/playwright-report" ] && rm -rf "$ROOT_DIR/playwright-report"/* 2>/dev/null || true
  [ -d "$ROOT_DIR/test-results" ] && rm -rf "$ROOT_DIR/test-results"/* 2>/dev/null || true
fi

mkdir -p "$EMULATOR_DATA_DIR"

after_kb=0
for target in "$EMULATOR_DATA_DIR" "$ROOT_DIR/playwright-report" "$ROOT_DIR/test-results"; do
  after_kb=$((after_kb + $(dir_kb "$target")))
done

freed_kb=$((before_kb - after_kb))
if [ "$freed_kb" -lt 0 ]; then
  freed_kb=0
fi

log_stage "Podsumowanie"
log_ok "Compact done"
log_step "Space before: ${before_kb} KB"
log_step "Space after:  ${after_kb} KB"
log_step "Freed:        ${freed_kb} KB"
