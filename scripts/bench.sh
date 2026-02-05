#!/usr/bin/env bash
set -euo pipefail

# Simple benchmark runner: builds and runs the perf e2e test across commits.
# Usage: scripts/bench.sh [commit1 commit2 ...]

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

CODE_COMMITS=("$@")
if [ ${#CODE_COMMITS[@]} -eq 0 ]; then
  CODE_COMMITS=(HEAD)
fi

DIFF_COMMIT=${BENCH_DIFF_COMMIT:-}
if [ -z "$DIFF_COMMIT" ]; then
  DIFF_COMMIT=0e4ff74
fi

# Verify commits exist
for c in "${CODE_COMMITS[@]}"; do
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

echo "Running perf bench for code commits: ${CODE_COMMITS[*]} using diff $DIFF_COMMIT"

for c in "${CODE_COMMITS[@]}"; do
  echo "--- Bench at $c ---"
  git checkout -q "$c"
  cargo build --release
  export LRV_BIN="$ROOT_DIR/target/release/lrv"
  # Export diff from target commit
  DIFF_DIR="$RESULTS_DIR/diffs"
  mkdir -p "$DIFF_DIR"
  DIFF_FILE="$DIFF_DIR/${DIFF_COMMIT}.patch"
  git show --format=format: -p "$DIFF_COMMIT" > "$DIFF_FILE"
  export LRV_BENCH_DIFF="$DIFF_FILE"
  echo "[bench] Using diff from $DIFF_COMMIT -> $DIFF_FILE"
  rm -f "$ROOT_DIR/e2e/test-results/perf-init.json" "$ROOT_DIR/e2e/test-results/perf-switch.json"
  # Run perf specs serially
  (cd e2e && npx playwright test tests/perf.spec.ts --reporter=line --workers=1)
  # Merge results
node - "$ROOT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const initPath = path.join(root, 'e2e/test-results/perf-init.json');
const switchPath = path.join(root, 'e2e/test-results/perf-switch.json');
const out = { appInit: [], navToDiffVisible: [], coldNavToDiffVisible: null, fileSwitch: [] };
try {
  const init = JSON.parse(fs.readFileSync(initPath));
  Object.assign(out, {
    appInit: init.appInit || [],
    navToDiffVisible: init.navToDiffVisible || [],
    coldNavToDiffVisible:
      typeof init.coldNavToDiffVisible === 'number'
        ? init.coldNavToDiffVisible
        : Array.isArray(init.navToDiffVisible) && typeof init.navToDiffVisible[0] === 'number'
          ? init.navToDiffVisible[0]
          : null,
  });
} catch {}
try { Object.assign(out, { fileSwitch: JSON.parse(fs.readFileSync(switchPath)).fileSwitch || [] }); } catch {}
fs.writeFileSync(path.join(root, 'e2e/test-results/perf.json'), JSON.stringify(out, null, 2));
console.log('[bench] merged to e2e/test-results/perf.json');
NODE
  if [ -f "$ROOT_DIR/e2e/test-results/perf.json" ]; then
    CODE_SHORT=$(git rev-parse --short "$c")
    OUT_JSON="$RESULTS_DIR/${CODE_SHORT}-diff-${DIFF_COMMIT}.json"
    cp "$ROOT_DIR/e2e/test-results/perf.json" "$OUT_JSON"
    echo "Saved: $OUT_JSON"
    if [ "${BENCH_COMMIT:-}" = "1" ]; then
      node - <<NODE
const fs=require('fs');
const p='$OUT_JSON';
const data=JSON.parse(fs.readFileSync(p));
const avg=(a)=>a.length? (a.reduce((x,y)=>x+y,0)/a.length):0;
const p95=(a)=>{ if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length*0.95)-1]||s[s.length-1]};
const cold = typeof data.coldNavToDiffVisible === 'number' ? data.coldNavToDiffVisible : 0;
const nav=avg(data.navToDiffVisible||[]), nav95=p95(data.navToDiffVisible||[]);
const a=avg(data.appInit||[]), a95=p95(data.appInit||[]);
const f=avg(data.fileSwitch||[]), f95=p95(data.fileSwitch||[]);
console.log(`[bench] cold nav=${cold.toFixed(2)} | nav avg=${nav.toFixed(2)} p95=${nav95.toFixed(2)} | appInit avg=${a.toFixed(2)} p95=${a95.toFixed(2)} | switch avg=${f.toFixed(2)} p95=${f95.toFixed(2)}`);
NODE
      git add "$OUT_JSON"
      git commit -m "bench: init/switch metrics (code $CODE_SHORT vs diff $DIFF_COMMIT)

artifact: $(basename "$OUT_JSON")"
    fi
  else
    echo "Warning: no perf.json produced for $c" >&2
  fi
done

git checkout -q "$CURRENT_REF"

echo "\nBench results saved under $RESULTS_DIR"
