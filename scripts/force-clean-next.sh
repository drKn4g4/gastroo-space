#!/bin/bash
# Skrypt do twardego czyszczenia środowiska Next.js
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Force clean Next.js"

log_stage "Zatrzymanie procesów dev"

# Zabij wszystkie procesy next dev/node na portach 5202 i 5002
pkill -f 'next dev' || true
pkill -f 'npm run dev' || true
lsof -ti tcp:5202 | xargs kill -9 2>/dev/null || true
lsof -ti tcp:5002 | xargs kill -9 2>/dev/null || true
log_ok "Procesy dev zatrzymane"

log_stage "Czyszczenie artefaktów"
# Usuń cały katalog .next
rm -rf .next
log_ok "Usunięto .next"

# Sprawdź uprawnienia do katalogu projektu
if [ ! -w . ]; then
  log_error "Brak uprawnień do katalogu projektu. Użyj: sudo chown -R $(whoami) ."
else
  log_ok "Uprawnienia do katalogu OK"
fi

log_ok "Środowisko Next.js wyczyszczone. Możesz uruchomić npm run dev:full."
