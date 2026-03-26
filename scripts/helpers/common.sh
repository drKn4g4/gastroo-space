#!/usr/bin/env bash

# Shared shell helpers for local scripts.

_use_color() {
  if [ -n "${NO_COLOR:-}" ]; then
    return 1
  fi
  if [ -t 1 ]; then
    return 0
  fi
  return 1
}

_c_reset() {
  if _use_color; then printf '\033[0m'; fi
}

_c_bold() {
  if _use_color; then printf '\033[1m'; fi
}

_c_blue() {
  if _use_color; then printf '\033[34m'; fi
}

_c_cyan() {
  if _use_color; then printf '\033[36m'; fi
}

_c_green() {
  if _use_color; then printf '\033[32m'; fi
}

_c_yellow() {
  if _use_color; then printf '\033[33m'; fi
}

_c_red() {
  if _use_color; then printf '\033[31m'; fi
}

_line() {
  local ch="${1:--}"
  local n="${2:-64}"
  printf '%*s' "$n" '' | tr ' ' "$ch"
}

log_banner() {
  local title="$1"
  printf '\n%s\n' "$(_line '=')"
  printf '%s%s%s %s\n' "$(_c_bold)" "$(_c_blue)" "GASTROO PIPELINE" "$(_c_reset)"
  printf '%s%s%s\n' "$(_c_cyan)" "$title" "$(_c_reset)"
  printf '%s\n' "$(_line '=')"
}

log_stage() {
  local title="$1"
  printf '\n%s\n' "$(_line '-')"
  printf '%s[%s]%s %s\n' "$(_c_bold)" "ETAP" "$(_c_reset)" "$title"
  printf '%s\n' "$(_line '-')"
}

log_step() {
  local msg="$1"
  printf '%s> %s%s\n' "$(_c_cyan)" "$msg" "$(_c_reset)"
}

log_ok() {
  local msg="$1"
  printf '%sOK%s  %s\n' "$(_c_green)" "$(_c_reset)" "$msg"
}

log_warn() {
  local msg="$1"
  printf '%sWARN%s %s\n' "$(_c_yellow)" "$(_c_reset)" "$msg"
}

log_error() {
  local msg="$1"
  printf '%sERR%s  %s\n' "$(_c_red)" "$(_c_reset)" "$msg" >&2
}

run_stage_cmd() {
  local label="$1"
  shift
  log_step "$label"
  "$@"
  log_ok "$label"
}

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

load_env_file() {
  local file="$1"
  local override_mode="${2:-false}"
  [ -f "$file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="$(trim_whitespace "$line")"
    [ -z "$line" ] && continue
    [[ "$line" == \#* ]] && continue
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(trim_whitespace "$key")"

    if [[ "$val" == \"*\" ]]; then
      val="${val#\"}"; val="${val%\"}"
    elif [[ "$val" == \'*\' ]]; then
      val="${val#\'}"; val="${val%\'}"
    fi

    if [ "$override_mode" = "true" ] || [ -z "${!key:-}" ]; then
      export "$key=$val"
    fi
  done < "$file"
}

firebase_json_read() {
  local js_expr="$1"
  node -e "try { const c = require('./firebase.json'); const out = ${js_expr}; if (out !== undefined && out !== null) process.stdout.write(String(out)); } catch (_) {}" 2>/dev/null || true
}

is_true() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}
