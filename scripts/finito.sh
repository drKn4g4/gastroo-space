#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/helpers/common.sh"

usage() {
  cat <<'EOF'
finito — update repo changes to git (add/commit/push) + bump app version.

Usage:
  ./scripts/finito.sh [--bump patch|minor|major|none] [--no-push] [--branch <name>] [--staged-only]

Defaults:
  --bump patch
  push to origin/<branch> (branch defaults to current branch)
  auto `git add .` before commit (disable via --staged-only)
EOF
}

BUMP="patch"
NO_PUSH="false"
BRANCH=""
STAGED_ONLY="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      BUMP="${2:-}"
      shift 2
      ;;
    --no-push)
      NO_PUSH="true"
      shift
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --staged-only)
      STAGED_ONLY="true"
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

if ! command -v git >/dev/null 2>&1; then
  log_error "git not found"
  exit 1
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

MODE_LABEL="add/commit"
if [[ "$STAGED_ONLY" == "true" ]]; then
  MODE_LABEL="commit(staged-only)"
fi
log_banner "finito"
log_stage "Konfiguracja"
log_step "mode=${MODE_LABEL}${NO_PUSH/true/ (no-push)}"
log_step "branch=$BRANCH"
log_step "repo=$ROOT_DIR"

NEW_VERSION=""
if [[ "$BUMP" != "none" ]]; then
  if ! command -v node >/dev/null 2>&1; then
    log_error "node not found (required to bump version in package.json)"
    exit 1
  fi

  NEW_VERSION="$(
    node - <<'NODE'
const fs = require('fs');
const bump = process.env.BUMP;
const file = 'package.json';
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const v = String(pkg.version || '0.0.0');
const parts = v.split('.').map((x) => Number(x));
if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
  console.error(`Invalid version in package.json: ${v}`);
  process.exit(2);
}
let [maj, min, pat] = parts;
if (bump === 'major') { maj += 1; min = 0; pat = 0; }
else if (bump === 'minor') { min += 1; pat = 0; }
else if (bump === 'patch') { pat += 1; }
else {
  console.error(`Unknown bump: ${bump}`);
  process.exit(2);
}
const next = `${maj}.${min}.${pat}`;
pkg.version = next;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
process.stdout.write(next);
NODE
  )"
  log_ok "Bumped version -> $NEW_VERSION (package.json)"
fi

if [[ "$STAGED_ONLY" != "true" ]]; then
  log_stage "Git add"
  git add .
  log_ok "git add ."
else
  log_warn "Skipping git add . (--staged-only)."
fi

if git diff --cached --quiet; then
  log_warn "No staged changes. Nothing to commit."
  exit 0
fi

CURRENT_DATETIME="$(date +'%Y-%m-%d %H:%M:%S')"
if [[ -n "$NEW_VERSION" ]]; then
  COMMIT_MESSAGE="chore(release): v${NEW_VERSION} (${CURRENT_DATETIME})"
else
  COMMIT_MESSAGE="chore: finito (${CURRENT_DATETIME})"
fi

log_stage "Git commit"
git commit -m "$COMMIT_MESSAGE"
log_ok "committed: $COMMIT_MESSAGE"

if [[ "$NO_PUSH" == "true" ]]; then
  log_warn "Skipping push (--no-push)."
  exit 0
fi

log_stage "Git push"
git push --set-upstream origin "$BRANCH"
log_ok "pushed: origin/$BRANCH"

