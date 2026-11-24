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

- **Live updates**: `/api/events` (SSE) sends `notes` when notes are added and `agent` `{attached, busy, launch, error?}` when agent presence changes. The page merges new notes, keeping dispositions, and waits while a Reply form is open.
- **Agent channel**: the agent long-polls `GET /api/agent/events` with the bearer token. It counts as attached while a poll is open or within `LRV_AGENT_LEASE_SECS` (default 300) of its last poll or note write. Events are queued in memory; on shutdown pending polls return `ended: true`. Attached agents handle discussions and review requests, never the final review. Agent endpoints return 403 in public mode (`--public`/`0.0.0.0`, not `--tailscale`) and 409 without an attached agent.
- **Connect Agent**: `POST /api/agent/launch` starts Claude or Codex with a self-contained prompt, private per-commit diff files and a log. Its output is teed to the log and to stderr with an `[agent] ` prefix; Claude's `stream-json` events are condensed by `summarize_event`. Shutdown kills a child that doesn't exit within a short grace period and removes the temporary files.
- **Request Review**: `POST /api/agent/review` `{commit_idx}` queues a `review_request` for one commit, only while an agent is attached.
- **Discussions**: `POST /api/discussions` queues a thread for the agent, which replies with notes carrying `discussion_id`. Discussions live only in the agent channel and never enter comments, drafts, Finish or Publish. Convert turns a thread into a normal comment: Summarize asks the agent for a hidden `summary: true` reply that fills the textarea, and Save deletes the thread before adding the comment.
- **Agent discovery**: each running review advertises its root, PID, URL and token in `LRV_SERVER_DIR` (default: runtime/cache dir under `lrv/servers`), keyed by an FNV64 hash of the root. Files are 0600 and removed on shutdown, including Ctrl-C and SIGTERM, only if this process still owns them.
- **Port**: derived from CWD hash (32768–40959); falls back to ephemeral if taken.
- **Comment drafts**: IndexedDB, keyed by `working_directory + git_branch + jj_change_id` (stable across amends), with note dispositions alongside. On reload a banner asks before restoring, and IndexedDB writes pause until it's answered so the saved draft survives.
- **Comment persistence**: every change is mirrored to SQLite (`store.rs`, one session per run) via `POST /api/comments/sync`. Finish freezes the session. Read back with `--list-reviews` / `--recover`.
- **jj**: `diff.rs` parses `Change ID:` from `jj show --git` for stable draft keys. For a series, files are fetched at the parent of the bottom commit and each commit's hunks applied forward, so the revset need not end at `@`.
- **Added-file dimming**: `file-added-view` / `stacked-file-added` dim only entirely new files, using `color-mix()` so it works with any theme.
- **GitHub PRs**: detection asks `gh` for the open PRs of every commit; a commit in several PRs belongs to the lowest number, and PR-level notes go on the PR's last commit. The commit strip groups contiguous commits under PR headers.
- **Phabricator publishing**: `check_diff_matches` compares Git blob ids from the local `index` lines with blobs hashed from `differential.querydiffs` hunks, so base commit and diff algorithm don't matter. `differential.createcomment` with `attach_inlines` attaches *every* pending draft, so `PublishProgress` tracks how far a publish got and a retry resumes without duplicating drafts. Conduit quirks: `isNewFile` must be `1`/`0`, and `lineLength` counts lines *after* the first.
- **Phabricator review status**: `my_review` (`waiting`/`done`/`none`), `via_group` and pending reviewer counts come from the reviewers attachment and a viewer `responsiblePHIDs` search; project names and membership are not fetched. The series strip marks reviews waiting on you with an eye icon and shows each revision's status on the meta line; the summary line's link jumps to the next waiting one.
- **Note actions**: Accept/Ignore/Reply (Discuss while an agent is attached; only Reply on host notes of revisions you don't own). Accept and Ignore are persisted dispositions; Finish turns accepted notes into empty-body `in_reply_to` entries.
- **Commit messages**: the sidebar's Commit message row opens a commentable message per commit; overall feedback goes in the Finish dialog.
- **Collapsed sidebar**: hides everything except the collapse button, which reopens it.

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
Optional: `origin` (`"agent"` by default, omitted when default; `"host"` for human notes imported from GitHub or Phabricator), `id`, `author`, `date`, `source_url`, `commit_idx`, `read_only` (note is shown without Accept/Ignore/Reply-or-Discuss), `discussion_id`, `summary` (boolean, valid only with `discussion_id`; hidden summary for Convert). A note with `discussion_id` is an agent reply accepted only by a running review (`--add-notes` / POST /api/review-notes): it must name a root discussion, is moved to its location, becomes read-only, gets a server-stamped `date` and (if no `id`) a unique id, and renders inside the thread.
A running review rejects the whole batch (400, one reason per note) when a non-`(commit)` note names a file outside its commit's diff or lacks `commit_idx` in a multi-commit series (`note_location_error`), since such notes can't be placed. Any line of a file in the diff is accepted; both views can expand unchanged context.
Notes without `id` get one derived from their content (`assign_note_ids`), so ids alone decide which notes are the same, on the server and in the browser.
Commit-message-level: `file: "(commit)"`, `line: 1`, `side: "new"`.
Pull-request-level comments (`--github-pr` fills them from the PR conversation and review summaries) are read-only `file: "(commit)"` notes like Phabricator's general comments (`ReviewNote::overall`), placed on the last commit of a series. Notes without `commit_idx` in a one-commit series are pinned to commit 0 (`tag_single_commit_notes`).
