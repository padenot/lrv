#!/usr/bin/env bash
set -euo pipefail

echo "[check-offline] Verifying vendored assets exist..."
ASSETS_OK=1
missing=()
for p in \
  web/assets/vendor/monaco/min/vs/loader.js \
  web/assets/fonts/Inter-Variable.woff2 \
  web/assets/fonts/GeistSans-Variable.woff2 \
  web/assets/fonts/JetBrainsMono-Variable.woff2; do
  if [[ ! -f "$p" ]]; then
    ASSETS_OK=0
    missing+=("$p")
  fi
done

if [[ "$ASSETS_OK" -ne 1 ]]; then
  echo "[check-offline] Missing assets:" >&2
  for m in "${missing[@]}"; do echo "  - $m" >&2; done
  echo "Use 'just vendor-assets' and 'just vendor-fonts' to install." >&2
  exit 1
fi

echo "[check-offline] Building debug binary..."
cargo build >/dev/null

echo "[check-offline] Starting server on ephemeral port..."
LOG=.offline_check_server.log
PIDFILE=.offline_check_server.pid
rm -f "$LOG" "$PIDFILE"

# Minimal diff payload
DIFF_PAYLOAD=$'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b\n'

( printf "%s" "$DIFF_PAYLOAD" | target/debug/lrv --no-open --tailscale --port 0 >"$LOG" 2>&1 & echo $! > "$PIDFILE" )

# Wait up to 3s for bind
for i in {1..30}; do
  if grep -q "^Server running on port" "$LOG"; then break; fi
  sleep 0.1
done

if ! grep -q "^Server running on port" "$LOG"; then
  echo "[check-offline] Server did not start correctly." >&2
  cat "$LOG" >&2 || true
  exit 1
fi

PORT=$(sed -n 's/^Server running on port \([0-9][0-9]*\)$/\1/p' "$LOG" | head -n1)
if [[ -z "${PORT:-}" ]]; then
  echo "[check-offline] Could not parse port." >&2
  exit 1
fi

URL="http://127.0.0.1:${PORT}"
echo "[check-offline] Hitting ${URL} ..."

code=0

# Fetch index
if ! curl -fsS "$URL/" >/dev/null; then
  echo "[check-offline] Failed to GET /" >&2
  code=1
fi

# Fetch monaco loader via assets route
if ! curl -fsS "$URL/assets/vendor/monaco/min/vs/loader.js" >/dev/null; then
  echo "[check-offline] Failed to GET /assets/vendor/monaco/min/vs/loader.js" >&2
  code=1
fi

# Fetch fonts
for f in Inter-Variable.woff2 GeistSans-Variable.woff2 JetBrainsMono-Variable.woff2; do
  if ! curl -fsS "$URL/assets/fonts/$f" >/dev/null; then
    echo "[check-offline] Failed to GET /assets/fonts/$f" >&2
    code=1
  fi
done

echo "[check-offline] Stopping server..."
if [[ -f "$PIDFILE" ]]; then
  PID=$(cat "$PIDFILE" || true)
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    sleep 0.2
    if kill -0 "$PID" 2>/dev/null; then kill -KILL "$PID" || true; fi
  fi
fi
rm -f "$LOG" "$PIDFILE"

if [[ "$code" -ne 0 ]]; then
  echo "[check-offline] FAIL" >&2
  exit "$code"
fi

echo "[check-offline] PASS: assets present and served locally."
