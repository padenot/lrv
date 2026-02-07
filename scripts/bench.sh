#!/usr/bin/env bash
set -euo pipefail

# Simple benchmark runner: builds and runs the perf e2e test across commits.
# Usage: scripts/bench.sh [commit1 commit2 ...]

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

COMMITS=("$@")
if [ ${#COMMITS[@]} -eq 0 ]; then
  COMMITS=(HEAD HEAD~5 HEAD~10)
fi

# Verify commits exist
for c in "${COMMITS[@]}"; do
  if ! git rev-parse --verify -q "$c" >/dev/null; then
    echo "Commit not found: $c" >&2
    exit 1
  fi
done

# Require clean working tree to avoid conflicts
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Please commit or stash changes before running the bench." >&2
  exit 1
fi

CURRENT_REF=$(git rev-parse --abbrev-ref HEAD || git rev-parse HEAD)
RESULTS_DIR="$ROOT_DIR/bench-results"
mkdir -p "$RESULTS_DIR"

echo "Running perf bench for commits: ${COMMITS[*]}"

for c in "${COMMITS[@]}"; do
  echo "--- Bench at $c ---"
  git checkout -q "$c"
  just build
  rm -f "$ROOT_DIR/e2e/test-results/perf.json"
  (cd e2e && npx playwright test -g "rapid file switching" --reporter=line --workers=1)
  if [ -f "$ROOT_DIR/e2e/test-results/perf.json" ]; then
    cp "$ROOT_DIR/e2e/test-results/perf.json" "$RESULTS_DIR/${c//\//_}.json"
    echo "Saved: $RESULTS_DIR/${c//\//_}.json"
  else
    echo "Warning: no perf.json produced for $c" >&2
  fi
done

git checkout -q "$CURRENT_REF"

echo "\nBench results saved under $RESULTS_DIR"
