#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

log_banner "Local deploy pipeline (container smoke)"

log_stage "Build aplikacji"
run_stage_cmd "npm run build" npm run build

log_stage "Uruchomienie kontenera"
run_stage_cmd "docker compose up --build -d" docker compose up --build -d
trap 'docker compose down -v || true' EXIT

log_stage "Health checks"
for i in {1..25}; do
  if curl -fsS http://127.0.0.1:5202/api/health >/dev/null; then
    log_ok "Health endpoint gotowy"
    break
  fi
  sleep 2
done

run_stage_cmd "GET /api/ready" curl -fsS http://127.0.0.1:5202/api/ready >/dev/null

log_ok "Local deploy pipeline zakończony sukcesem."
