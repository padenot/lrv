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
# Require no tracked modifications; allow untracked (results/exports)
if ! git diff-index --quiet HEAD --; then
  echo "Working tree has tracked modifications. Please commit or stash changes before running the bench." >&2
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
  # Optionally export a diff from a large commit to feed as input
  if [ -n "${BENCH_DIFF_COMMIT:-}" ]; then
    DIFF_DIR="$RESULTS_DIR/diffs"
    mkdir -p "$DIFF_DIR"
    DIFF_FILE="$DIFF_DIR/${BENCH_DIFF_COMMIT}.patch"
    git show --format=format: -p "$BENCH_DIFF_COMMIT" > "$DIFF_FILE"
    export LRV_BENCH_DIFF="$DIFF_FILE"
    echo "[bench] Using diff from $BENCH_DIFF_COMMIT -> $DIFF_FILE"
  fi
  rm -f "$ROOT_DIR/e2e/test-results/perf-init.json" "$ROOT_DIR/e2e/test-results/perf-switch.json"
  # App init perf (single run)
  (cd e2e && npx playwright test -g "app init performance" --reporter=line --workers=1)
  # File switch perf
  (cd e2e && npx playwright test -g "rapid file switching" --reporter=line --workers=1)
  # Merge results
node - "$ROOT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const initPath = path.join(root, 'e2e/test-results/perf-init.json');
const switchPath = path.join(root, 'e2e/test-results/perf-switch.json');
const out = { appInit: [], fileSwitch: [] };
try { Object.assign(out, { appInit: JSON.parse(fs.readFileSync(initPath)).appInit || [] }); } catch {}
try { Object.assign(out, { fileSwitch: JSON.parse(fs.readFileSync(switchPath)).fileSwitch || [] }); } catch {}
fs.writeFileSync(path.join(root, 'e2e/test-results/perf.json'), JSON.stringify(out, null, 2));
console.log('[bench] merged to e2e/test-results/perf.json');
NODE
  if [ -f "$ROOT_DIR/e2e/test-results/perf.json" ]; then
    cp "$ROOT_DIR/e2e/test-results/perf.json" "$RESULTS_DIR/${c//\//_}.json"
    echo "Saved: $RESULTS_DIR/${c//\//_}.json"
  else
    echo "Warning: no perf.json produced for $c" >&2
  fi
done

git checkout -q "$CURRENT_REF"

echo "\nBench results saved under $RESULTS_DIR"
