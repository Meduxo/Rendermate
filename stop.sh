#!/usr/bin/env bash
# stop.sh — Stop all Rendermate servers started by dev.sh or build.sh.
#
# Reads PIDs from .pids and sends SIGTERM to each process.
# Falls back to killing by port if the PID is no longer valid.
#
# Usage:
#   ./stop.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.pids"

killed=0

# ── Kill via PID file ─────────────────────────────────────────────────────────

if [[ -f "$PID_FILE" ]]; then
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      echo "  Stopping PID $pid …"
      kill "$pid" 2>/dev/null && killed=$((killed + 1))
    else
      echo "  PID $pid is no longer running (already stopped)."
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "  No .pids file found — falling back to port-based cleanup."
fi

# ── Fallback: kill anything still holding port 3000 or 5173 ──────────────────

for port in 3000 5173; do
  pids_on_port=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids_on_port" ]]; then
    echo "  Killing process(es) on port $port: $pids_on_port"
    echo "$pids_on_port" | xargs kill 2>/dev/null && killed=$((killed + 1))
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────

if [[ $killed -gt 0 ]]; then
  echo ""
  echo "✔  Rendermate servers stopped."
else
  echo ""
  echo "  Nothing to stop — no Rendermate servers were running."
fi
