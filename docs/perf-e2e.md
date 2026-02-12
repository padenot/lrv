Perf E2E — Quick Guide

What we measure
- Navigation to visible diff (`navToDiffVisible`): wall-clock time from right before navigation to the first visible Monaco diff line.
- App init time (`appInit`): internal app timing collected via performance.measure('appInit').

How tests work
- Build release binary, create a temp git repo with a known diff, start the real server on port 0.
- Parse the URL from server output, drive a real browser (Playwright, Firefox), and wait for first visible diff lines.
- Persist metrics to e2e/test-results/perf-init.json; also dump server/page logs for debugging.

Scripts
- scripts/e2e-perf-init.sh: one run with logs. Flags: --timeout <sec>, --headed, --project <name>.
- scripts/e2e-perf-loop.sh: loop runs with cleanup. Flags: --runs N, --timeout S, --headed.
- scripts/e2e-perf-batch.sh: run N times and aggregate stats. Flags: --runs N, --project, --headed.

Outputs
- e2e/test-results/server-*.log: server stdout/stderr lines.
- e2e/test-results/page-*.log: page console/network/errors.
- e2e/test-results/perf-init.json:
  - `navToDiffVisible`: raw per-iteration wall-clock times
  - `coldNavToDiffVisible`: first iteration (cold-start) time
  - `summary`: cold/warm/overall stats (primary metric is cold `navToDiffVisible`)
  - `appInit`: raw internal app init times
- e2e/test-results/perf-batch.json: aggregated stats across runs, primary metric `navToDiffVisible.cold`.

Notes
- Binary path is injected via LRV_BIN; CSP allows Monaco workers; the page logs init milestones and network timings.
