#!/bin/bash
# Skrypt do zabijania wszystkich procesów next dev i usuwania locka .next/dev/lock

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Kill Next dev lock"

log_stage "Zatrzymanie procesów dev"

# Zabij wszystkie procesy next dev i npm run dev
pkill -f 'next dev' || true
pkill -f 'npm run dev' || true
log_ok "Procesy next dev zatrzymane"

# Usuń plik locka jeśli istnieje
LOCK_FILE=".next/dev/lock"
log_stage "Obsługa locka"
if [ -f "$LOCK_FILE" ]; then
  rm -f "$LOCK_FILE"
  log_ok "Usunięto $LOCK_FILE"
else
  log_warn "$LOCK_FILE nie istnieje"
fi

log_ok "Możesz bezpiecznie uruchomić dev serwer."
