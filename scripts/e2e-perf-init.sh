#!/usr/bin/env bash
set -euo pipefail

# Run the perf init Playwright test with aggressive logging.
# Usage: scripts/e2e-perf-init.sh [--timeout 10] [--headed] [--project firefox]

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
E2E_DIR="$ROOT_DIR/e2e"
PROJECT="firefox"
TIMEOUT=0
HEADED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout)
      TIMEOUT=${2:-0}; shift 2 ;;
    --headed)
      HEADED=1; shift ;;
    --project)
      PROJECT=${2:-firefox}; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$ROOT_DIR"
cargo build --release -q

cd "$E2E_DIR"
export LRV_BIN="$ROOT_DIR/target/release/lrv"
export DEBUG=pw:api

ARGS=(test tests/perf.spec.ts -g "app init" --reporter=line --workers=1 --project="$PROJECT")
if [[ $HEADED -eq 1 ]]; then
  ARGS+=(--headed)
fi

rm -f test-results/*.log test-results/perf-init.json || true

if [[ $TIMEOUT -gt 0 ]]; then
  timeout --signal=SIGINT --kill-after=1s ${TIMEOUT}s npx playwright "${ARGS[@]}"
  rc=$?
else
  npx playwright "${ARGS[@]}"; rc=$?
fi

echo "--- test-results ---"
ls -la test-results || true
echo "--- server logs ---" && rg -n "^Server running|^Available at|^\[server\]|http://" -S test-results || true
echo "--- page logs ---" && rg -n "^\[request\]|^\[response\]|^\[pageconsole\]|^\[pageerror\]" -S test-results || true

exit $rc

