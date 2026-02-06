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

# Run e2e tests with Playwright
test-e2e:
    cd e2e && npm test

# Run e2e tests in headed mode (visible browser)
test-e2e-headed:
    cd e2e && npm run test:headed

# Run e2e tests with UI (interactive)
test-e2e-ui:
    cd e2e && npm run test:ui

# Setup e2e test environment
setup-e2e:
    cd e2e && npm install && npx playwright install firefox

# Build web assets (if web/ directory exists with sources)
build-web:
    @echo "Web assets are in web/dist/ - modify index.html directly, then rebuild"
    @echo "Run 'just build' after editing web/dist/index.html to embed changes"

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
