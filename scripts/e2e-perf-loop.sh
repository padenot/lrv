#!/usr/bin/env bash
set -euo pipefail

# Tight loop runner for the perf init test with per-iteration timeout and cleanup.
# Usage: scripts/e2e-perf-loop.sh [--runs 20] [--timeout 10] [--headed]

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
RUNS=20
TIMEOUT=10
HEADED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runs) RUNS=${2:-20}; shift 2 ;;
    --timeout) TIMEOUT=${2:-10}; shift 2 ;;
    --headed) HEADED=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

for i in $(seq 1 "$RUNS"); do
  echo "[loop] Run $i/${RUNS} (timeout=${TIMEOUT}s)"
  if scripts/e2e-perf-init.sh --timeout "$TIMEOUT" $( [[ $HEADED -eq 1 ]] && echo --headed ); then
    echo "[loop] PASS on run $i"
    exit 0
  else
    rc=$?
    if [[ $rc -eq 124 ]]; then
      echo "[loop] Timed out; cleaning stray lrv"
    else
      echo "[loop] Failed with code $rc; cleaning stray lrv"
    fi
    pkill -f "/target/release/lrv" || true
  fi
done

echo "[loop] Completed $RUNS runs without a pass"
exit 1

