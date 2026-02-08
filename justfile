# lrv development workflows

# Show available commands
default:
    @just --list

# Build the project
build:
    cargo build

# Build in release mode
build-release:
    cargo build --release

# Install to system
install:
    cargo install --path .

# Run all tests (unit + e2e)
test: test-unit test-e2e

# Run Rust unit tests
test-unit:
    cargo test

# Run e2e correctness tests (exclude perf)
test-e2e:
    just build
    cd e2e && npx playwright test --reporter=line --grep-invert "Perf Bench"

# Run e2e tests in headed mode (visible browser)
test-e2e-headed:
    cd e2e && npm run test:headed

# Run e2e tests with UI (interactive)
test-e2e-ui:
    cd e2e && npm run test:ui

# Run perf bench across commits
bench +args="":
    bash scripts/bench.sh {{args}}

# Run only the perf tests (serial)
test-e2e-perf:
    cd e2e && npx playwright test tests/perf.spec.ts --reporter=line --workers=1

# Perf helpers (wrap scripts)
perf-init +args="":
    bash scripts/e2e-perf-init.sh {{args}}

perf-loop +args="":
    bash scripts/e2e-perf-loop.sh {{args}}

perf-batch +args="":
    bash scripts/e2e-perf-batch.sh {{args}}

# Theme test only
test-theme:
    cd e2e && LRV_BIN="$(pwd)/../target/release/lrv" npx playwright test tests/theme.spec.ts --reporter=line --workers=1

# Serve current diff locally (loopback + tailscale if available)
serve-current title="Current Diff":
    just build-release
    bash scripts/serve-current.sh "{{title}}"

# Single command: build release, export diff, run perf, save/commit artifacts
bench-release diff="0e4ff74" commit_artifacts="false" code_commits="HEAD":
    BENCH_DIFF_COMMIT={{diff}} BENCH_COMMIT={{commit_artifacts}} bash scripts/bench.sh {{code_commits}}

 

# Setup e2e test environment
setup-e2e:
    cd e2e && npm install && npx playwright install firefox

# Build web assets (if web/ directory exists with sources)
build-web:
    @echo "Web assets are in web/dist/ - modify index.html directly, then rebuild"
    @echo "Run 'just build' after editing web/dist/index.html to embed changes"

# Vendor Monaco editor assets into web/assets/vendor/monaco
# Usage: just vendor-monaco [version]
vendor-monaco version="0.45.0":
    bash scripts/vendor-monaco.sh {{version}}

# Convenience: vendor all assets we can automate (currently Monaco)
vendor-assets:
    just vendor-monaco

# Vendor fonts into web/assets/fonts. Provide URLs or local paths via env vars or args.
# Usage: just vendor-fonts inter_url=... geist_url=... jetbrains_url=...
vendor-fonts inter_url="" geist_url="" jetbrains_url="":
    bash scripts/vendor-fonts.sh {{inter_url}} {{geist_url}} {{jetbrains_url}}

# Verify offline readiness: ensure vendored assets exist and are served locally
check-offline:
    bash scripts/check-offline.sh

# Run lrv on current git changes
review:
    git diff | cargo run -- --no-open

# Run lrv on staged changes
review-staged:
    git diff --staged | cargo run -- --no-open

# Run lrv with a specific port
review-port port:
    git diff | cargo run -- --port {{port}} --no-open

# Run lrv from a file
review-file file:
    cargo run -- --file {{file}} --no-open

# Clean build artifacts
clean:
    cargo clean
    rm -rf e2e/test-results e2e/playwright-report

# Format code
fmt:
    cargo fmt

# Format web and e2e sources with Prettier (requires Node + Prettier)
fmt-web:
    npx --yes prettier --config .prettierrc.json --ignore-path .prettierignore --ignore-unknown --write "web/**/*.{html,js,ts,css}" "e2e/**/*.{ts,js,json}" "scripts/**/*.sh"

# Format everything (Rust + web). Uses local Prettier if available.
fmt-all:
    cargo fmt
    if [ -x node_modules/.bin/prettier ]; then \
      node_modules/.bin/prettier --config .prettierrc.json --ignore-path .prettierignore --ignore-unknown --write "web/**/*.{html,js,ts,css}" "e2e/**/*.{ts,js,json}" "scripts/**/*.sh"; \
    else \
      echo "[fmt-all] Prettier not found in node_modules. Install with: npm i -D prettier"; \
    fi

# Lint web and e2e sources with ESLint (enforces curly braces)
lint-web:
    npx --yes eslint --ext .ts,.js,.html web e2e

lint-web-fix:
    npx --yes eslint --fix --ext .ts,.js,.html web e2e

# Check code without building
check:
    cargo check

# Run clippy lints
lint:
    cargo clippy

# Full CI workflow (format, lint, build, test)
ci: fmt lint build test

# Quick development cycle (build + unit tests)
dev: build test-unit

# Serve current diff in public mode (0.0.0.0) + tailscale
serve-public title="Current Diff (public)":
    just build-release
    bash scripts/serve-public.sh "{{title}}"
