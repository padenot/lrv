# Web TypeScript Migration TODO

## Goal
Port `web/assets/app/*.js` to TypeScript source with a fast bundle step that outputs assets embedded by Rust.

## Step-by-step plan
- [x] Add TypeScript + rolldown dependencies
- [x] Add `tsconfig.web.json`
- [x] Add `rolldown.config.mjs`
- [x] Create `web/src/` TypeScript source tree
- [x] Add global typing shims (`window`, AMD loader, Monaco reference)
- [x] Port all app modules from JS to TS with behavior parity
- [x] Wire build commands (`npm run build:web`, `npm run typecheck:web`)
- [x] Wire Rust build workflow to run web build before `cargo build`
- [x] Verify `npm run build:web`, `npm run typecheck:web`, `just build`
- [x] Remove or archive legacy JS source modules (kept only generated `web/assets/app/main.js`)
- [x] Remove `@ts-nocheck` incrementally (current: 0 files remaining)

## Port order
1. Foundation: `dom`, `api`, `perf`, `platform`, `font`, `shortcuts`, `diff-utils`, `themes`
2. Data/UI: `comments`, `modal`, `language`, `ui-signals`
3. Methods: `file-data`, `file-list`, `comments-ui`, `navigation`, `commit`, `dialog`, `file-loading`
4. Orchestrator: `monaco-app`, `main`
