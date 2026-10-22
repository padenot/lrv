# CLAUDE.md

## Project

`lrv` — Rust CLI for human-in-the-loop code review of unified diffs. Axum server + Monaco browser UI. Input: stdin/`--cmd`/`--file`. Output: comments to stdout (json/text). VCS-agnostic.

## Build & Install

```bash
just build       # frontend + debug binary
just install     # release binary → ~/.cargo/bin
cargo install --path .  # also works; build.rs rebuilds frontend automatically
```

## Test & Lint

```bash
just test-unit / just test-e2e / just test
just fmt && just fmt-web && just lint
just setup-e2e   # first time only
```

## Architecture

Backend: `main.rs` (CLI), `server.rs` (routes), `diff.rs` (parsing), `types.rs`, `output.rs`, `config.rs`, `github.rs`, `phab_mcp.rs`, `phabricator.rs`, `store.rs` (SQLite comment persistence).

Frontend (`web/src/`): `monaco-app.ts` (entry), `file-loading-methods.ts`, `stacked-view-methods.ts`, `comments-ui-methods.ts`, `commit-methods.ts`, `series-methods.ts`, `comment-draft-storage.ts`, `themes.ts`.

Assets embedded at compile time via `rust_embed`. `build.rs` hashes assets → writes to `OUT_DIR` → forces recompile when CSS/JS changes.

## Dual Implementations — Keep in Sync

Comment form has two independent implementations:
- `comments-ui-methods.ts` — Monaco diff view
- `stacked-view-methods.ts` — stacked table view

Discuss (button + Mod+Alt+Enter, shown via `body.agent-attached`) and Convert mode (`discussion` argument: Summarize, delete-on-save) belong in both forms; discussions render from `discussionManager`, never `commentManager`.
Any comment UX change (shortcuts, edit, delete, validation) must go in both.

## Key Behaviours

- **Live review notes**: `/api/events` sends a `notes` SSE event on connection and after notes are added. The page refetches and merges new notes while preserving dispositions; it delays merging while a Reply form is open, checking every 500 ms. `/api/events` also sends an `agent` `{attached, busy, launch, initial_review, error?}` event on connect and whenever presence changes (including lease expiry), and the header shows the agent's listening or busy status while attached.
- **Connect Agent**: the header button launches Claude or Codex via `POST /api/agent/launch` with optional model, effort and initial review. Choices persist in localStorage. Launches refuse public mode (403), untrusted Host headers (403), and attached/running agents (409); `/api/context` advertises `launch_available`. Private temporary per-commit raw diff files and an agent log support the self-contained prompt. The badge always reads "Connected"; only its dot changes: green while polling, pulsing amber while starting, during the initial review, and after events are delivered (until the next poll). SSE launch states are `idle`, `running`, and `failed`; launch failures appear in the popover. Attached agents handle discussions and never receive the final review. Shutdown closes polls, allows a short child exit grace period, kills a remaining child, and removes temporary files.
- **Agent events**: events are queued in memory and served by the token-authenticated long poll `GET /api/agent/events?after=&timeout=`, where `timeout` is in seconds (default 60, clamped to 1–600). The agent counts as attached while a poll is open, or within `LRV_AGENT_LEASE_SECS` (default 300) of its last poll or authenticated note write. On shutdown the channel closes and pending polls return `ended: true`.
- **Discussions**: `POST /api/discussions` queues a discussion for the listening agent and returns it with a `lrv-discussion-<seq>` id. It refuses with 409 when no agent is attached and with 403 in public mode (`--public`/`0.0.0.0`, not `--tailscale`). `DELETE /api/discussions/{id}` removes the thread and its agent replies and queues `discussion_deleted`; late replies are skipped. Deletion works without an attached agent, returns 403 in public mode, and returns 404 for unknown or follow-up ids. Convert opens the ordinary comment form at the thread's location with a Summarize button instead of Discuss. Summarize sends a hidden follow-up with `summarize: true` (valid only with `thread_id`), and the next agent reply with `summary: true` fills the textarea without appearing in the thread. Save deletes the thread first, then adds the comment; Cancel leaves the thread unchanged. Discussions live only in the agent channel (in memory, listed by `GET /api/discussions`) and never enter comments, drafts, Finish or Publish; Finish warns before discarding open threads.
- **Agent discovery**: advertise the repository root, PID, URL and bearer token in `LRV_SERVER_DIR` (otherwise the runtime/cache directory under `lrv/servers`), keyed by an FNV64 root hash. Files are mode 0600 on Unix and removed on shutdown (including Ctrl-C and SIGTERM, which exit 130 and 143) only if still owned by this process. Posting review notes requires the token.
- **Port**: derived from CWD hash (32768–40959); falls back to ephemeral if taken.
- **Comment drafts**: IndexedDB, keyed by `working_directory + git_branch + jj_change_id` (stable across amends). On reload, a banner prompts to restore rather than auto-restoring.
- **Comment persistence**: every draft change is also mirrored to `store.rs` (SQLite, one session row per `lrv` run, created lazily on the first comment) via `POST /api/comments/sync`. Finishing freezes the session, so the UI clearing its drafts afterwards can't erase the record. Read back with `--list-reviews` / `--recover`.
- **jj**: `diff.rs` parses `Change ID:` from `jj show --git` for stable draft keys.
- **Added-file dimming**: `file-added-view` / `stacked-file-added` classes scope green reduction to entirely new files only (not individual added lines). Uses `color-mix()` so it works with any theme.
- **GitHub PRs**: detection asks `gh` for the open PRs of *every* commit; a commit in several PRs belongs to the lowest number. Each PR's comments are attributed within its own commit range (PR-level notes go on its last commit). `/api/series` returns `prs` and per-commit `pr`; the commit strip groups commits under a `PR #N title` header (`prHeader`; the number links to the PR) per contiguous run, with commits without a PR under "No PR" headers, preserving order. All commits stay visible.
- **Phabricator publishing**: Finish always prints the review to stdout and ends lrv (`Mod+Shift+Enter` opens its confirmation). When `phabricator_available`, the header's per-commit Publish button follows the current commit, shows its revision id, and disables after publication or with a tooltip explaining why the revision is unpublishable. The commit strip displays revision badges with ✓ after publication. Targets resolve locally at startup; the frontend prefetches `/api/phabricator` to validate the token (`user.whoami`) and each revision's latest diff (`check_diff_matches`). When comments are fetched and the checkout doesn't match the latest diff of someone else's revision, `--phab-revision` (named or bare) aborts startup, while `auto_fetch_comments` warns and skips that revision's comments; network/auth failures only warn. The single-revision dialog preserves a verdict and overall comment per revision, blocks mismatched diffs, revisions spanning several commits, and other servers, and disables verdicts on your own revisions. Each revision publishes independently (`build_revision_publish`, `differential.createinline`, then `differential.createcomment` with `attach_inlines`) and locks after success; retry resumes without duplicating drafts. Successful publication closes the dialog and refreshes the header and strip. Publishing keeps lrv open; Finish excludes published comments and includes published URLs. Notes always offer Address/Reply/Ignore, which queue a comment whose `in_reply_to` holds a copy of the note (Address leaves the body empty; Undo removes the comment). Publishing sends only the reply's own body and skips empty-bodied comments; the dialog notes how many stay in the review for Finish. Phabricator quirks: `isNewFile` must be `1`/`0`, and `lineLength` is the number of lines *after* the first.
- **Series**: commit strip shows per-commit comment counts; mixed-author series shows author names.
- **jj series content**: fetch touched files at the parent of the bottom commit, then apply each commit's hunks forward; a selected revset need not end at `@`.
- **Commit-message review**: switching commits preserves the commit-message view; comments there are per-commit, while overall feedback is entered in the Finish dialog.
- **Collapsed sidebar**: hide all sidebar content but keep the collapse button visible as the explicit reopen control.

