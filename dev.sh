#!/usr/bin/env bash
# dev.sh — Start Rendermate in development mode.
#
# Launches:
#   • Bun backend  (port 3000, hot-reload via --watch)
#   • Vite dev server (port 5173, proxies /api → backend)
#
# Both processes run in the background. Their PIDs are saved to .pids so
# stop.sh can cleanly terminate them later.
#
# Usage:
#   ./dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.pids"
BUN="$HOME/.bun/bin/bun"

# ── Sanity checks ─────────────────────────────────────────────────────────────

if [[ ! -x "$BUN" ]]; then
  echo "ERROR: bun not found at $BUN" >&2
  exit 1
fi

# Warn if servers are already running.
if [[ -f "$PID_FILE" ]]; then
  echo "WARNING: .pids file already exists — servers may already be running."
  echo "         Run ./stop.sh first, or delete .pids manually."
  echo ""
fi

# ── Start backend ─────────────────────────────────────────────────────────────

echo "▶  Starting backend  (http://localhost:3000) …"
(
  cd "$SCRIPT_DIR/backend"
  "$BUN" run --watch server.ts \
    >> "$SCRIPT_DIR/backend.log" 2>&1
) &
BACKEND_PID=$!

# ── Start frontend dev server ─────────────────────────────────────────────────

echo "▶  Starting frontend (http://localhost:5173) …"
(
  cd "$SCRIPT_DIR/frontend"
  "$BUN" run dev \
    >> "$SCRIPT_DIR/frontend.log" 2>&1
) &
FRONTEND_PID=$!

# ── Save PIDs ─────────────────────────────────────────────────────────────────

printf '%s\n%s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PID_FILE"

echo ""
echo "✔  Both servers started."
echo "   Backend  PID : $BACKEND_PID  (log → backend.log)"
echo "   Frontend PID : $FRONTEND_PID  (log → frontend.log)"
echo ""
echo "   App  → http://localhost:5173"
echo "   API  → http://localhost:3000"
echo ""
echo "   Run ./stop.sh to shut everything down."

# ── Wait a moment then open the browser ──────────────────────────────────────

sleep 1
if command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:5173" &>/dev/null &
elif command -v open &>/dev/null; then
  open "http://localhost:5173" &>/dev/null &
fi
