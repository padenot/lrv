Perf E2E — Quick Guide

What we measure
- App init time: time until first diff is rendered and the user can interact (window.__APP_READY true). Collected via performance.measure('appInit').

How tests work
- Build release binary, create a temp git repo with a known diff, start the real server on port 0.
- Parse the URL from server output, drive a real browser (Playwright, Firefox), and wait for __APP_READY.
- Persist metrics to e2e/test-results/perf-init.json; also dump server/page logs for debugging.

Scripts
- scripts/e2e-perf-init.sh: one run with logs. Flags: --timeout <sec>, --headed, --project <name>.
- scripts/e2e-perf-loop.sh: loop runs with cleanup. Flags: --runs N, --timeout S, --headed.
- scripts/e2e-perf-batch.sh: run N times and aggregate stats. Flags: --runs N, --project, --headed.

Outputs
- e2e/test-results/server-*.log: server stdout/stderr lines.
- e2e/test-results/page-*.log: page console/network/errors.
- e2e/test-results/perf-init.json: { appInit: [ms, ...] } per test invocation.
- e2e/test-results/perf-batch.json: aggregated stats across runs.

Notes
- Binary path is injected via LRV_BIN; CSP allows Monaco workers; the page logs init milestones and network timings.
