#!/usr/bin/env bash
# build.sh — Build the frontend and start Rendermate in production mode.
#
# Steps:
#   1. Stop any running dev/prod servers (via stop.sh).
#   2. Build the frontend with Vite (output → frontend/dist/).
#   3. Start only the Bun backend, which serves both the API and the
#      compiled static files on port 3000.
#
# Usage:
#   ./build.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.pids"
BUN="$HOME/.bun/bin/bun"

# ── Sanity checks ─────────────────────────────────────────────────────────────

if [[ ! -x "$BUN" ]]; then
  echo "ERROR: bun not found at $BUN" >&2
  exit 1
fi

# ── Stop any running servers ──────────────────────────────────────────────────

echo "■  Stopping any running servers …"
bash "$SCRIPT_DIR/stop.sh"
echo ""

# ── Build frontend ────────────────────────────────────────────────────────────

echo "■  Building frontend …"
(
  cd "$SCRIPT_DIR/frontend"
  "$BUN" run build
)
echo ""
echo "✔  Frontend built → frontend/dist/"
echo ""

# ── Start backend (production) ────────────────────────────────────────────────

echo "▶  Starting backend in production mode (http://localhost:3000) …"
(
  cd "$SCRIPT_DIR/backend"
  "$BUN" run server.ts \
    >> "$SCRIPT_DIR/backend.log" 2>&1
) &
BACKEND_PID=$!

printf '%s\n' "$BACKEND_PID" > "$PID_FILE"

echo ""
echo "✔  Rendermate is running."
echo "   Backend PID : $BACKEND_PID  (log → backend.log)"
echo ""
echo "   App → http://localhost:3000"
echo ""
echo "   Run ./stop.sh to shut the server down."

# ── Open browser ──────────────────────────────────────────────────────────────

sleep 1
if command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:3000" &>/dev/null &
elif command -v open &>/dev/null; then
  open "http://localhost:3000" &>/dev/null &
fi
