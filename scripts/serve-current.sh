#!/usr/bin/env bash
set -euo pipefail

TITLE=${1:-Current Diff}
LRV="$(cd "$(dirname "$0")/.." && pwd)/target/release/lrv"

# Detect Tailscale IPv4 (optional)
TAIL_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TAIL_IP=$(tailscale ip -4 2>/dev/null | awk 'NF{print $1; exit}') || true
fi
if [ -z "$TAIL_IP" ]; then
  TAIL_IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | sed -n 's/^\(100\.[0-9.]*\).*/\1/p' | head -n1) || true
fi

LOG_DIR=$(mktemp -d)
LOG="$LOG_DIR/server.log"
PIDFILE="$LOG_DIR/server.pid"

# Choose a diff source: working tree vs last commit when clean
DIFF_SOURCE="diff"
if git diff HEAD --quiet; then
  DIFF_SOURCE="show"
fi

(
  ( ( [ "$DIFF_SOURCE" = "diff" ] && git diff HEAD || git show --no-color --patch HEAD ) \
    | "$LRV" --no-open --bind 127.0.0.1 ${TAIL_IP:+--bind $TAIL_IP} --port 0 --title "$TITLE" )
) >"$LOG" 2>&1 & echo $! >"$PIDFILE"

for _ in $(seq 1 200); do
  if grep -q "^Server running on port" "$LOG"; then break; fi
  sleep 0.05
done

PORT=$(sed -n 's/^Server running on port \([0-9][0-9]*\)$/\1/p' "$LOG" | head -n1)
URLS=$(sed -n 's/^  \(http:\/\/[^ ]*\)$/\1/p' "$LOG")

echo "PID: $(cat "$PIDFILE")"
echo "URLs:"; echo "$URLS"
echo "Log: $LOG"
