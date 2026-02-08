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
    echo '{"appInit":[]}' > "$RUN_JSON_DIR/perf-init-run-${i}.json"
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
const runArrays = runs.map(f=>{
  try { const j = JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')); return Array.isArray(j.appInit)? j.appInit : []; } catch { return []; }
});
const a = runArrays.flat();
const avg = a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const sorted = [...a].sort((x,y)=>x-y);
const p = q => a.length ? sorted[Math.max(0, Math.min(sorted.length-1, Math.floor(sorted.length*q)-1))] : 0;
const out = {
  runs: runArrays,
  count: a.length,
  mean: avg,
  p50: p(0.50), p90: p(0.90), p95: p(0.95), p99: p(0.99),
  min: a.length ? sorted[0] : 0,
  max: a.length ? sorted[sorted.length-1] : 0
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('[batch] Wrote', outPath);
console.log(`[batch] n=${out.count} mean=${out.mean.toFixed(2)} p50=${out.p50.toFixed(2)} p90=${out.p90.toFixed(2)} p95=${out.p95.toFixed(2)} p99=${out.p99.toFixed(2)} min=${out.min.toFixed(2)} max=${out.max.toFixed(2)}`);
NODE
