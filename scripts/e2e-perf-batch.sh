#!/usr/bin/env bash
set -euo pipefail

# Run the perf init test multiple times and aggregate stats.
# Usage: scripts/e2e-perf-batch.sh [--runs 10] [--project firefox] [--headed]

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
E2E_DIR="$ROOT_DIR/e2e"
RUNS=10
PROJECT="firefox"
HEADED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runs) RUNS=${2:-10}; shift 2 ;;
    --project) PROJECT=${2:-firefox}; shift 2 ;;
    --headed) HEADED=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$ROOT_DIR"
cargo build --release -q

cd "$E2E_DIR"
export LRV_BIN="$ROOT_DIR/target/release/lrv"
export DEBUG= # quiet by default for batch

OUT_JSON="$E2E_DIR/test-results/perf-batch.json"
# Keep per-run JSONs outside of Playwright's test-results to avoid cleanup
RUN_JSON_DIR="$E2E_DIR/perf-batch-runs"
mkdir -p "$E2E_DIR/test-results" "$RUN_JSON_DIR"

ARGS=(test tests/perf.spec.ts -g "app init" --reporter=line --workers=1 --project="$PROJECT")
if [[ $HEADED -eq 1 ]]; then ARGS+=(--headed); fi

for i in $(seq 1 "$RUNS"); do
  echo "[batch] Run $i/$RUNS"
  rm -f "$E2E_DIR/test-results/perf-init.json"
  npx playwright "${ARGS[@]}"
  # Persist per-run metrics for aggregation
  mkdir -p "$RUN_JSON_DIR"
  if [[ -f "$E2E_DIR/test-results/perf-init.json" ]]; then
    cp "$E2E_DIR/test-results/perf-init.json" "$RUN_JSON_DIR/perf-init-run-${i}.json"
  else
    echo '{"appInit":[],"navToDiffVisible":[]}' > "$RUN_JSON_DIR/perf-init-run-${i}.json"
  fi
done

node - "$RUN_JSON_DIR" "$OUT_JSON" <<'NODE'
const fs = require('fs');
const path = require('path');
const [dir, outPath] = process.argv.slice(2);
const runs = fs.readdirSync(dir).filter(f=>/^perf-init-run-\d+\.json$/.test(f)).sort((a,b)=>{
  const na=+a.match(/(\d+)/)[1], nb=+b.match(/(\d+)/)[1];
  return na-nb;
});
const runData = runs.map(f=>{
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
    return {
      appInit: Array.isArray(j.appInit) ? j.appInit : [],
      navToDiffVisible: Array.isArray(j.navToDiffVisible) ? j.navToDiffVisible : [],
    };
  } catch {
    return { appInit: [], navToDiffVisible: [] };
  }
});
const stats = (arr) => {
  if (!arr.length) return { n: 0, mean: null, p50: null, p90: null, p95: null, p99: null, min: null, max: null };
  const sorted = [...arr].sort((x,y)=>x-y);
  const mean = arr.reduce((x,y)=>x+y,0)/arr.length;
  const p = q => {
    const i = (arr.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    const t = i - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };
  return {
    n: arr.length,
    mean,
    p50: p(0.50),
    p90: p(0.90),
    p95: p(0.95),
    p99: p(0.99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};
const appInitRuns = runData.map(r => r.appInit);
const navRuns = runData.map(r => r.navToDiffVisible);
const appInitAll = appInitRuns.flat();
const navAll = navRuns.flat();
const navCold = navRuns.map(a => a[0]).filter(v => Number.isFinite(v));
const navWarm = navRuns.flatMap(a => a.slice(1));
const out = {
  primaryMetric: 'navToDiffVisible.cold',
  runs: {
    appInit: appInitRuns,
    navToDiffVisible: navRuns,
  },
  navToDiffVisible: {
    cold: stats(navCold),
    warm: stats(navWarm),
    overall: stats(navAll),
  },
  appInit: {
    overall: stats(appInitAll),
  }
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('[batch] Wrote', outPath);
const c = out.navToDiffVisible.cold;
const w = out.navToDiffVisible.warm;
console.log(
  `[batch] primary cold navToDiffVisible n=${c.n} mean=${c.mean?.toFixed(2)} p95=${c.p95?.toFixed(2)} min=${c.min?.toFixed(2)} max=${c.max?.toFixed(2)}`
);
console.log(
  `[batch] warm navToDiffVisible n=${w.n} mean=${w.mean?.toFixed(2)} p95=${w.p95?.toFixed(2)}`
);
NODE
