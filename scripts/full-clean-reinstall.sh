#!/bin/bash
# Skrypt do pełnego czyszczenia i reinstalacji zależności
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Full clean reinstall"

log_stage "Czyszczenie zależności i build artifacts"
rm -rf node_modules package-lock.json .next
log_ok "Usunięto node_modules, package-lock.json i .next"

log_stage "Instalacja zależności"
npm install
log_ok "Instalacja zależności zakończona"

log_ok "Czyszczenie i reinstalacja zakończone. Uruchom npm run dev:full."