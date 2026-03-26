#!/usr/bin/env bash
# scripts/test-api.sh
# Runs Playwright API tests. Playwright handles the webServer lifecycle.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "API test pipeline"

# Load emulators env if present
log_stage "Przygotowanie środowiska"
if [ -f ".env.emulators" ]; then
  export $(grep -v '^#' .env.emulators | xargs)
  log_ok "Załadowano .env.emulators"
else
  log_warn "Brak .env.emulators - używam aktualnego środowiska"
fi

log_stage "Uruchomienie testów"
log_step "Playwright API Seed tests"
npx playwright test tests/api-seed.spec.ts
log_ok "API Seed tests zakończone"
