# lrv workflows

default:
    @just --list

build:
    cargo build

build-release:
    cargo build --release

install:
    cargo install --path .

test: test-unit test-e2e

test-unit:
    cargo test

test-e2e:
    just build
    cd e2e && npx playwright test --reporter=line --grep-invert "Perf Bench"

test-e2e-headed:
    cd e2e && npm run test:headed

test-e2e-ui:
    cd e2e && npm run test:ui

test-e2e-perf:
    cd e2e && LRV_BIN="$(pwd)/../target/release/lrv" npx playwright test tests/perf.spec.ts --reporter=line --workers=1

test-theme:
    cd e2e && LRV_BIN="$(pwd)/../target/release/lrv" npx playwright test tests/theme.spec.ts --reporter=line --workers=1

setup-e2e:
    cd e2e && npm install && npx playwright install firefox

fmt:
    cargo fmt

fmt-web:
    npx --yes prettier --config .prettierrc.json --ignore-path .prettierignore --ignore-unknown --write "web/**/*.{html,js,ts,css}" "e2e/**/*.{ts,js,json}" "scripts/**/*.sh"

fmt-all: fmt fmt-web

lint:
    cargo clippy

lint-web:
    npx --yes eslint web e2e

lint-web-fix:
    npx --yes eslint --fix web e2e

check:
    cargo check

ci: fmt lint build test

dev: build test-unit

review:
    git diff | cargo run --bin lrv -- --no-open

review-staged:
    git diff --staged | cargo run --bin lrv -- --no-open

review-port port:
    git diff | cargo run --bin lrv -- --port {{port}} --no-open

review-file file:
    cargo run --bin lrv -- --file {{file}} --no-open

serve-current title="Current Diff":
    just build-release
    bash scripts/serve-current.sh "{{title}}"

serve-public title="Current Diff (public)":
    just build-release
    bash scripts/serve-public.sh "{{title}}"

bench +args="":
    bash scripts/bench.sh {{args}}

perf-init +args="":
    bash scripts/e2e-perf-init.sh {{args}}

perf-loop +args="":
    bash scripts/e2e-perf-loop.sh {{args}}

perf-batch +args="":
    bash scripts/e2e-perf-batch.sh {{args}}

vendor-monaco version="0.45.0":
    bash scripts/vendor-monaco.sh {{version}}

vendor-fonts inter_url="" geist_url="" jetbrains_url="":
    bash scripts/vendor-fonts.sh {{inter_url}} {{geist_url}} {{jetbrains_url}}

check-offline:
    bash scripts/check-offline.sh

clean:
    cargo clean
    rm -rf e2e/test-results e2e/playwright-report
