#!/usr/bin/env bash
set -euo pipefail

TITLE=${1:-Current Diff (public)}
LRV="$(cd "$(dirname "$0")/.." && pwd)/target/release/lrv"

# Detect Tailscale IPv4 (optional)
TAIL_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TAIL_IP=$(tailscale ip -4 2>/dev/null | awk 'NF{print $1; exit}') || true
fi

LOG_DIR=$(mktemp -d)
LOG="$LOG_DIR/server.log"
PIDFILE="$LOG_DIR/server.pid"

(
  (git diff HEAD | "$LRV" --no-open --public ${TAIL_IP:+--bind $TAIL_IP} --port 0 --title "$TITLE")
) >"$LOG" 2>&1 & echo $! >"$PIDFILE"

for _ in $(seq 1 200); do
  if grep -q "^Server running on port" "$LOG"; then break; fi
  sleep 0.05
done

URLS=$(sed -n 's/^  \(http:\/\/[^ ]*\)$/\1/p' "$LOG")
echo "PID: $(cat "$PIDFILE")"
echo "URLs:"; echo "$URLS"
echo "Log: $LOG"