## CLI Flags

```
--series <revset|range>            review a commit series
--review-notes-file <path>         load review notes JSON
--validate-review-notes <path>     validate and exit
--add-notes <path|->              add notes to the running review for this repository
--listen [--listen-timeout <secs>]    wait for discussion comments from this repo's running review; prints {"status": events|timeout|ended}
--github-pr-comments <path>        pipe output of: gh api repos/OWNER/REPO/pulls/N/comments
--github-pr [<N|O/R#N|url>]        fetch a PR's comments with gh; no value = detect PRs of every commit
--phab-mcp-comments <path>         pipe output of: mcp__moz__get_phabricator_revision
--phab-revision [<D123>]           fetch via Conduit API (needs PHABRICATOR_API_KEY or ~/.arcrc); no value = detect from trailer
--list-reviews                     list stored review sessions
--recover [<id>]                   print a stored session's comments
--bind, --public, --tailscale, --port, --no-open, --format, --title, --dev-log
```

## Review Notes Schema

Required: `file`, `line` (int or `[start, end]`), `side` (`"new"`/`"old"`), `body`.
Optional: `id`, `author`, `date`, `source_url`, `commit_idx`, `read_only` (note is shown without Address/Reply/Ignore), `discussion_id`, `summary` (boolean, valid only with `discussion_id`; hidden summary for Convert). A note with `discussion_id` is an agent reply accepted only by a running review (`--add-notes` / POST /api/review-notes): it must name a root discussion, is moved to its location, becomes read-only, gets a server-stamped `date` and (if no `id`) a unique id, and renders inside the thread.
Notes without `id` get one derived from their content (`assign_note_ids`), so ids alone decide which notes are the same, on the server and in the browser.
Commit-message-level: `file: "(commit)"`, `line: 1`, `side: "new"`.
Pull-request-level comments (`--github-pr` fills them from the PR conversation and review summaries) are read-only `file: "(commit)"` notes like Phabricator's general comments (`ReviewNote::overall`), placed on the last commit of a series. Notes without `commit_idx` in a one-commit series are pinned to commit 0 (`tag_single_commit_notes`).
